import { NextResponse } from 'next/server';

export function middleware(request) {
  // Esta é uma versão simplificada que não é mais necessária com a nova lógica.
  // Deixamos o arquivo aqui para futuras regras, mas ele não fará nada por enquanto.
  return NextResponse.next();
}

// O matcher vazio garante que ele não interfira em nenhuma rota.
export const config = {
  matcher: [],
};
