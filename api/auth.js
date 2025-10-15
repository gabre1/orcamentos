export default function handler(request, response) {
  // Esta API não precisa de conexão com o banco, então o código permanece simples.
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  const { username, password } = request.body;

  // Compara com as variáveis de ambiente que você configurou na Vercel
  if (username === process.env.LOGIN_USER && password === process.env.LOGIN_PASS) {
    // Se as credenciais estiverem corretas, cria um cookie de sessão
    response.setHeader('Set-Cookie', `app_session=valid; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`); // Valido por 1 dia
    return response.status(200).json({ message: 'Login bem-sucedido' });
  } else {
    // Se estiverem erradas, retorna um erro
    return response.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
}
