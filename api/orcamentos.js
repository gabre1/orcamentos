// Arquivo: /api/orcamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  const client = await dbPool.connect();

  try {
    // Rota para BUSCAR orçamentos (histórico ou detalhes)
    if (req.method === 'GET') {
      const { cliente_id, orcamento_id } = req.query;
      if (orcamento_id) { /* ... (nenhuma alteração aqui) ... */ }
      if (cliente_id) {
        // ATUALIZAÇÃO: Incluímos o campo 'status' na busca do histórico
        const { rows } = await client.query(
          'SELECT id, codigo_orcamento, data_criacao, valor_total, status FROM orcamentos WHERE cliente_id = $1 ORDER BY data_criacao DESC',
          [cliente_id]
        );
        return res.status(200).json(rows);
      }
      return res.status(400).json({ error: 'Parâmetros insuficientes.' });
    }

    // Rota para CRIAR um novo orçamento
    if (req.method === 'POST') { /* ... (nenhuma alteração aqui) ... */ }

    // NOVA ROTA: Rota para ATUALIZAR o status de um orçamento
    if (req.method === 'PUT') {
      const { orcamento_id } = req.query;
      const { status } = req.body;

      if (!orcamento_id || !status) {
        return res.status(400).json({ error: 'ID do orçamento e novo status são obrigatórios.' });
      }

      await client.query(
        'UPDATE orcamentos SET status = $1 WHERE id = $2',
        [status, orcamento_id]
      );

      return res.status(200).json({ message: 'Status atualizado com sucesso!' });
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
