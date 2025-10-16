// Arquivo: /api/clientes.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {

  // Rota para BUSCAR todos os clientes
  if (req.method === 'GET') {
    try {
      const { rows } = await dbPool.query('SELECT id, nome, codigo_cliente, cnpj_cpf, email, telefone FROM clientes ORDER BY nome ASC');
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  // NOVA ROTA: Rota para CRIAR um novo cliente
  if (req.method === 'POST') {
    try {
      const { nome, email, telefone, cnpj_cpf } = req.body;

      // Validação simples para garantir que o nome foi enviado
      if (!nome) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      }

      // Inserimos o novo cliente no banco de dados de forma segura (parametrizada)
      // O 'RETURNING *' faz com que o banco retorne o cliente que acabamos de criar
      const { rows } = await dbPool.query(
        'INSERT INTO clientes (nome, email, telefone, cnpj_cpf) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome, email, telefone, cnpj_cpf]
      );
      
      // Retornamos o novo cliente com um status 201 (Created)
      return res.status(201).json(rows[0]);

    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  // Se o método não for GET nem POST, retorna erro
  return res.status(405).json({ error: 'Method Not Allowed' });
}
