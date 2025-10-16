// Arquivo: /api/clientes.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

// Função para validar o formato do e-mail
const isEmailValid = (email) => {
  if (!email) return true; // Permite e-mail vazio
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default async function handler(req, res) {
  // Rota para BUSCAR todos os clientes
  if (req.method === 'GET') {
    // ... (nenhuma alteração aqui)
    try {
      const { rows } = await dbPool.query('SELECT id, nome, codigo_cliente, cnpj_cpf, email, telefone FROM clientes ORDER BY nome ASC');
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  // Rota para CRIAR um novo cliente
  if (req.method === 'POST') {
    try {
      const { nome, email, telefone, cnpj_cpf } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      }
      
      // Validação de e-mail no backend
      if (!isEmailValid(email)) {
        return res.status(400).json({ error: 'O formato do e-mail é inválido.' });
      }

      const { rows } = await dbPool.query(
        'INSERT INTO clientes (nome, email, telefone, cnpj_cpf) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome, email, telefone, cnpj_cpf]
      );
      
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
