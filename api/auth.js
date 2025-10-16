// Arquivo: /api/auth.js

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  try {
    const correctUser = process.env.LOGIN_USER;
    const correctPass = process.env.LOGIN_PASS;

    if (username === correctUser && password === correctPass) {
      // Construindo a string do cookie com todos os atributos recomendados
      const cookieString = [
        'app_session=valid',
        'HttpOnly',        // Essencial para segurança
        'Max-Age=3600',    // Cookie dura 1 hora (em segundos)
        'Path=/',          // ESTA É A PARTE CRÍTICA PARA A SESSÃO PERSISTIR
        'SameSite=Strict', // Proteção contra ataques CSRF
        'Secure'           // Garante envio apenas em HTTPS (padrão Vercel)
      ].join('; ');
      
      res.setHeader('Set-Cookie', cookieString);

      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
