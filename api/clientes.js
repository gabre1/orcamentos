import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // Envolvemos toda a lógica em um try...catch para garantir que qualquer erro
  // retorne uma mensagem JSON, evitando o erro "Unexpected token 'A'".
  try {
    // Rota para SALVAR um novo cliente
    if (request.method === "POST") {
      const { nome, email, telefone, cnpj_cpf } = request.body;
      if (!nome) {
        return response.status(400).json({ error: 'O campo Nome é obrigatório.' });
      }

      // LÓGICA PARA GERAR O CÓDIGO DO CLIENTE
      const { rows: maxCodeRows } = await sql`SELECT MAX(codigo_cliente) as max_code FROM Clientes;`;
      const novoCodigo = (maxCodeRows[0].max_code || 0) + 1;

      await sql`
        INSERT INTO Clientes (Nome, Email, Telefone, cnpj_cpf, codigo_cliente) 
        VALUES (${nome}, ${email}, ${telefone}, ${cnpj_cpf}, ${novoCodigo});
      `;
      
      return response.status(200).json({ message: 'Cliente salvo com sucesso!' });
    } 
    // Rota para BUSCAR todos os clientes
    else if (request.method === "GET") {
      const { rows } = await sql`SELECT * FROM Clientes ORDER BY codigo_cliente;`;
      return response.status(200).json(rows);
    } 
    // Se o método não for GET ou POST
    else {
      response.setHeader('Allow', ['GET', 'POST']);
      return response.status(405).end(`Método ${request.method} não permitido`);
    }
  } catch (error) {
    // Este bloco agora captura QUALQUER erro que acontecer no servidor.
    console.error('Erro crítico no backend:', error);
    
    // Verifica se o erro é de conexão com o banco de dados
    if (error.message.includes("POSTGRES_")) {
      return response.status(500).json({ error: 'Erro de configuração: O banco de dados não parece estar conectado corretamente. Verifique as Variáveis de Ambiente no painel da Vercel.' });
    }
    
    return response.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
  }
}
// forçando building
