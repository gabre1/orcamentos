// 1. Importe 'createPool' em vez de 'sql' para criar uma conexão customizada
import { createPool } from '@vercel/postgres';

// 2. Crie um "pool" de conexão usando a variável de ambiente correta
// O Node.js acessa as variáveis de ambiente da Vercel através de 'process.env'
const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
 
  const { username, password } = req.body;
 
  try {
    // 3. Use o pool para fazer a query de forma segura (com parâmetros)
    // Isso protege contra SQL Injection.
    const { rows } = await dbPool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
 
    if (rows.length > 0) {
      // 4. Mantenha a lógica do cookie que já havíamos corrigido
      res.setHeader('Set-Cookie', 'app_session=valid; HttpOnly; Path=/; Max-Age=3600');
 
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
