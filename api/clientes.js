// Importa a função para criar uma conexão configurável
import { createPool } from '@vercel/postgres';

// Cria uma nova instância de conexão que LÊ a variável de ambiente correta
const pool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(request, response) {
  try {
    if (request.method === "POST") {
      const { nome, email, telefone, cnpj_cpf } = request.body;
      if (!nome) {
        return response.status(400).json({ error: 'O campo Nome é obrigatório.' });
      }

      // Usa a nova instância 'pool' para fazer a query
      const { rows: maxCodeRows } = await pool.sql`SELECT MAX(codigo_cliente) as max_code FROM Clientes;`;
      const novoCodigo = (maxCodeRows[0]?.max_code || 0) + 1;

      // Usa a nova instância 'pool' para fazer a query
      await pool.sql`
        INSERT INTO Clientes (Nome, Email, Telefone, cnpj_cpf, codigo_cliente) 
        VALUES (${nome}, ${email}, ${telefone}, ${cnpj_cpf}, ${novoCodigo});
      `;
      
      return response.status(200).json({ message: 'Cliente salvo com sucesso!' });

    } else if (request.method === "GET") {
      // Usa a nova instância 'pool' para fazer a query
      const { rows } = await pool.sql`SELECT * FROM Clientes ORDER BY codigo_cliente;`;
      return response.status(200).json(rows);
    } else {
      response.setHeader('Allow', ['GET', 'POST']);
      return response.status(405).end(`Método ${request.method} não permitido`);
    }
  } catch (error) {
    console.error('Erro crítico no backend:', error);
    return response.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.', details: error.message });
  }
}
