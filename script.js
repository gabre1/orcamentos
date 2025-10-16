// --- VARIÁVEIS GLOBAIS ---
let clientesCache = []; let itensOrcamento = []; let contadorItemId = 0; let clienteSelecionadoId = null; let orcamentoAtualId = null; let pdfGerado = null; let dadosOrcamento = null; let orcamentoParaAcaoId = null; // Para modais

// --- FUNÇÕES ---
function mostrarNotificacao(mensagem, tipo = 'sucesso') { /* ... */ }
function formatarTelefone(input) { /* ... */ }
function formatarCnpjCpf(input) { /* ... */ }
const isEmailValid = (email) => { /* ... */ };
function formatarCampoMoeda(input) { /* ... */ }
function parseCurrency(value) { /* ... */ }
function formatarMoeda(valor) { /* ... */ }
function showApp() { /* ... */ }
function showLogin() { /* ... */ }
async function checkLoginStatus() { /* ... */ }
async function carregarClientes() { /* ... */ }
function selecionarCliente() { /* ... */ }
async function salvarCliente() { /* ... */ }
function renderizarTabelaItens() { /* ... */ }
function renderizarOuAtualizarTotais() { /* ... */ }
function atualizarTotais() { /* ... */ }
function adicionarItem() { /* ... */ }
function removerItem(itemId) { /* ... */ }
async function carregarHistoricoOrcamentos(clienteId) { /* ... */ }
async function visualizarOrcamento(orcamentoId) { /* ... */ }
async function salvarOrcamento() { /* ... */ }
function gerarPDF() { /* ... */ }
function criarPDF() { /* ... */ }
function continuarGeracaoPDF(doc, pageWidth, margin, yPosition) { /* ... */ }
function fecharModal() { /* ... */ }
function baixarPDF() { /* ... */ }
function encaminharWhatsApp() { /* ... */ }

// --- NOVAS FUNÇÕES: PAINEL DE PRODUÇÃO E PAGAMENTOS ---

function alternarAbas(abaAtiva) {
    const geradorContainer = document.getElementById('gerador-container');
    const producaoContainer = document.getElementById('producao-container');
    const btnNavGerador = document.getElementById('btnNavGerador');
    const btnNavProducao = document.getElementById('btnNavProducao');

    if (abaAtiva === 'producao') {
        geradorContainer.classList.add('hidden');
        producaoContainer.classList.remove('hidden');
        btnNavGerador.classList.remove('active');
        btnNavProducao.classList.add('active');
        carregarPainelProducao();
    } else { // 'gerador'
        geradorContainer.classList.remove('hidden');
        producaoContainer.classList.add('hidden');
        btnNavGerador.classList.add('active');
        btnNavProducao.classList.remove('active');
    }
}

async function carregarPainelProducao() {
    mostrarNotificacao('Atualizando painel...', 'info');
    const colunas = {
        aprovado: document.getElementById('coluna-aprovado'),
        'em-producao': document.getElementById('coluna-em-producao'),
        concluido: document.getElementById('coluna-concluido'),
    };
    Object.values(colunas).forEach(c => c.innerHTML = ''); // Limpa colunas

    try {
        const response = await fetch('/api/orcamentos?painel_producao=true');
        if (!response.ok) throw new Error('Falha ao carregar dados de produção.');
        const orcamentos = await response.json();

        orcamentos.forEach(o => {
            const statusKey = o.status.toLowerCase().replace(' ', '-');
            if (colunas[statusKey]) {
                const card = document.createElement('div');
                card.className = 'kanban-card';
                
                let paymentStatusHTML = '';
                const totalPago = parseFloat(o.total_pago);
                const valorTotal = parseFloat(o.valor_total);

                if (totalPago >= valorTotal) {
                    paymentStatusHTML = '<span class="payment-status status-pago">Pago</span>';
                } else if (totalPago > 0) {
                    paymentStatusHTML = `<span class="payment-status status-parcial">Parcial (${formatarMoeda(totalPago)})</span>`;
                } else {
                    paymentStatusHTML = '<span class="payment-status status-pendente">Pendente</span>';
                }

                card.innerHTML = `
                    <h4>${o.codigo_orcamento}</h4>
                    <p>${o.cliente_nome}</p>
                    <p><strong>Total: ${formatarMoeda(valorTotal)}</strong> ${paymentStatusHTML}</p>
                    <div class="kanban-card-footer">
                        <button class="btn btn-secondary btn-visualizar-kanban" data-id="${o.id}">Detalhes</button>
                        ${o.status === 'Concluído' ? `<button class="btn btn-success btn-registrar-pagamento" data-id="${o.id}" data-total="${valorTotal}" data-pago="${totalPago}">Pagamento</button>` : ''}
                    </div>
                `;
                colunas[statusKey].appendChild(card);
            }
        });
    } catch (error) {
        mostrarNotificacao(error.message, 'erro');
    }
}

async function atualizarStatusOrcamento(orcamentoId, novoStatus, dadosExtras = {}) {
    const confirmMessage = dadosExtras.numero_oc 
        ? `Tem certeza que deseja iniciar a produção com a OC "${dadosExtras.numero_oc}"?`
        : `Tem certeza que deseja alterar o status para "${novoStatus}"?`;
    
    if (!confirm(confirmMessage)) return;

    try {
        const response = await fetch(`/api/orcamentos?orcamento_id=${orcamentoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus, ...dadosExtras })
        });
        if (response.ok) {
            mostrarNotificacao('Status atualizado com sucesso!', 'sucesso');
            if (clienteSelecionadoId) carregarHistoricoOrcamentos(clienteSelecionadoId);
        } else {
            throw new Error('Falha ao atualizar o status.');
        }
    } catch (error) {
        mostrarNotificacao('Não foi possível atualizar o status.', 'erro');
    }
}

async function salvarPagamento() {
    const valorPago = parseCurrency(document.getElementById('inputValorPago').value);
    if (!valorPago || valorPago <= 0) {
        mostrarNotificacao('Insira um valor de pagamento válido.', 'erro');
        return;
    }
    const dadosPagamento = {
        orcamento_id: orcamentoParaAcaoId,
        valor_pago: valorPago,
        metodo_pagamento: document.getElementById('selectMetodoPagamento').value,
        observacoes: document.getElementById('inputObsPagamento').value,
    };
    try {
        const response = await fetch('/api/pagamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPagamento),
        });
        if (response.ok) {
            mostrarNotificacao('Pagamento registrado com sucesso!', 'sucesso');
            document.getElementById('pagamentoModal').style.display = 'none';
            carregarPainelProducao(); // Atualiza o painel
        } else {
            throw new Error('Falha ao registrar o pagamento.');
        }
    } catch (error) {
        mostrarNotificacao(error.message, 'erro');
    }
}

// --- INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (todos os event listeners existentes, como login, salvar cliente, etc.)

    // Navegação
    document.getElementById('btnNavGerador').addEventListener('click', () => alternarAbas('gerador'));
    document.getElementById('btnNavProducao').addEventListener('click', () => alternarAbas('producao'));
    document.getElementById('btnAtualizarPainel').addEventListener('click', carregarPainelProducao);

    // Modais
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', () => document.getElementById(btn.dataset.modalId).style.display = 'none');
    });

    // Histórico e Kanban
    const historicoContainer = document.getElementById('historico-container');
    if (historicoContainer) { /* ... (sem alterações) ... */ }
    
    const kanbanBoard = document.getElementById('kanban-board');
    if (kanbanBoard) {
        kanbanBoard.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            orcamentoParaAcaoId = target.dataset.id;
            
            if (target.classList.contains('btn-visualizar-kanban')) {
                alternarAbas('gerador');
                visualizarOrcamento(orcamentoParaAcaoId);
            }
            if (target.classList.contains('btn-registrar-pagamento')) {
                const total = parseFloat(target.dataset.total);
                const pago = parseFloat(target.dataset.pago);
                document.getElementById('pagamentoModalTitle').textContent = `Saldo Devedor: ${formatarMoeda(total - pago)}`;
                document.getElementById('pagamentoModal').style.display = 'flex';
            }
        });
    }

    // Modal de OC
    document.getElementById('btnConfirmarOC').addEventListener('click', () => {
        const numeroOC = document.getElementById('inputNumeroOC').value;
        if (!numeroOC) { mostrarNotificacao('O número da OC é obrigatório.', 'erro'); return; }
        atualizarStatusOrcamento(orcamentoParaAcaoId, 'Em Produção', { numero_oc: numeroOC });
        document.getElementById('ocModal').style.display = 'none';
    });

    // Modal de Pagamento
    document.getElementById('btnSalvarPagamento').addEventListener('click', salvarPagamento);
    document.getElementById('inputValorPago').addEventListener('input', (e) => formatarCampoMoeda(e.target));
    
    checkLoginStatus();
});
