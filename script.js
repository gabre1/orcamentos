// --- VARIÁVEIS GLOBAIS ---
let clientesCache = [];
let itensOrcamento = [];
let contadorItemId = 0;
let clienteSelecionadoId = null;
let orcamentoAtualId = null;
let pdfGerado = null;
let dadosOrcamento = null;
let orcamentoParaAcaoId = null;

// --- FUNÇÃO DE NOTIFICAÇÃO ---
function mostrarNotificacao(mensagem, tipo = 'sucesso') { const container = document.getElementById('notification-container'); if (!container) return; const toast = document.createElement('div'); toast.className = `toast ${tipo}`; toast.textContent = mensagem; container.appendChild(toast); setTimeout(() => { toast.remove(); }, 4000); }

// --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO ---
function formatarTelefone(input) { let value = input.value.replace(/\D/g, ''); if (value.length > 10) { value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3'); } else if (value.length > 2) { value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3'); } else if (value.length > 0) { value = `(${value}`; } input.value = value; }
function formatarCnpjCpf(input) { let valor = input.value.replace(/\D/g, ''); if (valor.length <= 11) { valor = valor.replace(/(\d{3})(\d)/, '$1.$2'); valor = valor.replace(/(\d{3})(\d)/, '$1.$2'); valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } else { valor = valor.replace(/^(\d{2})(\d)/, '$1.$2'); valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2'); valor = valor.replace(/(\d{4})(\d)/, '$1-$2'); } input.value = valor; }
const isEmailValid = (email) => { if (!email) return true; const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return emailRegex.test(email); };
function formatarCampoMoeda(input) { let valor = input.value.replace(/\D/g, ''); if (valor === '') { input.value = ''; return; } valor = (parseInt(valor, 10) / 100).toFixed(2) + ''; valor = valor.replace('.', ','); valor = valor.replace(/(\d)(?=(\d{3})+(?!\d),)/g, '$1.'); input.value = valor; }
function parseCurrency(value) { if (!value) return 0; return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0; }
function formatarMoeda(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// --- FUNÇÕES PRINCIPAIS DA APLICAÇÃO ---
function showApp() { document.getElementById('login-container').classList.add('hidden'); document.getElementById('app-container').classList.remove('hidden'); document.body.style.alignItems = 'flex-start'; conectarEventosApp(); carregarClientes(); }
function showLogin() { document.getElementById('login-container').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); document.body.style.alignItems = 'center'; }
async function checkLoginStatus() { try { const response = await fetch('/api/session-check'); if (response.ok) { const data = await response.json(); if (data.loggedIn) { showApp(); } else { showLogin(); } } else { showLogin(); } } catch (error) { showLogin(); } }
async function carregarClientes() { const select = document.getElementById('clienteExistente'); select.innerHTML = '<option value="">-- Carregando... --</option>'; try { const response = await fetch('/api/clientes'); if (!response.ok) throw new Error('Falha ao buscar clientes.'); const clientes = await response.json(); clientesCache = clientes; select.innerHTML = '<option value="">-- Novo Cliente --</option>'; clientes.forEach(cliente => { const option = new Option(`#${cliente.id} - ${cliente.nome}`, cliente.id); select.appendChild(option); }); } catch (error) { mostrarNotificacao(error.message, 'erro'); select.innerHTML = '<option value="">Erro ao carregar</option>'; } }

// --- FUNÇÃO selecionarCliente() CORRIGIDA ---
function selecionarCliente() {
    console.log("Função selecionarCliente foi chamada.");
    const select = document.getElementById('clienteExistente');
    clienteSelecionadoId = select.value;
    orcamentoAtualId = null; // Limpa o ID de edição ao trocar de cliente
    
    const historicoSection = document.getElementById('historico-section');
    const historicoContainer = document.getElementById('historico-container');
    const clienteSelecionado = clientesCache.find(c => c.id == clienteSelecionadoId);
    
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

    if (clienteSelecionadoId) {
        console.log("Cliente selecionado. Mostrando histórico...");
        historicoSection.style.display = 'block';
        carregarHistoricoOrcamentos(clienteSelecionadoId);
    } else {
        console.log("Nenhum cliente selecionado. Escondendo histórico.");
        historicoSection.style.display = 'none';
        historicoContainer.innerHTML = '';
    }
}

async function salvarCliente() { const clienteNome = document.getElementById('clienteNome').value.trim(); const clienteEmail = document.getElementById('clienteEmail').value.trim(); if (!clienteNome) { mostrarNotificacao('O nome do cliente é obrigatório.', 'erro'); return; } if (!isEmailValid(clienteEmail)) { mostrarNotificacao('O formato do e-mail é inválido.', 'erro'); return; } const clienteData = { nome: clienteNome, cnpj_cpf: document.getElementById('clienteCnpjCpf').value.trim(), email: clienteEmail, telefone: document.getElementById('clienteTelefone').value.trim(), }; try { const response = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clienteData), }); if (response.ok) { mostrarNotificacao(`Cliente "${clienteNome}" salvo com sucesso!`, 'sucesso'); document.getElementById('clienteExistente').value = ""; selecionarCliente(); carregarClientes(); } else { const errorData = await response.json(); mostrarNotificacao(`Erro ao salvar cliente: ${errorData.error || 'Erro desconhecido'}`, 'erro'); } } catch (error) { console.error('Erro de conexão ao salvar cliente:', error); mostrarNotificacao('Erro de conexão. Tente novamente.', 'erro'); } }
function renderizarTabelaItens() { const container = document.getElementById('itensContainer'); if (itensOrcamento.length === 0) { container.innerHTML = `<div class="empty-state"><h3>Nenhum item adicionado</h3><p>Adicione itens ao orçamento.</p></div>`; } else { const tabelaHTML = ` <table class="items-table"> <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th>Ações</th></tr></thead> <tbody> ${itensOrcamento.map(item => ` <tr> <td>${item.descricao}</td> <td>${item.quantidade}</td> <td>${formatarMoeda(item.valorUnitario)}</td> <td>${formatarMoeda(item.valorTotal)}</td> <td><button class="btn btn-danger btn-remover-item" data-id="${item.id}">🗑️</button></td> </tr>`).join('')} </tbody> </table> `; container.innerHTML = tabelaHTML; } renderizarOuAtualizarTotais(); }
function renderizarOuAtualizarTotais() { const totaisContainer = document.getElementById('totaisContainer'); if (itensOrcamento.length === 0) { totaisContainer.innerHTML = ''; return; } if (!document.getElementById('total-section-id')) { totaisContainer.innerHTML = ` <div class="total-section" id="total-section-id"> <div class="form-grid" style="grid-template-columns: 2fr 1fr; gap: 10px; margin-bottom: 20px; text-align: left;"> <div class="form-group"> <label for="descontoValor" style="color: white;">Desconto</label> <input type="text" id="descontoValor" placeholder="0" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;"> </div> <div class="form-group"> <label for="descontoTipo" style="color: white;">Tipo</label> <select id="descontoTipo" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;"> <option value="dinheiro">R$</option> <option value="porcentagem">%</option> </select> </div> </div> <p style="font-size: 1rem; font-weight: 400; text-align: right;">Subtotal: <span id="subtotal-valor"></span></p> <p style="font-size: 1rem; font-weight: 400; text-align: right; margin-bottom: 10px;">Desconto: <span id="desconto-valor-display"></span></p> <h3 style="text-align: right;">Total Geral</h3> <p id="total-geral-valor" style="text-align: right;"></p> </div>`; } atualizarTotais(); }
function atualizarTotais() { if (itensOrcamento.length === 0 || !document.getElementById('total-section-id')) return; const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0); const descontoValorInput = document.getElementById('descontoValor').value; const descontoTipo = document.getElementById('descontoTipo').value; let descontoCalculado = 0; if (descontoTipo === 'dinheiro') { descontoCalculado = parseCurrency(descontoValorInput); } else { const porcentagem = parseFloat(descontoValorInput.replace(',', '.')) || 0; descontoCalculado = subtotal * (porcentagem / 100); } const totalGeral = subtotal - descontoCalculado; document.getElementById('subtotal-valor').textContent = formatarMoeda(subtotal); document.getElementById('desconto-valor-display').textContent = `- ${formatarMoeda(descontoCalculado)}`; document.getElementById('total-geral-valor').textContent = formatarMoeda(totalGeral); }
function adicionarItem() { const descricao = document.getElementById('itemDescricao').value.trim(); const quantidade = parseInt(document.getElementById('itemQuantidade').value); const valorUnitario = parseCurrency(document.getElementById('itemValorUnitario').value); if (!descricao || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) { mostrarNotificacao('Preencha todos os campos do item com valores válidos.', 'erro'); return; } const novoItem = { id: ++contadorItemId, descricao, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario }; itensOrcamento.push(novoItem); renderizarTabelaItens(); document.getElementById('itemDescricao').value = ''; document.getElementById('itemQuantidade').value = '1'; document.getElementById('itemValorUnitario').value = ''; }
function removerItem(itemId) { itensOrcamento = itensOrcamento.filter(item => item.id !== itemId); renderizarTabelaItens(); }
async function carregarHistoricoOrcamentos(clienteId) { const container = document.getElementById('historico-container'); container.innerHTML = '<p>Carregando histórico...</p>'; try { const response = await fetch(`/api/orcamentos?cliente_id=${clienteId}`); if (!response.ok) throw new Error('Falha ao buscar histórico.'); const orcamentos = await response.json(); if (orcamentos.length === 0) { container.innerHTML = '<div class="empty-state">Nenhum orçamento salvo para este cliente.</div>'; return; } let html = '<ul style="list-style-type: none; padding: 0;">'; orcamentos.forEach(o => { const data = new Date(o.data_criacao).toLocaleDateString('pt-BR'); let acaoBotao = ''; if (o.status === 'Criado' || o.status === 'Reprovado') { acaoBotao = `<button class="btn btn-primary btn-avancar-status" data-id="${o.id}" data-status="Aprovado" style="padding: 5px 10px; font-size: 0.8em;">Aprovar</button>`; } else if (o.status === 'Aprovado') { acaoBotao = `<button class="btn btn-primary btn-iniciar-producao" data-id="${o.id}" style="padding: 5px 10px; font-size: 0.8em;">Iniciar Produção</button>`; } else if (o.status === 'Em Produção') { acaoBotao = `<button class="btn btn-success btn-avancar-status" data-id="${o.id}" data-status="Concluído" style="padding: 5px 10px; font-size: 0.8em;">Concluir</button>`; } html += `<li style="background: #e9ecef; padding: 10px; border-radius: 8px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr auto auto; gap: 15px; align-items: center;"> <div> <span><strong>${o.codigo_orcamento}</strong> - ${data}</span><br> <span style="font-size: 0.9em; color: #525f7f;">Status: <strong>${o.status}</strong></span> </div> <button class="btn btn-secondary btn-visualizar-orcamento" data-id="${o.id}" style="padding: 5px 10px; font-size: 0.8em;">Visualizar</button> ${acaoBotao} </li>`; }); html += '</ul>'; container.innerHTML = html; } catch (error) { console.error("Erro ao carregar histórico:", error); container.innerHTML = '<p>Erro ao carregar o histórico.</p>'; } }
async function atualizarStatusOrcamento(orcamentoId, novoStatus, dadosExtras = {}) { const confirmMessage = dadosExtras.numero_oc ? `Tem certeza que deseja iniciar a produção com a OC "${dadosExtras.numero_oc}"?` : `Tem certeza que deseja alterar o status para "${novoStatus}"?`; if (!confirm(confirmMessage)) return; try { const response = await fetch(`/api/orcamentos?orcamento_id=${orcamentoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus, ...dadosExtras }) }); if (response.ok) { mostrarNotificacao('Status atualizado com sucesso!', 'sucesso'); if (clienteSelecionadoId) carregarHistoricoOrcamentos(clienteSelecionadoId); } else { throw new Error('Falha ao atualizar o status.'); } } catch (error) { mostrarNotificacao('Não foi possível atualizar o status.', 'erro'); } }
async function visualizarOrcamento(orcamentoId) { mostrarNotificacao('Carregando dados do orçamento...', 'info'); try { const response = await fetch(`/api/orcamentos?orcamento_id=${orcamentoId}`); if (!response.ok) throw new Error('Não foi possível carregar os detalhes do orçamento.'); const orcamento = await response.json(); orcamentoAtualId = orcamento.id; itensOrcamento = orcamento.itens.map(item => ({ id: ++contadorItemId, descricao: item.descricao, quantidade: item.quantidade, valorUnitario: parseFloat(item.valor_unitario), valorTotal: item.quantidade * parseFloat(item.valor_unitario) })); renderizarTabelaItens(); const descontoTipo = document.getElementById('descontoTipo'); const descontoValor = document.getElementById('descontoValor'); if (descontoTipo && descontoValor) { descontoTipo.value = orcamento.desconto_tipo || 'dinheiro'; if (orcamento.desconto_tipo === 'porcentagem') { const subtotal = orcamento.itens.reduce((acc, item) => acc + (item.quantidade * parseFloat(item.valor_unitario)), 0); const porcentagem = subtotal > 0 ? (parseFloat(orcamento.desconto_valor) / subtotal) * 100 : 0; descontoValor.value = porcentagem.toFixed(2).replace('.', ','); } else { descontoValor.value = String(parseFloat(orcamento.desconto_valor).toFixed(2)).replace('.', ','); formatarCampoMoeda(descontoValor); } } document.getElementById('observacoes').value = orcamento.observacoes || ''; } catch (error) { console.error("Erro ao visualizar orçamento:", error); mostrarNotificacao(error.message, 'erro'); } }
async function salvarOrcamento() { if (!clienteSelecionadoId) { mostrarNotificacao('Selecione um cliente para salvar.', 'erro'); return; } if (itensOrcamento.length === 0) { mostrarNotificacao('Adicione pelo menos um item.', 'erro'); return; } const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0); const descontoValorInput = document.getElementById('descontoValor').value; const descontoTipo = document.getElementById('descontoTipo').value; let descontoCalculado = 0; if (descontoTipo === 'dinheiro') { descontoCalculado = parseCurrency(descontoValorInput); } else { const porcentagem = parseFloat(descontoValorInput.replace(',', '.')) || 0; descontoCalculado = subtotal * (porcentagem / 100); } const valorTotal = subtotal - descontoCalculado; const orcamentoData = { cliente_id: clienteSelecionadoId, subtotal, desconto_valor: descontoCalculado, desconto_tipo: descontoTipo, valor_total: valorTotal, observacoes: document.getElementById('observacoes').value, itens: itensOrcamento }; const isEditing = orcamentoAtualId !== null; const method = isEditing ? 'PUT' : 'POST'; const url = isEditing ? `/api/orcamentos?orcamento_id=${orcamentoAtualId}` : '/api/orcamentos'; try { const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orcamentoData) }); const result = await response.json(); if (response.ok) { mostrarNotificacao(result.message, 'sucesso'); carregarHistoricoOrcamentos(clienteSelecionadoId); if (!isEditing) { orcamentoAtualId = result.orcamentoId; } } else { mostrarNotificacao(`Erro: ${result.error}`, 'erro'); } } catch (error) { mostrarNotificacao('Erro de conexão ao salvar orçamento.', 'erro'); } }
function gerarPDF() { /* ... (código completo do PDF - sem alterações) ... */ }
function criarPDF() { /* ... (código completo do PDF - sem alterações) ... */ }
function continuarGeracaoPDF(doc, pageWidth, margin, yPosition) { /* ... (código completo do PDF - sem alterações) ... */ }
function fecharModal() { /* ... (código completo do PDF - sem alterações) ... */ }
function baixarPDF() { /* ... (código completo do PDF - sem alterações) ... */ }
function encaminharWhatsApp() { /* ... (código completo do PDF - sem alterações) ... */ }
function alternarAbas(abaAtiva) { /* ... (código completo - sem alterações) ... */ }
async function carregarPainelProducao() { /* ... (código completo - sem alterações) ... */ }
async function salvarPagamento() { /* ... (código completo - sem alterações) ... */ }

// --- INICIALIZAÇÃO E EVENTOS ---

function conectarEventosApp() {
    // Navegação
    document.getElementById('btnNavGerador').addEventListener('click', () => alternarAbas('gerador'));
    document.getElementById('btnNavProducao').addEventListener('click', () => alternarAbas('producao'));
    document.getElementById('btnAtualizarPainel').addEventListener('click', carregarPainelProducao);
    
    // Modais
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal-overlay').style.display = 'none');
    });

    // Gerador
    document.getElementById('clienteExistente').addEventListener('change', selecionarCliente);
    document.getElementById('btnSalvarCliente').addEventListener('click', salvarCliente);
    document.getElementById('clienteCnpjCpf').addEventListener('input', (e) => formatarCnpjCpf(e.target));
    document.getElementById('clienteTelefone').addEventListener('input', (e) => formatarTelefone(e.target));
    document.getElementById('itemValorUnitario').addEventListener('input', (e) => formatarCampoMoeda(e.target));
    document.getElementById('btnAdicionarItem').addEventListener('click', adicionarItem);
    document.getElementById('itensContainer').addEventListener('click', (e) => { const target = e.target.closest('button'); if (target && target.classList.contains('btn-remover-item')) { const itemId = parseInt(target.dataset.id, 10); removerItem(itemId); } });
    document.getElementById('totaisContainer').addEventListener('input', (e) => { if (e.target && e.target.id === 'descontoValor') { atualizarTotais(); } });
    document.getElementById('totaisContainer').addEventListener('change', (e) => { if (e.target && e.target.id === 'descontoTipo') { atualizarTotais(); } });
    
    // Histórico e Kanban
    const historicoContainer = document.getElementById('historico-container');
    if (historicoContainer) { historicoContainer.addEventListener('click', (e) => { const target = e.target.closest('button'); if (!target) return; if (target.classList.contains('btn-visualizar-orcamento')) { const orcamentoId = target.dataset.id; visualizarOrcamento(orcamentoId); } if (target.classList.contains('btn-iniciar-producao')) { orcamentoParaAcaoId = target.dataset.id; document.getElementById('ocModal').style.display = 'flex'; } if (target.classList.contains('btn-avancar-status')) { const orcamentoId = target.dataset.id; const novoStatus = target.dataset.status; atualizarStatusOrcamento(orcamentoId, novoStatus); } }); }
    const kanbanBoard = document.getElementById('kanban-board');
    if (kanbanBoard) { kanbanBoard.addEventListener('click', (e) => { const target = e.target.closest('button'); if (!target) return; orcamentoParaAcaoId = target.dataset.id; if (target.classList.contains('btn-visualizar-kanban')) { alternarAbas('gerador'); visualizarOrcamento(orcamentoParaAcaoId); } if (target.classList.contains('btn-registrar-pagamento')) { const total = parseFloat(target.dataset.total); const pago = parseFloat(target.dataset.pago); document.getElementById('pagamentoModalTitle').textContent = `Saldo Devedor: ${formatarMoeda(total - pago)}`; document.getElementById('pagamentoModal').style.display = 'flex'; } }); }

    // Modal de OC
    document.getElementById('btnConfirmarOC').addEventListener('click', () => { const numeroOC = document.getElementById('inputNumeroOC').value; if (!numeroOC) { mostrarNotificacao('O número da OC é obrigatório.', 'erro'); return; } atualizarStatusOrcamento(orcamentoParaAcaoId, 'Em Produção', { numero_oc: numeroOC }); document.getElementById('ocModal').style.display = 'none'; });
    
    // Modal de Pagamento
    document.getElementById('btnSalvarPagamento').addEventListener('click', salvarPagamento);
    document.getElementById('inputValorPago').addEventListener('input', (e) => formatarCampoMoeda(e.target));

    // Botões Principais
    document.getElementById('btnGerarPDF').addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarOrcamento').addEventListener('click', salvarOrcamento);

    // Botões do Modal de Compartilhamento
    document.getElementById('btnBaixarPDF').addEventListener('click', baixarPDF);
    document.getElementById('btnWhatsapp').addEventListener('click', encaminharWhatsApp);
    document.getElementById('btnCloseModal').addEventListener('click', fecharModal);
}

document.addEventListener('DOMContentLoaded', () => {
    // Apenas a lógica de login é conectada no início
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessage = document.getElementById('error-message');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password-login').value;
            errorMessage.textContent = '';
            try {
                const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
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
    
    // Inicia a verificação da sessão
    checkLoginStatus();
});
