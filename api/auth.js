import { sql } from '@vercel/postgres';
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
 
  const { username, password } = req.body;
 
  try {
    const { rows } = await sql`
      SELECT * FROM users WHERE username = ${username} AND password = ${password};
    `;
 
    if (rows.length > 0) {
      // CORREÇÃO APLICADA AQUI
      // 1. Cria o cookie de sessão que dura 1 hora (3600 segundos)
      res.setHeader('Set-Cookie', 'app_session=valid; HttpOnly; Path=/; Max-Age=3600');
 
      // 2. Envia a resposta de sucesso
      return res.status(200).json({ message: 'Login successful' });
    } else {
      // Usuário não encontrado ou senha incorreta
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
