// Arquivo: /api/clientes.js

import { createPool } from '@vercel/postgres';

// Crie a conexão usando a variável de ambiente correta
const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  // Apenas requisições GET são permitidas para buscar dados
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log("Tentando buscar a lista de clientes do banco de dados...");

    // Execute a consulta SQL para buscar os clientes.
    // ATENÇÃO: Verifique se o nome da sua tabela é "clientes" e as colunas são "id", "nome", etc.
    const { rows } = await dbPool.query('SELECT id, nome, codigo_cliente FROM clientes ORDER BY nome ASC');

    console.log(`Sucesso! ${rows.length} clientes encontrados.`);

    // Envie a lista de clientes de volta para o frontend como JSON
    return res.status(200).json(rows);

  } catch (error) {
    // Se ocorrer um erro, registre no log e envie uma resposta de erro 500
    console.error('Erro ao buscar clientes no banco de dados:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
