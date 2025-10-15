export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  try {
    const correctUser = process.env.LOGIN_USER;
    const correctPass = process.env.LOGIN_PASS;

    // Depuração para ver os valores que estão sendo comparados
    console.log(`Comparando: '${username}' vs '${correctUser}' E '${password}' vs '${correctPass}'`);

    if (username === correctUser && password === correctPass) {
      
      // --- INÍCIO DA CORREÇÃO ---
      console.log("SUCESSO: Credenciais corretas. Tentando criar o cookie...");

      // 1. Criamos a string do cookie da forma mais simples possível.
      const cookieString = 'app_session=valid';

      // 2. Adicionamos um log para garantir que a string não está vazia.
      console.log("Cookie string a ser enviada:", cookieString);

      // 3. Enviamos o cabeçalho com a string simplificada.
      res.setHeader('Set-Cookie', cookieString);
      
      console.log("Cabeçalho Set-Cookie foi configurado.");
      // --- FIM DA CORREÇÃO ---

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
