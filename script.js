// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];
let itensOrcamento = [];
let contadorItemId = 0;
let clienteSelecionadoId = null;
let orcamentoAtualId = null; // NOVO: Para saber se estamos editando um orçamento
let pdfGerado = null;
let dadosOrcamento = null;

// --- FUNÇÃO DE NOTIFICAÇÃO ---
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO ---
function formatarTelefone(input) { /* ... (sem alterações) ... */ }
function formatarCnpjCpf(input) { /* ... (sem alterações) ... */ }
const isEmailValid = (email) => { /* ... (sem alterações) ... */ };
function formatarCampoMoeda(input) { /* ... (sem alterações) ... */ }
function parseCurrency(value) { /* ... (sem alterações) ... */ }
function formatarMoeda(valor) { /* ... (sem alterações) ... */ }

// --- FUNÇÕES PRINCIPAIS DA APLICAÇÃO ---
function showApp() { /* ... (sem alterações) ... */ }
function showLogin() { /* ... (sem alterações) ... */ }
async function checkLoginStatus() { /* ... (sem alterações) ... */ }
async function carregarClientes() { /* ... (sem alterações) ... */ }

function selecionarCliente() {
    const select = document.getElementById('clienteExistente');
    clienteSelecionadoId = select.value;
    orcamentoAtualId = null; // Limpa o ID de edição ao trocar de cliente
    // ... (resto da função sem alterações)
}

async function salvarCliente() {
    // ... (substituir alert por mostrarNotificacao)
    if (!clienteNome) { mostrarNotificacao('O nome do cliente é obrigatório.', 'erro'); return; }
    if (!isEmailValid(clienteEmail)) { mostrarNotificacao('O formato do e-mail é inválido.', 'erro'); return; }
    // ...
    if (response.ok) {
        mostrarNotificacao(`Cliente "${clienteNome}" salvo com sucesso!`, 'sucesso');
        // ...
    } else {
        mostrarNotificacao(`Erro ao salvar cliente: ${errorData.error}`, 'erro');
    }
}

// --- FUNÇÕES DE ORÇAMENTO E HISTÓRICO ---
function renderizarTabelaItens() { /* ... (sem alterações) ... */ }
function renderizarOuAtualizarTotais() { /* ... (sem alterações) ... */ }
function atualizarTotais() { /* ... (sem alterações) ... */ }
function adicionarItem() {
    // ... (substituir alert por mostrarNotificacao)
    if (!descricao || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
        mostrarNotificacao('Preencha todos os campos do item com valores válidos.', 'erro');
        return;
    }
    // ...
}
function removerItem(itemId) { /* ... (sem alterações) ... */ }

async function carregarHistoricoOrcamentos(clienteId) { /* ... (sem alterações) ... */ }
async function atualizarStatusOrcamento(orcamentoId, novoStatus) {
    // ... (substituir alert por mostrarNotificacao)
    try {
        // ...
        if (response.ok) {
            mostrarNotificacao('Status do orçamento atualizado com sucesso!', 'sucesso');
            carregarHistoricoOrcamentos(clienteSelecionadoId);
        } // ...
    } catch (error) {
        mostrarNotificacao('Não foi possível atualizar o status do orçamento.', 'erro');
    }
}

async function visualizarOrcamento(orcamentoId) {
    mostrarNotificacao('Carregando dados do orçamento...', 'info');
    try {
        const response = await fetch(`/api/orcamentos?orcamento_id=${orcamentoId}`);
        if (!response.ok) throw new Error('Não foi possível carregar os detalhes do orçamento.');
        const orcamento = await response.json();

        // NOVO: Define que estamos em modo de edição
        orcamentoAtualId = orcamento.id;

        // ... (resto da função sem alterações)
    } catch (error) {
        mostrarNotificacao(error.message, 'erro');
    }
}

async function salvarOrcamento() {
    if (!clienteSelecionadoId) { mostrarNotificacao('Selecione um cliente para salvar.', 'erro'); return; }
    if (itensOrcamento.length === 0) { mostrarNotificacao('Adicione pelo menos um item.', 'erro'); return; }
    
    // ... (lógica de cálculo de totais - sem alterações)
    const orcamentoData = { /* ... */ };

    // NOVO: Define se vamos criar (POST) ou atualizar (PUT)
    const isEditing = orcamentoAtualId !== null;
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/api/orcamentos?orcamento_id=${orcamentoAtualId}` : '/api/orcamentos';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orcamentoData)
        });

        const result = await response.json();
        if (response.ok) {
            mostrarNotificacao(result.message, 'sucesso');
            carregarHistoricoOrcamentos(clienteSelecionadoId);
            if (!isEditing) {
                // Se era um novo orçamento, define o ID de edição para o que acabamos de criar
                orcamentoAtualId = result.orcamentoId; 
            }
        } else {
            mostrarNotificacao(`Erro: ${result.error}`, 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão ao salvar orçamento.', 'erro');
    }
}

// --- FUNÇÕES DE PDF E MODAL (RESTAURADAS E CORRIGIDAS) ---
function gerarPDF() {
    const clienteNome = document.getElementById('clienteNome').value.trim();
    if (!clienteNome || itensOrcamento.length === 0) {
        mostrarNotificacao('Selecione um cliente e adicione itens para gerar o PDF.', 'erro');
        return;
    }
    dadosOrcamento = { clienteNome };
    criarPDF();
}

function criarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let yPosition = 20;
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = function() {
        const logoWidth = 30;
        const aspectRatio = this.naturalHeight / this.naturalWidth;
        const logoHeight = logoWidth * aspectRatio;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(this, 'PNG', logoX, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 5;
        continuarGeracaoPDF(doc, pageWidth, margin, yPosition);
    };
    logoImg.onerror = () => {
        yPosition += 10;
        continuarGeracaoPDF(doc, pageWidth, margin, yPosition);
    };
    logoImg.src = 'https://i.imgur.com/zerV906.png';
}

function continuarGeracaoPDF(doc, pageWidth, margin, yPosition) {
    // ... (TODA a sua lógica de layout do PDF, incluindo as observações, permanece aqui) ...
    pdfGerado = doc;
    document.getElementById('shareModal').style.display = 'flex';
}

function fecharModal() { /* ... (sem alterações) ... */ }
function baixarPDF() { /* ... (sem alterações) ... */ }
function encaminharWhatsApp() { /* ... (sem alterações) ... */ }

// --- INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (toda a lógica de 'addEventListener' permanece igual) ...
    checkLoginStatus();
});
