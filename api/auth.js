// Nenhum import de banco de dados é necessário, pois não vamos usá-lo aqui.

export default function handler(req, res) {
  // 1. Verificamos se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Pegamos o usuário e senha que o usuário digitou no formulário
  const { username, password } = req.body;

  try {
    // 3. Pegamos as credenciais corretas das variáveis de ambiente da Vercel
    const correctUser = process.env.LOGIN_USER;
    const correctPass = process.env.LOGIN_PASS;

    // 4. Comparamos as informações enviadas com as variáveis de ambiente
    if (username === correctUser && password === correctPass) {
      // Se as credenciais estiverem corretas, criamos o cookie de sessão
      res.setHeader('Set-Cookie', 'app_session=valid; HttpOnly; Path=/; Max-Age=3600'); // Cookie dura 1 hora

      return res.status(200).json({ message: 'Login successful' });
    } else {
      // Se as credenciais estiverem erradas, retornamos um erro
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    // Bloco de segurança para caso algo inesperado aconteça
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
