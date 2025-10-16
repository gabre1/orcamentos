// --- VARIÁVEIS GLOBAIS ---
// Vamos usar esta variável para guardar os dados dos clientes e acessá-los depois
let clientesCache = [];


// --- FUNÇÕES DA APLICAÇÃO ---

function showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.body.style.alignItems = 'flex-start';
    carregarClientes();
}

function checkLoginStatus() {
    // --- ALTERAÇÃO AQUI: Adicionando logs de depuração ---
    // Esta linha irá imprimir no console do navegador todos os cookies que ele conhece.
    // Isso nos ajudará a ver se o cookie de sessão está realmente ausente ou mal formatado.
    console.log("Verificando status do login. Cookies atuais:", document.cookie);

    if (document.cookie.includes('app_session=valid')) {
        console.log("Cookie de sessão encontrado. Mostrando a aplicação.");
        showApp();
    } else {
        console.log("Cookie de sessão não encontrado. Mostrando tela de login.");
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        document.body.style.alignItems = 'center';
    }
}

async function carregarClientes() {
    const select = document.getElementById('clienteExistente');
    select.innerHTML = '<option value="">-- Carregando clientes... --</option>';

    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) {
            throw new Error('Falha ao buscar os clientes.');
        }
        const clientes = await response.json();

        // Guardamos os dados dos clientes na variável global para uso futuro
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

// Esta função é chamada sempre que um cliente é selecionado no dropdown
function selecionarCliente() {
    const select = document.getElementById('clienteExistente');
    const clienteId = select.value; // Pega o ID do cliente selecionado (ex: "3")

    // Procura no nosso cache o objeto completo do cliente com base no ID
    const clienteSelecionado = clientesCache.find(c => c.id == clienteId);

    if (clienteSelecionado) {
        // Se um cliente foi encontrado, preenche os campos do formulário
        document.getElementById('clienteNome').value = clienteSelecionado.nome || '';
        document.getElementById('clienteCnpjCpf').value = clienteSelecionado.cnpj_cpf || '';
        document.getElementById('clienteEmail').value = clienteSelecionado.email || '';
        document.getElementById('clienteTelefone').value = clienteSelecionado.telefone || '';
    } else {
        // Se o usuário selecionou "-- Novo Cliente --", limpa os campos
        document.getElementById('clienteNome').value = '';
        document.getElementById('clienteCnpjCpf').value = '';
        document.getElementById('clienteEmail').value = '';
        document.getElementById('clienteTelefone').value = '';
    }
}


// --- INICIALIZAÇÃO E EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN (sem alterações) ---
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
                    // Espera um instante para dar tempo do navegador processar e salvar o cookie
                    setTimeout(() => {
                        showApp();
                    }, 100);
                } else {
                    const data = await response.json();
                    errorMessage.textContent = data.error || 'Credenciais inválidas.';
                }
            } catch (error) {
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            }
        });
    }

    // --- ADICIONANDO O "ESCUTADOR DE EVENTOS" ---
    const selectCliente = document.getElementById('clienteExistente');
    if (selectCliente) {
        // Diz ao JavaScript para executar a função 'selecionarCliente' toda vez que o valor do dropdown mudar
        selectCliente.addEventListener('change', selecionarCliente);
    }
    
    // O resto do seu script do gerador de orçamentos (funções para adicionar itens, etc.)
    // pode vir aqui.

    // Verifica o status do login assim que a página é carregada
    checkLoginStatus();
});
