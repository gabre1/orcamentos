// --- FUNÇÕES DA APLICAÇÃO ---

// Função para exibir a aplicação principal
function showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.body.style.alignItems = 'flex-start';
    
    // CORREÇÃO PRINCIPAL: Chamamos a função para carregar os clientes aqui!
    carregarClientes();
}

// Função para verificar o status do login quando a página carrega
function checkLoginStatus() {
    if (document.cookie.includes('app_session=valid')) {
        showApp();
    } else {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        document.body.style.alignItems = 'center';
    }
}

// NOVA FUNÇÃO: Busca os clientes na API e preenche a lista
async function carregarClientes() {
    const select = document.getElementById('clienteExistente');
    // Mostra uma mensagem de "Carregando..." enquanto busca os dados
    select.innerHTML = '<option value="">-- Carregando clientes... --</option>';

    try {
        const response = await fetch('/api/clientes');

        if (!response.ok) {
            // Se a resposta da API não for bem-sucedida (ex: erro 500)
            throw new Error('Falha ao buscar os clientes.');
        }

        const clientes = await response.json();

        // Limpa o select e adiciona a opção padrão
        select.innerHTML = '<option value="">-- Novo Cliente --</option>';

        // Preenche o select com os clientes retornados pela API
        clientes.forEach(cliente => {
            const option = new Option(`${cliente.codigo_cliente} - ${cliente.nome}`, cliente.id);
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        select.innerHTML = '<option value="">-- Erro ao carregar --</option>';
    }
}


// --- INICIALIZAÇÃO E EVENTOS ---

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

                if (response.ok) {
                    showApp(); // A chamada para carregar clientes está dentro desta função
                } else {
                    const data = await response.json();
                    errorMessage.textContent = data.error || 'Credenciais inválidas.';
                }
            } catch (error) {
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            }
        });
    }

    // O resto do seu script do gerador de orçamentos (funções para adicionar itens, etc.)
    // pode vir aqui.

    // Verifica o status do login assim que a página é carregada
    checkLoginStatus();
});
