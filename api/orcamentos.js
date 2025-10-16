// Arquivo: /api/orcamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  const client = await dbPool.connect();

  try {
    // --- NOVA ROTA: Buscar histórico de orçamentos de um cliente ---
    if (req.method === 'GET') {
      const { cliente_id } = req.query;
      if (!cliente_id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
      }

      const { rows } = await client.query(
        'SELECT id, codigo_orcamento, data_criacao, valor_total FROM orcamentos WHERE cliente_id = $1 ORDER BY data_criacao DESC',
        [cliente_id]
      );
      return res.status(200).json(rows);
    }

    // --- Rota para CRIAR um novo orçamento (ATUALIZADA) ---
    if (req.method === 'POST') {
      await client.query('BEGIN');
      
      const { cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;
      if (!cliente_id || !itens || itens.length === 0) {
        return res.status(400).json({ error: 'Dados insuficientes para salvar o orçamento.' });
      }

      const orcamentoResult = await client.query(
        `INSERT INTO orcamentos (cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes]
      );
      const orcamentoId = orcamentoResult.rows[0].id;

      // Gera o código do orçamento (ex: ORC-0001) e o salva no banco
      const codigoOrcamento = `ORC-${String(orcamentoId).padStart(4, '0')}`;
      await client.query(
        'UPDATE orcamentos SET codigo_orcamento = $1 WHERE id = $2',
        [codigoOrcamento, orcamentoId]
      );

      for (const item of itens) {
        await client.query(
          `INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`,
          [orcamentoId, item.descricao, item.quantidade, item.valorUnitario]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json({ message: 'Orçamento salvo com sucesso!', codigoOrcamento: codigoOrcamento });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro na API de orçamentos:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  } finally {
    if (client) client.release();
  }
}
