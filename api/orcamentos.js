// Arquivo: /api/orcamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const client = await dbPool.connect();

  try {
    const { cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;

    // Validação básica
    if (!cliente_id || !itens || itens.length === 0) {
      return res.status(400).json({ error: 'Dados insuficientes para salvar o orçamento.' });
    }

    // Inicia uma transação para garantir que tudo seja salvo ou nada seja salvo
    await client.query('BEGIN');

    // 1. Insere o orçamento principal e obtém o ID gerado
    const orcamentoResult = await client.query(
      `INSERT INTO orcamentos (cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes]
    );
    const orcamentoId = orcamentoResult.rows[0].id;

    // 2. Insere cada item do orçamento, um por um, associado ao ID do orçamento
    for (const item of itens) {
      await client.query(
        `INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) 
         VALUES ($1, $2, $3, $4)`,
        [orcamentoId, item.descricao, item.quantidade, item.valorUnitario]
      );
    }

    // Se tudo deu certo, confirma a transação
    await client.query('COMMIT');

    return res.status(201).json({ message: 'Orçamento salvo com sucesso!', orcamentoId: orcamentoId });

  } catch (error) {
    // Se algo deu errado, desfaz todas as operações da transação
    await client.query('ROLLBACK');
    console.error('Erro ao salvar orçamento:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  } finally {
    // Libera a conexão com o banco de dados
    client.release();
  }
}
