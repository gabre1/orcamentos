// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];
let itensOrcamento = [];
let contadorItemId = 0;
let clienteSelecionadoId = null;
let pdfGerado = null;
let dadosOrcamento = null;

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
function selecionarCliente() { const select = document.getElementById('clienteExistente'); clienteSelecionadoId = select.value; const historicoSection = document.getElementById('historico-section'); const historicoContainer = document.getElementById('historico-container'); const clienteSelecionado = clientesCache.find(c => c.id == clienteSelecionadoId); const nomeInput = document.getElementById('clienteNome'); const cnpjCpfInput = document.getElementById('clienteCnpjCpf'); const emailInput = document.getElementById('clienteEmail'); const telefoneInput = document.getElementById('clienteTelefone'); if (clienteSelecionado) { nomeInput.value = clienteSelecionado.nome || ''; cnpjCpfInput.value = clienteSelecionado.cnpj_cpf || ''; emailInput.value = clienteSelecionado.email || ''; telefoneInput.value = clienteSelecionado.telefone || ''; formatarCnpjCpf(cnpjCpfInput); formatarTelefone(telefoneInput); } else { nomeInput.value = ''; cnpjCpfInput.value = ''; emailInput.value = ''; telefoneInput.value = ''; } if (clienteSelecionadoId) { historicoSection.style.display = 'block'; carregarHistoricoOrcamentos(clienteSelecionadoId); } else { historicoSection.style.display = 'none'; historicoContainer.innerHTML = ''; } }
async function salvarCliente() { /* ... (sem alterações) ... */ }

// --- FUNÇÕES DE ORÇAMENTO E HISTÓRICO (ATUALIZADAS) ---
function renderizarTabelaItens() { /* ... (sem alterações) ... */ }
function renderizarOuAtualizarTotais() { /* ... (sem alterações) ... */ }
function atualizarTotais() { /* ... (sem alterações) ... */ }
function adicionarItem() { /* ... (sem alterações) ... */ }
function removerItem(itemId) { /* ... (sem alterações) ... */ }

async function carregarHistoricoOrcamentos(clienteId) {
    const container = document.getElementById('historico-container');
    container.innerHTML = '<p>Carregando histórico...</p>';
    try {
        const response = await fetch(`/api/orcamentos?cliente_id=${clienteId}`);
        if (!response.ok) throw new Error('Falha ao buscar histórico.');
        const orcamentos = await response.json();
        if (orcamentos.length === 0) { container.innerHTML = '<div class="empty-state">Nenhum orçamento salvo para este cliente.</div>'; return; }

        let html = '<ul style="list-style-type: none; padding: 0;">';
        orcamentos.forEach(o => {
            const data = new Date(o.data_criacao).toLocaleDateString('pt-BR');
            let acaoBotao = '';
            // Define o próximo passo do ciclo de vida
            if (o.status === 'Criado') {
                acaoBotao = `<button class="btn btn-primary btn-avancar-status" data-id="${o.id}" data-status="Aprovado" style="padding: 5px 10px; font-size: 0.8em;">Aprovar</button>`;
            } else if (o.status === 'Aprovado') {
                acaoBotao = `<button class="btn btn-success btn-avancar-status" data-id="${o.id}" data-status="Em Produção" style="padding: 5px 10px; font-size: 0.8em;">Iniciar Produção</button>`;
            } // Adicione mais 'else if' para outros status como "Concluir", "Pagar", etc.

            html += `<li style="background: #e9ecef; padding: 10px; border-radius: 8px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr auto auto; gap: 15px; align-items: center;">
                        <div>
                            <span><strong>${o.codigo_orcamento}</strong> - ${data}</span><br>
                            <span style="font-size: 0.9em; color: #525f7f;">Status: <strong>${o.status}</strong></span>
                        </div>
                        <button class="btn btn-secondary btn-visualizar-orcamento" data-id="${o.id}" style="padding: 5px 10px; font-size: 0.8em;">Visualizar</button>
                        ${acaoBotao}
                     </li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        container.innerHTML = '<p>Erro ao carregar o histórico.</p>';
    }
}

// NOVA FUNÇÃO: Atualiza o status de um orçamento
async function atualizarStatusOrcamento(orcamentoId, novoStatus) {
    if (!confirm(`Tem certeza que deseja alterar o status deste orçamento para "${novoStatus}"?`)) {
        return;
    }
    try {
        const response = await fetch(`/api/orcamentos?orcamento_id=${orcamentoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });
        if (response.ok) {
            alert('Status do orçamento atualizado com sucesso!');
            // Recarrega o histórico para mostrar a mudança
            carregarHistoricoOrcamentos(clienteSelecionadoId);
        } else {
            throw new Error('Falha ao atualizar o status.');
        }
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert('Não foi possível atualizar o status do orçamento.');
    }
}

async function visualizarOrcamento(orcamentoId) { /* ... (sem alterações) ... */ }
async function salvarOrcamento() { /* ... (sem alterações) ... */ }
function gerarPDF() { /* ... (sem alterações) ... */ }
function criarPDF() { /* ... (sem alterações) ... */ }
function continuarGeracaoPDF(doc, pageWidth, margin, yPosition) { /* ... (sem alterações) ... */ }
function fecharModal() { /* ... (sem alterações) ... */ }
function baixarPDF() { /* ... (sem alterações) ... */ }
function encaminharWhatsApp() { /* ... (sem alterações) ... */ }

// --- INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // LÓGICA DE LOGIN
    const loginForm = document.getElementById('login-form'); const errorMessage = document.getElementById('error-message'); if (loginForm) { /* ... */ }
    // CONECTANDO EVENTOS AOS ELEMENTOS
    const selectCliente = document.getElementById('clienteExistente'); if (selectCliente) { selectCliente.addEventListener('change', selecionarCliente); }
    const btnSalvar = document.getElementById('btnSalvarCliente'); if (btnSalvar) { btnSalvar.addEventListener('click', salvarCliente); }
    const inputCnpjCpf = document.getElementById('clienteCnpjCpf'); if (inputCnpjCpf) { /* ... */ }
    const inputTelefone = document.getElementById('clienteTelefone'); if (inputTelefone) { /* ... */ }
    const inputValorUnitario = document.getElementById('itemValorUnitario'); if (inputValorUnitario) { /* ... */ }
    const btnAdicionarItem = document.getElementById('btnAdicionarItem'); if (btnAdicionarItem) { /* ... */ }
    const itensContainer = document.getElementById('itensContainer'); if (itensContainer) { /* ... */ }
    
    // ATUALIZANDO O EVENT LISTENER DO HISTÓRICO
    const historicoContainer = document.getElementById('historico-container');
    if (historicoContainer) {
        historicoContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.classList.contains('btn-visualizar-orcamento')) {
                const orcamentoId = target.dataset.id;
                visualizarOrcamento(orcamentoId);
            }
            // NOVO EVENTO: Captura o clique no botão de avançar status
            if (target && target.classList.contains('btn-avancar-status')) {
                const orcamentoId = target.dataset.id;
                const novoStatus = target.dataset.status;
                atualizarStatusOrcamento(orcamentoId, novoStatus);
            }
        });
    }

    const btnGerarPDF = document.getElementById('btnGerarPDF'); if (btnGerarPDF) { /* ... */ }
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento'); if (btnSalvarOrcamento) { /* ... */ }
    const btnBaixarPDF = document.getElementById('btnBaixarPDF'); if (btnBaixarPDF) { /* ... */ }
    const btnWhatsapp = document.getElementById('btnWhatsapp'); if (btnWhatsapp) { /* ... */ }
    const btnCloseModal = document.getElementById('btnCloseModal'); if (btnCloseModal) { /* ... */ }
    
    // INICIA A VERIFICAÇÃO
    checkLoginStatus();
});
