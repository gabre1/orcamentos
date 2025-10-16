// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];

// --- FUNÇÕES DE FORMATAÇÃO AUTOMÁTICA ---

// Formata o campo de telefone enquanto o usuário digita
function formatarTelefone(input) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 0) {
        value = `(${value}`;
    }
    input.value = value;
}

// Formata o campo de CPF/CNPJ enquanto o usuário digita
function formatarCnpjCpf(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length <= 11) { // Formata como CPF
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else { // Formata como CNPJ
        valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
        valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    input.value = valor;
}

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

    const nomeInput = document.getElementById('clienteNome');
    const cnpjCpfInput = document.getElementById('clienteCnpjCpf');
    const emailInput = document.getElementById('clienteEmail');
    const telefoneInput = document.getElementById('clienteTelefone');

    if (clienteSelecionado) {
        nomeInput.value = clienteSelecionado.nome || '';
        cnpjCpfInput.value = clienteSelecionado.cnpj_cpf || '';
        emailInput.value = clienteSelecionado.email || '';
        telefoneInput.value = clienteSelecionado.telefone || '';
        
        // Formatamos os campos que foram preenchidos
        formatarCnpjCpf(cnpjCpfInput);
        formatarTelefone(telefoneInput);
    } else {
        nomeInput.value = '';
        cnpjCpfInput.value = '';
        emailInput.value = '';
        telefoneInput.value = '';
    }
}

async function salvarCliente() {
    const clienteNome = document.getElementById('clienteNome').value.trim();
    if (!clienteNome) {
        alert('O nome do cliente é obrigatório.');
        return;
    }

    const clienteData = {
        nome: clienteNome,
        cnpj_cpf: document.getElementById('clienteCnpjCpf').value.trim(),
        email: document.getElementById('clienteEmail').value.trim(),
        telefone: document.getElementById('clienteTelefone').value.trim(),
    };

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clienteData),
        });

        if (response.ok) {
            alert(`Cliente "${clienteNome}" salvo com sucesso!`);
            // Limpa o formulário e recarrega a lista de clientes para incluir o novo
            document.getElementById('clienteExistente').value = ""; // Reseta o dropdown
            selecionarCliente(); // Limpa os campos de input
            carregarClientes();   // Recarrega a lista de clientes do banco
        } else {
            const errorData = await response.json();
            alert(`Erro ao salvar cliente: ${errorData.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('Erro de conexão ao salvar cliente:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// --- INICIALIZAÇÃO E EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN ---
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

    // --- CONECTANDO EVENTOS AOS ELEMENTOS ---
    const selectCliente = document.getElementById('clienteExistente');
    if (selectCliente) {
        selectCliente.addEventListener('change', selecionarCliente);
    }
    
    // CONECTANDO O BOTÃO SALVAR CLIENTE À SUA FUNÇÃO
    const btnSalvar = document.getElementById('btnSalvarCliente');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarCliente);
    }

    // CONECTANDO OS CAMPOS ÀS FUNÇÕES DE FORMATAÇÃO
    const inputCnpjCpf = document.getElementById('clienteCnpjCpf');
    if (inputCnpjCpf) {
        inputCnpjCpf.addEventListener('input', (e) => formatarCnpjCpf(e.target));
    }
    
    const inputTelefone = document.getElementById('clienteTelefone');
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => formatarTelefone(e.target));
    }

    // Inicia a verificação da sessão assim que a página carrega
    checkLoginStatus();
});
