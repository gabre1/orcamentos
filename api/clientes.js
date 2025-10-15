import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    // Rota para SALVAR um novo cliente
    if (request.method === "POST") {
        try {
            const { nome, email, telefone, cnpj_cpf } = request.body;
            if (!nome) {
                return response.status(400).json({ error: 'Nome é obrigatório' });
            }

            // --- LÓGICA PARA GERAR O CÓDIGO DO CLIENTE ---
            // 1. Busca o maior código de cliente que já existe.
            const { rows: maxCodeRows } = await sql`SELECT MAX(codigo_cliente) as max_code FROM Clientes;`;
            
            // 2. O novo código será o maior código + 1. Se não houver nenhum, começa em 1.
            const novoCodigo = (maxCodeRows[0].max_code || 0) + 1;
            // ---------------------------------------------

            await sql`
                INSERT INTO Clientes (Nome, Email, Telefone, cnpj_cpf, codigo_cliente) 
                VALUES (${nome}, ${email}, ${telefone}, ${cnpj_cpf}, ${novoCodigo});
            `;
            
            return response.status(200).json({ message: 'Cliente salvo com sucesso!' });

        } catch (error) {
            console.error('Erro no backend ao salvar:', error);
            return response.status(500).json({ error: 'Erro ao salvar cliente.' });
        }
    } 
    // Rota para BUSCAR todos os clientes
    else {
        try {
            // Agora ordena pelo código do cliente
            const { rows } = await sql`SELECT * FROM Clientes ORDER BY codigo_cliente;`;
            return response.status(200).json(rows);
        } catch (error) {
            console.error('Erro no backend ao buscar:', error);
            return response.status(500).json({ error: 'Erro ao buscar clientes.' });
        }
    }
}
