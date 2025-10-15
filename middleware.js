import { NextResponse } from 'next/server';

export function middleware(request) {
  // Pega o cookie de sessão do navegador do usuário
  const sessionCookie = request.cookies.get('app_session');
  const url = request.nextUrl.clone();

  // Se o usuário está tentando acessar a página principal ("/") sem o cookie...
  if (!sessionCookie && url.pathname === '/') {
    // ...redireciona ele para a página de login.
    url.pathname = '/login.html';
    return NextResponse.redirect(url);
  }

  // Se o usuário está logado e tenta acessar a página de login...
  if (sessionCookie && url.pathname === '/login.html') {
    // ...redireciona ele para a página principal.
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Define quais rotas o "porteiro" deve proteger
export const config = {
  matcher: ['/', '/login.html'],
};
