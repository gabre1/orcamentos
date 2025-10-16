// Arquivo: /api/orcamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

// Função de tratamento de erros centralizada
function handleError(res, error, context) {
  console.error(`Erro em ${context}:`, error);
  res.status(500).json({ error: 'Internal Server Error', details: error.message });
}

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    // --- Rota para BUSCAR orçamentos (histórico ou detalhes) ---
    case 'GET':
      try {
        const { cliente_id, orcamento_id } = req.query;
        if (orcamento_id) {
          const { rows: orcamentoRows } = await dbPool.query('SELECT * FROM orcamentos WHERE id = $1', [orcamento_id]);
          if (orcamentoRows.length === 0) return res.status(404).json({ error: 'Orçamento não encontrado.' });
          const { rows: itensRows } = await dbPool.query('SELECT * FROM orcamento_itens WHERE orcamento_id = $1', [orcamento_id]);
          const orcamentoCompleto = { ...orcamentoRows[0], itens: itensRows };
          return res.status(200).json(orcamentoCompleto);
        }
        if (cliente_id) {
          const { rows } = await dbPool.query('SELECT id, codigo_orcamento, data_criacao, valor_total, status FROM orcamentos WHERE cliente_id = $1 ORDER BY data_criacao DESC', [cliente_id]);
          return res.status(200).json(rows);
        }
        return res.status(400).json({ error: 'Parâmetros insuficientes.' });
      } catch (error) {
        return handleError(res, error, 'GET /api/orcamentos');
      }

    // --- Rota para CRIAR um novo orçamento ---
    case 'POST':
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        const { cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;
        if (!cliente_id || !itens || itens.length === 0) { return res.status(400).json({ error: 'Dados insuficientes.' }); }
        const orcamentoResult = await client.query(`INSERT INTO orcamentos (cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes]);
        const orcamentoId = orcamentoResult.rows[0].id;
        const codigoOrcamento = `ORC-${String(orcamentoId).padStart(4, '0')}`;
        await client.query('UPDATE orcamentos SET codigo_orcamento = $1 WHERE id = $2', [codigoOrcamento, orcamentoId]);
        for (const item of itens) { await client.query(`INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, [orcamentoId, item.descricao, item.quantidade, item.valorUnitario]); }
        await client.query('COMMIT');
        return res.status(201).json({ message: 'Orçamento salvo com sucesso!', codigoOrcamento: codigoOrcamento });
      } catch (error) {
        await client.query('ROLLBACK');
        return handleError(res, error, 'POST /api/orcamentos');
      } finally {
        client.release();
      }

    // --- Rota para ATUALIZAR o status de um orçamento ---
    case 'PUT':
      try {
        const { orcamento_id } = req.query;
        const { status } = req.body;
        if (!orcamento_id || !status) { return res.status(400).json({ error: 'ID do orçamento e novo status são obrigatórios.' }); }
        await dbPool.query('UPDATE orcamentos SET status = $1 WHERE id = $2', [status, orcamento_id]);
        return res.status(200).json({ message: 'Status atualizado com sucesso!' });
      } catch (error) {
        return handleError(res, error, 'PUT /api/orcamentos');
      }

    // --- Método não permitido ---
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
