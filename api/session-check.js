export default function handler(req, res) {
  // Apenas requisições GET são permitidas
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // O navegador envia o cookie HttpOnly nos cabeçalhos da requisição.
  // Nós lemos os cabeçalhos aqui no servidor.
  const cookie = req.headers.cookie || '';

  // Verificamos se a string do cookie contém nossa sessão
  if (cookie.includes('app_session=valid')) {
    // Se sim, a sessão é válida.
    return res.status(200).json({ loggedIn: true });
  } else {
    // Se não, a sessão é inválida.
    return res.status(200).json({ loggedIn: false });
  }
}
