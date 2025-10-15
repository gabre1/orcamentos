import { createPool } from '@vercel/postgres';

// Cria a conexão com o banco de dados lendo a variável de ambiente correta
const pool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

export default async function handler(request, response) {
  try {
    // Rota para SALVAR um novo cliente
    if (request.method === "POST") {
      const { nome, email, telefone, cnpj_cpf } = request.body;
      if (!nome) {
        return response.status(400).json({ error: 'O campo Nome é obrigatório.' });
      }

      const { rows: maxCodeRows } = await pool.sql`SELECT MAX(codigo_cliente) as max_code FROM Clientes;`;
      const novoCodigo = (maxCodeRows[0]?.max_code || 0) + 1;

      await pool.sql`
        INSERT INTO Clientes (Nome, Email, Telefone, cnpj_cpf, codigo_cliente) 
        VALUES (${nome}, ${email}, ${telefone}, ${cnpj_cpf}, ${novoCodigo});
      `;
      
      return response.status(200).json({ message: 'Cliente salvo com sucesso!' });

    } 
    // Rota para BUSCAR todos os clientes
    else if (request.method === "GET") {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');

      const { rows } = await pool.sql`SELECT * FROM Clientes ORDER BY codigo_cliente;`;
      return response.status(200).json(rows);
    } 
    else {
      response.setHeader('Allow', ['GET', 'POST']);
      return response.status(405).end(`Método ${request.method} não permitido`);
    }
  } catch (error) {
    console.error('Erro crítico no backend (clientes):', error);
    return response.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.', details: error.message });
  }
}
