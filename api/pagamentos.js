// Arquivo: /api/pagamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'POST') {
    try {
      const { orcamento_id, valor_pago, metodo_pagamento, observacoes } = req.body;
      if (!orcamento_id || !valor_pago) {
        return res.status(400).json({ error: 'Dados do pagamento insuficientes.' });
      }
      await dbPool.query(
        'INSERT INTO pagamentos (orcamento_id, valor_pago, metodo_pagamento, observacoes) VALUES ($1, $2, $3, $4)',
        [orcamento_id, valor_pago, metodo_pagamento, observacoes]
      );
      return res.status(201).json({ message: 'Pagamento registrado com sucesso!' });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
