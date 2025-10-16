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
    // --- CORREÇÃO APLICADA AQUI ---
    // Adicionamos as colunas que estavam faltando: cnpj_cpf, email, telefone
    const { rows } = await dbPool.query(
      'SELECT id, nome, codigo_cliente, cnpj_cpf, email, telefone FROM clientes ORDER BY nome ASC'
    );
    
    return res.status(200).json(rows);

  } catch (error) {
    console.error('Erro ao buscar clientes no banco de dados:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
