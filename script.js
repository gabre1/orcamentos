// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];
let itensOrcamento = [];
let contadorItemId = 0;
let clienteSelecionadoId = null;

// --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO ---
function formatarTelefone(input) { let value = input.value.replace(/\D/g, ''); if (value.length > 10) { value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3'); } else if (value.length > 2) { value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3'); } else if (value.length > 0) { value = `(${value}`; } input.value = value; }
function formatarCnpjCpf(input) { let valor = input.value.replace(/\D/g, ''); if (valor.length <= 11) { valor = valor.replace(/(\d{3})(\d)/, '$1.$2'); valor = valor.replace(/(\d{3})(\d)/, '$1.$2'); valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } else { valor = valor.replace(/^(\d{2})(\d)/, '$1.$2'); valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2'); valor = valor.replace(/(\d{4})(\d)/, '$1-$2'); } input.value = valor; }
const isEmailValid = (email) => { if (!email) return true; const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return emailRegex.test(email); };
function formatarCampoMoeda(input) { let valor = input.value.replace(/\D/g, ''); if (valor === '') { input.value = ''; return; } valor = (parseInt(valor, 10) / 100).toFixed(2) + ''; valor = valor.replace('.', ','); valor = valor.replace(/(\d)(?=(\d{3})+(?!\d),)/g, '$1.'); input.value = valor; }
function parseCurrency(value) { if (!value) return 0; return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0; }
function formatarMoeda(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }


// --- FUNÇÕES PRINCIPAIS DA APLICAÇÃO ---
function showApp() { document.getElementById('login-container').classList.add('hidden'); document.getElementById('app-container').classList.remove('hidden'); document.body.style.alignItems = 'flex-start'; carregarClientes(); }
function showLogin() { document.getElementById('login-container').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); document.body.style.alignItems = 'center'; }
async function checkLoginStatus() { try { const response = await fetch('/api/session-check'); if (response.ok) { const data = await response.json(); if (data.loggedIn) { showApp(); } else { showLogin(); } } else { showLogin(); } } catch (error) { showLogin(); } }
async function carregarClientes() { const select = document.getElementById('clienteExistente'); select.innerHTML = '<option value="">-- Carregando clientes... --</option>'; try { const response = await fetch('/api/clientes'); if (!response.ok) throw new Error('Falha ao buscar os clientes.'); const clientes = await response.json(); clientesCache = clientes; select.innerHTML = '<option value="">-- Novo Cliente --</option>'; clientes.forEach(cliente => { const option = new Option(`#${cliente.id} - ${cliente.nome}`, cliente.id); select.appendChild(option); }); } catch (error) { console.error("Erro ao carregar clientes:", error); select.innerHTML = '<option value="">-- Erro ao carregar --</option>'; } }

function selecionarCliente() {
    const select = document.getElementById('clienteExistente');
    clienteSelecionadoId = select.value; // ATUALIZA O ID DO CLIENTE SELECIONADO
    const clienteSelecionado = clientesCache.find(c => c.id == clienteSelecionadoId);
    const nomeInput = document.getElementById('clienteNome'); const cnpjCpfInput = document.getElementById('clienteCnpjCpf'); const emailInput = document.getElementById('clienteEmail'); const telefoneInput = document.getElementById('clienteTelefone');
    if (clienteSelecionado) {
        nomeInput.value = clienteSelecionado.nome || ''; cnpjCpfInput.value = clienteSelecionado.cnpj_cpf || ''; emailInput.value = clienteSelecionado.email || ''; telefoneInput.value = clienteSelecionado.telefone || '';
        formatarCnpjCpf(cnpjCpfInput); formatarTelefone(telefoneInput);
    } else {
        nomeInput.value = ''; cnpjCpfInput.value = ''; emailInput.value = ''; telefoneInput.value = '';
    }
}

async function salvarCliente() { const clienteNome = document.getElementById('clienteNome').value.trim(); const clienteEmail = document.getElementById('clienteEmail').value.trim(); if (!clienteNome) { alert('O nome do cliente é obrigatório.'); return; } if (!isEmailValid(clienteEmail)) { alert('O formato do e-mail é inválido. Por favor, corrija.'); return; } const clienteData = { nome: clienteNome, cnpj_cpf: document.getElementById('clienteCnpjCpf').value.trim(), email: clienteEmail, telefone: document.getElementById('clienteTelefone').value.trim(), }; try { const response = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clienteData), }); if (response.ok) { alert(`Cliente "${clienteNome}" salvo com sucesso!`); document.getElementById('clienteExistente').value = ""; selecionarCliente(); carregarClientes(); } else { const errorData = await response.json(); alert(`Erro ao salvar cliente: ${errorData.error || 'Erro desconhecido'}`); } } catch (error) { console.error('Erro de conexão ao salvar cliente:', error); alert('Erro de conexão. Tente novamente.'); } }

// --- FUNÇÕES DE ORÇAMENTO E PDF (ATUALIZADAS) ---

function renderizarTabelaItens() { const container = document.getElementById('itensContainer'); if (itensOrcamento.length === 0) { container.innerHTML = `<div class="empty-state"><h3>Nenhum item adicionado</h3><p>Adicione itens ao orçamento.</p></div>`; } else { const tabelaHTML = ` <table class="items-table"> <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th>Ações</th></tr></thead> <tbody> ${itensOrcamento.map(item => ` <tr> <td>${item.descricao}</td> <td>${item.quantidade}</td> <td>${formatarMoeda(item.valorUnitario)}</td> <td>${formatarMoeda(item.valorTotal)}</td> <td><button class="btn btn-danger btn-remover-item" data-id="${item.id}">🗑️</button></td> </tr>`).join('')} </tbody> </table> `; container.innerHTML = tabelaHTML; } renderizarOuAtualizarTotais(); }
function renderizarOuAtualizarTotais() { const totaisContainer = document.getElementById('totaisContainer'); if (itensOrcamento.length === 0) { totaisContainer.innerHTML = ''; return; } if (!document.getElementById('total-section-id')) { totaisContainer.innerHTML = ` <div class="total-section" id="total-section-id"> <div class="form-grid" style="grid-template-columns: 2fr 1fr; gap: 10px; margin-bottom: 20px; text-align: left;"> <div class="form-group"> <label for="descontoValor" style="color: white;">Desconto</label> <input type="text" id="descontoValor" placeholder="0" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;"> </div> <div class="form-group"> <label for="descontoTipo" style="color: white;">Tipo</label> <select id="descontoTipo" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;"> <option value="dinheiro">R$</option> <option value="porcentagem">%</option> </select> </div> </div> <p style="font-size: 1rem; font-weight: 400; text-align: right;">Subtotal: <span id="subtotal-valor"></span></p> <p style="font-size: 1rem; font-weight: 400; text-align: right; margin-bottom: 10px;">Desconto: <span id="desconto-valor-display"></span></p> <h3 style="text-align: right;">Total Geral</h3> <p id="total-geral-valor" style="text-align: right;"></p> </div>`; document.getElementById('descontoValor').addEventListener('input', atualizarTotais); document.getElementById('descontoTipo').addEventListener('change', atualizarTotais); } atualizarTotais(); }
function atualizarTotais() { if (itensOrcamento.length === 0) return; const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0); const descontoValorInput = document.getElementById('descontoValor').value; const descontoTipo = document.getElementById('descontoTipo').value; let descontoCalculado = 0; if (descontoTipo === 'dinheiro') { descontoCalculado = parseCurrency(descontoValorInput); } else { const porcentagem = parseFloat(descontoValorInput) || 0; descontoCalculado = subtotal * (porcentagem / 100); } const totalGeral = subtotal - descontoCalculado; document.getElementById('subtotal-valor').textContent = formatarMoeda(subtotal); document.getElementById('desconto-valor-display').textContent = `- ${formatarMoeda(descontoCalculado)}`; document.getElementById('total-geral-valor').textContent = formatarMoeda(totalGeral); }
function adicionarItem() { const descricao = document.getElementById('itemDescricao').value.trim(); const quantidade = parseInt(document.getElementById('itemQuantidade').value); const valorUnitario = parseCurrency(document.getElementById('itemValorUnitario').value); if (!descricao || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) { alert('Por favor, preencha todos os campos do item com valores válidos.'); return; } const novoItem = { id: ++contadorItemId, descricao, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario }; itensOrcamento.push(novoItem); renderizarTabelaItens(); document.getElementById('itemDescricao').value = ''; document.getElementById('itemQuantidade').value = '1'; document.getElementById('itemValorUnitario').value = ''; }
function removerItem(itemId) { itensOrcamento = itensOrcamento.filter(item => item.id !== itemId); renderizarTabelaItens(); }

// NOVA FUNÇÃO: Gerar o PDF do Orçamento
function gerarPDF() {
    const clienteNome = document.getElementById('clienteNome').value.trim();
    if (!clienteNome || itensOrcamento.length === 0) {
        alert('Para gerar o PDF, selecione um cliente e adicione pelo menos um item ao orçamento.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // ... (Lógica de criação do PDF) ...
    // A lógica completa é um pouco longa, mas aqui está um exemplo funcional
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.text("Orçamento", pageWidth / 2, y, { align: 'center' });
    y += 20;

    doc.setFontSize(12);
    doc.text(`Cliente: ${clienteNome}`, margin, y);
    y += 10;
    
    const tableData = itensOrcamento.map(item => [
        item.descricao,
        item.quantidade,
        formatarMoeda(item.valorUnitario),
        formatarMoeda(item.valorTotal)
    ]);

    doc.autoTable({
        head: [['Descrição', 'Qtd', 'V. Unitário', 'Total']],
        body: tableData,
        startY: y,
    });

    y = doc.previousAutoTable.finalY + 10;

    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0);
    doc.text(`Subtotal: ${formatarMoeda(subtotal)}`, pageWidth - margin, y, { align: 'right' });
    y += 7;

    const totalGeralText = document.getElementById('total-geral-valor').textContent;
    doc.text(`Total Geral: ${totalGeralText}`, pageWidth - margin, y, { align: 'right' });

    doc.save(`Orcamento_${clienteNome.replace(/\s+/g, '_')}.pdf`);
}

// NOVA FUNÇÃO: Salvar o Orçamento no Banco de Dados
async function salvarOrcamento() {
    if (!clienteSelecionadoId) {
        alert('Por favor, selecione um cliente existente ou salve um novo cliente antes de salvar o orçamento.');
        return;
    }
    if (itensOrcamento.length === 0) {
        alert('Adicione pelo menos um item ao orçamento antes de salvar.');
        return;
    }

    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0);
    const descontoValorInput = document.getElementById('descontoValor').value;
    const descontoTipo = document.getElementById('descontoTipo').value;
    let descontoCalculado = 0;
    if (descontoTipo === 'dinheiro') {
        descontoCalculado = parseCurrency(descontoValorInput);
    } else {
        const porcentagem = parseFloat(descontoValorInput) || 0;
        descontoCalculado = subtotal * (porcentagem / 100);
    }
    const valorTotal = subtotal - descontoCalculado;

    const orcamentoData = {
        cliente_id: clienteSelecionadoId,
        subtotal: subtotal,
        desconto_valor: descontoCalculado,
        desconto_tipo: descontoTipo,
        valor_total: valorTotal,
        observacoes: document.getElementById('observacoes').value,
        itens: itensOrcamento
    };

    try {
        const response = await fetch('/api/orcamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orcamentoData)
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Orçamento ${result.orcamentoId} salvo com sucesso!`);
            // Opcional: Limpar os itens do orçamento após salvar
            // itensOrcamento = [];
            // renderizarTabelaItens();
        } else {
            const errorData = await response.json();
            alert(`Erro ao salvar o orçamento: ${errorData.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error("Erro de conexão ao salvar orçamento:", error);
        alert('Erro de conexão. Tente novamente.');
    }
}


// --- INICIALIZAÇÃO E EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN (sem alterações) ---
    const loginForm = document.getElementById('login-form'); const errorMessage = document.getElementById('error-message'); if (loginForm) { loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const username = document.getElementById('username').value; const password = document.getElementById('password-login').value; errorMessage.textContent = ''; try { const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); if (response.ok) { showApp(); } else { const data = await response.json(); errorMessage.textContent = data.error || 'Credenciais inválidas.'; } } catch (error) { errorMessage.textContent = 'Erro de conexão. Tente novamente.'; } }); }

    // --- CONECTANDO EVENTOS AOS ELEMENTOS ---
    const selectCliente = document.getElementById('clienteExistente'); if (selectCliente) { selectCliente.addEventListener('change', selecionarCliente); }
    const btnSalvar = document.getElementById('btnSalvarCliente'); if (btnSalvar) { btnSalvar.addEventListener('click', salvarCliente); }
    const inputCnpjCpf = document.getElementById('clienteCnpjCpf'); if (inputCnpjCpf) { inputCnpjCpf.addEventListener('input', (e) => formatarCnpjCpf(e.target)); }
    const inputTelefone = document.getElementById('clienteTelefone'); if (inputTelefone) { inputTelefone.addEventListener('input', (e) => formatarTelefone(e.target)); }
    const inputValorUnitario = document.getElementById('itemValorUnitario'); if (inputValorUnitario) { inputValorUnitario.addEventListener('input', (e) => formatarCampoMoeda(e.target)); }
    const btnAdicionarItem = document.getElementById('btnAdicionarItem'); if (btnAdicionarItem) { btnAdicionarItem.addEventListener('click', adicionarItem); }
    const itensContainer = document.getElementById('itensContainer'); if (itensContainer) { itensContainer.addEventListener('click', (e) => { if (e.target && e.target.classList.contains('btn-remover-item')) { const itemId = parseInt(e.target.dataset.id, 10); removerItem(itemId); } }); }

    // CONECTANDO OS BOTÕES DE GERAR PDF E SALVAR ORÇAMENTO
    const btnGerarPDF = document.getElementById('btnGerarPDF');
    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', gerarPDF);
    }

    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    if (btnSalvarOrcamento) {
        btnSalvarOrcamento.addEventListener('click', salvarOrcamento);
    }

    checkLoginStatus();
});
