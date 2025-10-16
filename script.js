// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];
let itensOrcamento = [];
let contadorItemId = 0;

// --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO ---

function formatarTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 0) {
        value = `(${value}`;
    }
    input.value = value;
}

function formatarCnpjCpf(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length <= 11) {
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
        valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    input.value = valor;
}

const isEmailValid = (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Converte um valor formatado (ex: "1.234,56") para um número (ex: 1234.56)
function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}

// Formata um número para o padrão monetário brasileiro (ex: "R$ 1.234,56")
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


// --- FUNÇÕES PRINCIPAIS DA APLICAÇÃO ---

// ... (showApp, showLogin, checkLoginStatus - sem alterações) ...
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
    try {
        const response = await fetch('/api/session-check');
        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn) {
                showApp();
            } else {
                showLogin();
            }
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

async function carregarClientes() {
    // ... (sem alterações) ...
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
    // ... (sem alterações) ...
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
    const clienteEmail = document.getElementById('clienteEmail').value.trim();

    // Validação de Nome e E-mail
    if (!clienteNome) {
        alert('O nome do cliente é obrigatório.');
        return;
    }
    if (!isEmailValid(clienteEmail)) {
        alert('O formato do e-mail é inválido. Por favor, corrija.');
        return;
    }

    const clienteData = {
        nome: clienteNome,
        cnpj_cpf: document.getElementById('clienteCnpjCpf').value.trim(),
        email: clienteEmail,
        telefone: document.getElementById('clienteTelefone').value.trim(),
    };

    try {
        // ... (resto da função sem alterações) ...
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clienteData),
        });
        if (response.ok) {
            alert(`Cliente "${clienteNome}" salvo com sucesso!`);
            document.getElementById('clienteExistente').value = "";
            selecionarCliente();
            carregarClientes();
        } else {
            const errorData = await response.json();
            alert(`Erro ao salvar cliente: ${errorData.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('Erro de conexão ao salvar cliente:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// --- NOVAS FUNÇÕES: ORÇAMENTO ---

function renderizarTabelaItens() {
    const container = document.getElementById('itensContainer');
    if (itensOrcamento.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>Nenhum item adicionado</h3><p>Adicione itens ao orçamento.</p></div>`;
    } else {
        const tabelaHTML = `
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Qtd</th>
                        <th>Valor Unit.</th>
                        <th>Total</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${itensOrcamento.map(item => `
                        <tr>
                            <td>${item.descricao}</td>
                            <td>${item.quantidade}</td>
                            <td>${formatarMoeda(item.valorUnitario)}</td>
                            <td>${formatarMoeda(item.valorTotal)}</td>
                            <td><button class="btn btn-danger btn-remover-item" data-id="${item.id}">🗑️</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tabelaHTML;
    }
}

function adicionarItem() {
    const descricao = document.getElementById('itemDescricao').value.trim();
    const quantidade = parseInt(document.getElementById('itemQuantidade').value);
    const valorUnitario = parseCurrency(document.getElementById('itemValorUnitario').value);

    if (!descricao || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
        alert('Por favor, preencha todos os campos do item com valores válidos.');
        return;
    }

    const novoItem = {
        id: ++contadorItemId,
        descricao,
        quantidade,
        valorUnitario,
        valorTotal: quantidade * valorUnitario
    };

    itensOrcamento.push(novoItem);
    renderizarTabelaItens();

    // Limpa os campos após adicionar
    document.getElementById('itemDescricao').value = '';
    document.getElementById('itemQuantidade').value = '1';
    document.getElementById('itemValorUnitario').value = '';
}

function removerItem(itemId) {
    itensOrcamento = itensOrcamento.filter(item => item.id !== itemId);
    renderizarTabelaItens();
}


// --- INICIALIZAÇÃO E EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN (sem alterações) ---
    const loginForm = document.getElementById('login-form');
    // ... (código de login) ...
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
    
    const btnSalvar = document.getElementById('btnSalvarCliente');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarCliente);
    }

    const inputCnpjCpf = document.getElementById('clienteCnpjCpf');
    if (inputCnpjCpf) {
        inputCnpjCpf.addEventListener('input', (e) => formatarCnpjCpf(e.target));
    }
    
    const inputTelefone = document.getElementById('clienteTelefone');
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => formatarTelefone(e.target));
    }

    // CONECTANDO O BOTÃO ADICIONAR ITEM E A TABELA
    const btnAdicionarItem = document.getElementById('btnAdicionarItem');
    if (btnAdicionarItem) {
        btnAdicionarItem.addEventListener('click', adicionarItem);
    }

    const itensContainer = document.getElementById('itensContainer');
    if (itensContainer) {
        // Usamos delegação de eventos para capturar cliques nos botões de remover
        itensContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-remover-item')) {
                const itemId = parseInt(e.target.dataset.id, 10);
                removerItem(itemId);
            }
        });
    }

    // Inicia a verificação da sessão
    checkLoginStatus();
});
