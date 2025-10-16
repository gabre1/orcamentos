// Arquivo: /api/clientes.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ATENÇÃO: Confirme se o nome da sua tabela é "clientes" e se as colunas existem.
    const { rows } = await dbPool.query('SELECT id, nome, codigo_cliente FROM clientes ORDER BY nome ASC');
    return res.status(200).json(rows);

  } catch (error) {
    console.error('Erro ao buscar clientes no banco de dados:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
