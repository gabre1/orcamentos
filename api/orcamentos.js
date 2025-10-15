import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(request, response) {
  try {
    if (request.method === "POST") {
        const { cliente_id, valor_total, itens } = request.body;
        if (!cliente_id || !valor_total || !itens || itens.length === 0) {
            return response.status(400).json({ error: 'Dados do orçamento incompletos.' });
        }

        const { rows: maxCodeRows } = await pool.sql`SELECT MAX(codigo_orcamento) as max_code FROM orcamentos;`;
        const novoCodigo = (maxCodeRows[0]?.max_code || 0) + 1;

        const result = await pool.sql`
            INSERT INTO orcamentos (codigo_orcamento, cliente_id, valor_total) 
            VALUES (${novoCodigo}, ${cliente_id}, ${valor_total}) RETURNING id;
        `;
        const orcamentoId = result.rows[0].id;

        for (const item of itens) {
            await pool.sql`
                INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario)
                VALUES (${orcamentoId}, ${item.descricao}, ${item.quantidade}, ${item.valorUnitario});
            `;
        }

        return response.status(200).json({ message: 'Orçamento salvo com sucesso!', codigo_orcamento: novoCodigo });
    }
    else if (request.method === "GET") {
        const { cliente_id } = request.query;
        if (!cliente_id) {
            return response.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }
        
        const { rows } = await pool.sql`
            SELECT id, codigo_orcamento, data_criacao, valor_total, status 
            FROM orcamentos 
            WHERE cliente_id = ${cliente_id}
            ORDER BY codigo_orcamento DESC;
        `;
        return response.status(200).json(rows);
    }
  } catch (error) {
    console.error('Erro na API de orçamentos:', error);
    return response.status(500).json({ error: 'Erro no servidor.', details: error.message });
  }
}
