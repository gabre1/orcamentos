// Arquivo: /api/orcamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  const client = await dbPool.connect();

  try {
    // --- Rota para BUSCAR orçamentos (ATUALIZADA) ---
    if (req.method === 'GET') {
      const { cliente_id, orcamento_id } = req.query;

      // Se um orcamento_id for fornecido, busca os detalhes completos desse orçamento
      if (orcamento_id) {
        const orcamentoResult = await client.query('SELECT * FROM orcamentos WHERE id = $1', [orcamento_id]);
        if (orcamentoResult.rows.length === 0) {
          return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        const itensResult = await client.query('SELECT * FROM orcamento_itens WHERE orcamento_id = $1', [orcamento_id]);
        
        const orcamentoCompleto = {
          ...orcamentoResult.rows[0],
          itens: itensResult.rows
        };
        return res.status(200).json(orcamentoCompleto);
      }
      
      // Se apenas um cliente_id for fornecido, busca o histórico
      if (cliente_id) {
        const { rows } = await client.query(
          'SELECT id, codigo_orcamento, data_criacao, valor_total FROM orcamentos WHERE cliente_id = $1 ORDER BY data_criacao DESC',
          [cliente_id]
        );
        return res.status(200).json(rows);
      }

      return res.status(400).json({ error: 'Parâmetros insuficientes.' });
    }

    // --- Rota para CRIAR um novo orçamento (sem alterações) ---
    if (req.method === 'POST') {
      await client.query('BEGIN');
      const { cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;
      if (!cliente_id || !itens || itens.length === 0) { return res.status(400).json({ error: 'Dados insuficientes.' }); }
      const orcamentoResult = await client.query( `INSERT INTO orcamentos (cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes] );
      const orcamentoId = orcamentoResult.rows[0].id;
      const codigoOrcamento = `ORC-${String(orcamentoId).padStart(4, '0')}`;
      await client.query( 'UPDATE orcamentos SET codigo_orcamento = $1 WHERE id = $2', [codigoOrcamento, orcamentoId] );
      for (const item of itens) { await client.query( `INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, [orcamentoId, item.descricao, item.quantidade, item.valorUnitario] ); }
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
