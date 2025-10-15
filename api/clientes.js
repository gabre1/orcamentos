import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    // Se a requisição for do tipo POST, significa que queremos salvar um novo cliente
    if (request.method === "POST") {
        try {
            const { nome, email, telefone } = request.body;
            if (!nome) {
                return response.status(400).json({ error: 'Nome é obrigatório' });
            }
            await sql`INSERT INTO Clientes (Nome, Email, Telefone) VALUES (${nome}, ${email}, ${telefone});`;
            return response.status(200).json({ message: 'Cliente salvo com sucesso!' });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ error: 'Erro ao salvar cliente.' });
        }
    } 
    // Se for qualquer outro tipo (GET, por exemplo), vamos buscar a lista de clientes
    else {
        try {
            const { rows } = await sql`SELECT * FROM Clientes ORDER BY Nome;`;
            return response.status(200).json(rows);
        } catch (error) {
            console.error(error);
            return response.status(500).json({ error: 'Erro ao buscar clientes.' });
        }
    }
}
