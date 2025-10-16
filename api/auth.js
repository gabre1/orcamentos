export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  try {
    const correctUser = process.env.LOGIN_USER;
    const correctPass = process.env.LOGIN_PASS;

    if (username === correctUser && password === correctPass) {
      console.log("SUCESSO: Credenciais corretas. Construindo cookie de sessão seguro...");

      // --- INÍCIO DA CORREÇÃO FINAL ---
      // Construindo a string do cookie com todos os atributos recomendados
      const cookieString = [
        'app_session=valid',
        'HttpOnly',        // Impede que o cookie seja acessado por JavaScript no frontend (essencial para segurança)
        'Max-Age=3600',    // Define a duração do cookie para 1 hora (em segundos)
        'Path=/',          // Torna o cookie acessível em todas as páginas do seu site
        'SameSite=Strict', // Aumenta a proteção contra ataques CSRF
        'Secure'           // Garante que o cookie só seja enviado em conexões HTTPS (padrão da Vercel)
      ].join('; ');
      
      console.log("Enviando cabeçalho Set-Cookie com o valor:", cookieString);

      res.setHeader('Set-Cookie', cookieString);
      // --- FIM DA CORREÇÃO FINAL ---

      return res.status(200).json({ message: 'Login successful' });
    } else {
      console.log("FALHA: Credenciais não batem.");
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
