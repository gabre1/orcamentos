// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];

// --- FUNÇÕES DA APLICAÇÃO ---

function showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.body.style.alignItems = 'flex-start';
    carregarClientes();
}

function showLogin() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.body.style.alignItems = 'center';
}

// --- FUNÇÃO checkLoginStatus() CORRIGIDA ---
async function checkLoginStatus() {
    console.log("Verificando status da sessão com a API...");
    try {
        const response = await fetch('/api/session-check');
        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn) {
                console.log("API confirmou: Sessão válida. Mostrando a aplicação.");
                showApp();
            } else {
                console.log("API confirmou: Sessão inválida. Mostrando tela de login.");
                showLogin();
            }
        } else {
            console.log("Falha na chamada da API de sessão. Mostrando tela de login.");
            showLogin();
        }
    } catch (error) {
        console.error("Erro ao verificar a sessão:", error);
        showLogin();
    }
}

async function carregarClientes() {
    const select = document.getElementById('clienteExistente');
    select.innerHTML = '<option value="">-- Carregando clientes... --</option>';
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error('Falha ao buscar os clientes.');
        const clientes = await response.json();
        clientesCache = clientes;
        select.innerHTML = '<option value="">-- Novo Cliente --</option>';
        clientes.forEach(cliente => {
            const option = new Option(`${cliente.codigo_cliente} - ${cliente.nome}`, cliente.id);
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        select.innerHTML = '<option value="">-- Erro ao carregar --</option>';
    }
}

function selecionarCliente() {
    const select = document.getElementById('clienteExistente');
    const clienteId = select.value;
    const clienteSelecionado = clientesCache.find(c => c.id == clienteId);
    if (clienteSelecionado) {
        document.getElementById('clienteNome').value = clienteSelecionado.nome || '';
        document.getElementById('clienteCnpjCpf').value = clienteSelecionado.cnpj_cpf || '';
        document.getElementById('clienteEmail').value = clienteSelecionado.email || '';
        document.getElementById('clienteTelefone').value = clienteSelecionado.telefone || '';
    } else {
        document.getElementById('clienteNome').value = '';
        document.getElementById('clienteCnpjCpf').value = '';
        document.getElementById('clienteEmail').value = '';
        document.getElementById('clienteTelefone').value = '';
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

    const selectCliente = document.getElementById('clienteExistente');
    if (selectCliente) {
        selectCliente.addEventListener('change', selecionarCliente);
    }
    
    // Inicia a verificação da sessão assim que a página carrega
    checkLoginStatus();
});
