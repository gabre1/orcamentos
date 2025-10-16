// Adicionamos uma função dedicada para mostrar a aplicação
function showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.body.style.alignItems = 'flex-start';
    // Se você tiver funções que precisam carregar dados iniciais, chame-as aqui
    // Por exemplo: carregarClientes();
}

// A função original para verificar o status quando a página carrega
function checkLoginStatus() {
    if (document.cookie.includes('app_session=valid')) {
        showApp(); // Reutilizamos a nova função
    } else {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        document.body.style.alignItems = 'center';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password-login').value;
            errorMessage.textContent = '';

            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                // --- ESTA É A CORREÇÃO PRINCIPAL ---
                if (response.ok) {
                    // Se a resposta for OK (200), chame a função para mostrar a app diretamente.
                    // Não precisamos checar o cookie aqui, pois o sucesso da requisição já é a confirmação.
                    showApp();
                } else {
                    const data = await response.json();
                    errorMessage.textContent = data.error || 'Credenciais inválidas.';
                }
            } catch (error) {
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            }
        });
    }

    // O resto do seu script de gerador de orçamentos (funções de cliente, itens, etc.)
    // viria aqui...

    // --- INICIALIZAÇÃO ---
    // Verificamos o status do login assim que a página é carregada
    checkLoginStatus();
});w
