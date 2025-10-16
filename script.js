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
async function salvarCliente() { const clienteNome = document.getElementById('clienteNome').value.trim(); const clienteEmail = document.getElementById('clienteEmail').value.trim(); if (!clienteNome) { alert('O nome do cliente é obrigatório.'); return; } if (!isEmailValid(clienteEmail)) { alert('O formato do e-mail é inválido. Por favor, corrija.'); return; } const clienteData = { nome: clienteNome, cnpj_cpf: document.getElementById('clienteCnpjCpf').value.trim(), email: clienteEmail, telefone: document.getElementById('clienteTelefone').value.trim(), }; try { const response = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clienteData), }); if (response.ok) { alert(`Cliente "${clienteNome}" salvo com sucesso!`); document.getElementById('clienteExistente').value = ""; selecionarCliente(); carregarClientes(); } else { const errorData = await response.json(); alert(`Erro ao salvar cliente: ${errorData.error || 'Erro desconhecido'}`); } } catch (error) { console.error('Erro de conexão ao salvar cliente:', error); alert('Erro de conexão. Tente novamente.'); } }

// --- FUNÇÕES DE ORÇAMENTO E HISTÓRICO ---
function renderizarTabelaItens() { const container = document.getElementById('itensContainer'); if (itensOrcamento.length === 0) { container.innerHTML = `<div class="empty-state"><h3>Nenhum item adicionado</h3><p>Adicione itens ao orçamento.</p></div>`; } else { const tabelaHTML = ` <table class="items-table"> <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th>Ações</th></tr></thead> <tbody> ${itensOrcamento.map(item => ` <tr> <td>${item.descricao}</td> <td>${item.quantidade}</td> <td>${formatarMoeda(item.valorUnitario)}</td> <td>${formatarMoeda(item.valorTotal)}</td> <td><button class="btn btn-danger btn-remover-item" data-id="${item.id}">🗑️</button></td> </tr>`).join('')} </tbody> </table> `; container.innerHTML = tabelaHTML; } renderizarOuAtualizarTotais(); }
function renderizarOuAtualizarTotais() { const totaisContainer = document.getElementById('totaisContainer'); if (itensOrcamento.length === 0) { totaisContainer.innerHTML = ''; return; } if (!document.getElementById('total-section-id')) { totaisContainer.innerHTML = ` <div class="total-section" id="total-section-id"> <div class="form-grid" style="grid-template-columns: 2fr 1fr; gap: 10px; margin-bottom: 20px; text-align: left;"> <div class="form-group"> <label for="descontoValor" style="color: white;">Desconto</label> <input type="text" id="descontoValor" placeholder="0" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;"> </div> <div class="form-group"> <label for="descontoTipo" style="color: white;">Tipo</label> <select id="descontoTipo" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;"> <option value="dinheiro">R$</option> <option value="porcentagem">%</option> </select> </div> </div> <p style="font-size: 1rem; font-weight: 400; text-align: right;">Subtotal: <span id="subtotal-valor"></span></p> <p style="font-size: 1rem; font-weight: 400; text-align: right; margin-bottom: 10px;">Desconto: <span id="desconto-valor-display"></span></p> <h3 style="text-align: right;">Total Geral</h3> <p id="total-geral-valor" style="text-align: right;"></p> </div>`; document.getElementById('descontoValor').addEventListener('input', atualizarTotais); document.getElementById('descontoTipo').addEventListener('change', atualizarTotais); } atualizarTotais(); }
function atualizarTotais() { if (itensOrcamento.length === 0) return; const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0); const descontoValorInput = document.getElementById('descontoValor').value; const descontoTipo = document.getElementById('descontoTipo').value; let descontoCalculado = 0; if (descontoTipo === 'dinheiro') { descontoCalculado = parseCurrency(descontoValorInput); } else { const porcentagem = parseFloat(descontoValorInput) || 0; descontoCalculado = subtotal * (porcentagem / 100); } const totalGeral = subtotal - descontoCalculado; document.getElementById('subtotal-valor').textContent = formatarMoeda(subtotal); document.getElementById('desconto-valor-display').textContent = `- ${formatarMoeda(descontoCalculado)}`; document.getElementById('total-geral-valor').textContent = formatarMoeda(totalGeral); }
function adicionarItem() { const descricao = document.getElementById('itemDescricao').value.trim(); const quantidade = parseInt(document.getElementById('itemQuantidade').value); const valorUnitario = parseCurrency(document.getElementById('itemValorUnitario').value); if (!descricao || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) { alert('Por favor, preencha todos os campos do item com valores válidos.'); return; } const novoItem = { id: ++contadorItemId, descricao, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario }; itensOrcamento.push(novoItem); renderizarTabelaItens(); document.getElementById('itemDescricao').value = ''; document.getElementById('itemQuantidade').value = '1'; document.getElementById('itemValorUnitario').value = ''; }
function removerItem(itemId) { itensOrcamento = itensOrcamento.filter(item => item.id !== itemId); renderizarTabelaItens(); }

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
            html += `<li style="background: #e9ecef; padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span><strong>${o.codigo_orcamento}</strong> - ${data}</span><br>
                            <span style="font-size: 0.9em;">Total: ${formatarMoeda(parseFloat(o.valor_total))}</span>
                        </div>
                        <button class="btn btn-secondary btn-visualizar-orcamento" data-id="${o.id}" style="padding: 5px 10px; font-size: 0.8em;">Visualizar</button>
                     </li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        container.innerHTML = '<p>Erro ao carregar o histórico.</p>';
    }
}

// NOVA FUNÇÃO: Visualiza um orçamento salvo
async function visualizarOrcamento(orcamentoId) {
    alert(`Carregando dados do orçamento #${orcamentoId}...`);
    try {
        const response = await fetch(`/api/orcamentos?orcamento_id=${orcamentoId}`);
        if (!response.ok) throw new Error('Não foi possível carregar os detalhes do orçamento.');
        
        const orcamento = await response.json();

        // Preenche os itens
        itensOrcamento = orcamento.itens.map(item => ({
            id: ++contadorItemId,
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnitario: parseFloat(item.valor_unitario),
            valorTotal: item.quantidade * parseFloat(item.valor_unitario)
        }));
        renderizarTabelaItens();

        // Preenche o desconto
        const descontoTipo = document.getElementById('descontoTipo');
        const descontoValor = document.getElementById('descontoValor');
        if (descontoTipo && descontoValor) {
            descontoTipo.value = orcamento.desconto_tipo || 'dinheiro';
            if (orcamento.desconto_tipo === 'porcentagem') {
                const subtotal = orcamento.itens.reduce((acc, item) => acc + (item.quantidade * parseFloat(item.valor_unitario)), 0);
                const porcentagem = subtotal > 0 ? (parseFloat(orcamento.desconto_valor) / subtotal) * 100 : 0;
                descontoValor.value = porcentagem.toFixed(2).replace('.', ',');
            } else {
                descontoValor.value = String(parseFloat(orcamento.desconto_valor).toFixed(2)).replace('.', ',');
                formatarCampoMoeda(descontoValor);
            }
        }
        
        // Preenche as observações
        document.getElementById('observacoes').value = orcamento.observacoes || '';

        // Atualiza os totais na tela
        atualizarTotais();
        
    } catch (error) {
        console.error("Erro ao visualizar orçamento:", error);
        alert(error.message);
    }
}

async function salvarOrcamento() {
    if (!clienteSelecionadoId) { alert('Selecione um cliente para salvar o orçamento.'); return; }
    if (itensOrcamento.length === 0) { alert('Adicione pelo menos um item ao orçamento.'); return; }
    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0); const descontoValorInput = document.getElementById('descontoValor').value; const descontoTipo = document.getElementById('descontoTipo').value; let descontoCalculado = 0; if (descontoTipo === 'dinheiro') { descontoCalculado = parseCurrency(descontoValorInput); } else { const porcentagem = parseFloat(descontoValorInput) || 0; descontoCalculado = subtotal * (porcentagem / 100); } const valorTotal = subtotal - descontoCalculado;
    const orcamentoData = { cliente_id: clienteSelecionadoId, subtotal, desconto_valor: descontoCalculado, desconto_tipo: descontoTipo, valor_total: valorTotal, observacoes: document.getElementById('observacoes').value, itens: itensOrcamento };
    try {
        const response = await fetch('/api/orcamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orcamentoData) });
        if (response.ok) { const result = await response.json(); alert(`Orçamento ${result.codigoOrcamento} salvo com sucesso!`); carregarHistoricoOrcamentos(clienteSelecionadoId); } else { const errorData = await response.json(); alert(`Erro ao salvar o orçamento: ${errorData.error || 'Erro desconhecido'}`); }
    } catch (error) { console.error("Erro de conexão ao salvar orçamento:", error); alert('Erro de conexão. Tente novamente.'); }
}

function gerarPDF() { const clienteNome = document.getElementById('clienteNome').value.trim(); if (!clienteNome || itensOrcamento.length === 0) { alert('Selecione um cliente e adicione itens para gerar o PDF.'); return; } dadosOrcamento = { clienteNome }; criarPDF(); }
function criarPDF() { const { jsPDF } = window.jspdf; const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.width; const margin = 15; let yPosition = 20; const logoImg = new Image(); logoImg.crossOrigin = 'anonymous'; logoImg.onload = function() { const logoWidth = 30; const aspectRatio = this.naturalHeight / this.naturalWidth; const logoHeight = logoWidth * aspectRatio; const logoX = (pageWidth - logoWidth) / 2; doc.addImage(this, 'PNG', logoX, yPosition, logoWidth, logoHeight); yPosition += logoHeight + 5; continuarGeracaoPDF(doc, pageWidth, margin, yPosition); }; logoImg.onerror = () => { yPosition += 10; continuarGeracaoPDF(doc, pageWidth, margin, yPosition); }; logoImg.src = 'https://i.imgur.com/zerV906.png'; }

function continuarGeracaoPDF(doc, pageWidth, margin, yPosition) {
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80); doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' }); yPosition += 15; const infoStartY = yPosition; let leftY = infoStartY; let rightY = infoStartY; const halfWidth = pageWidth / 2; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80); doc.text('DADOS DA EMPRESA', margin, leftY); leftY += 5; doc.setLineWidth(0.2); doc.line(margin, leftY, halfWidth - margin / 2, leftY); leftY += 8; doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'bold'); doc.text(document.querySelector('input[value="Fenix Fardamentos LTDA"]').value, margin, leftY); leftY += 6; doc.setFont('helvetica', 'normal'); doc.text(`CNPJ: ${document.querySelector('input[value="12.000.234/0001-18"]').value}`, margin, leftY); leftY += 5; doc.text(document.querySelector('input[value="Rua Pinheiro, 65 - Cidade Universitária"]').value, margin, leftY); leftY += 5; doc.text(`Telefone: ${document.querySelector('input[value="(82) 98814-4752"]').value}`, margin, leftY); leftY += 5; doc.text(`E-mail: ${document.querySelector('input[value="fenixfardamentos.al@gmail.com"]').value}`, margin, leftY); leftY += 5; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80); doc.text('DADOS DO CLIENTE', halfWidth, rightY); rightY += 5; doc.line(halfWidth, rightY, pageWidth - margin, rightY); rightY += 8; doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'bold'); doc.text(document.getElementById('clienteNome').value.trim(), halfWidth, rightY); rightY += 6; doc.setFont('helvetica', 'normal'); const clienteEmail = document.getElementById('clienteEmail').value.trim(); if (clienteEmail) { doc.text(`E-mail: ${clienteEmail}`, halfWidth, rightY); rightY += 5; } const clienteTelefone = document.getElementById('clienteTelefone').value.trim(); if (clienteTelefone) { doc.text(`Telefone: ${clienteTelefone}`, halfWidth, rightY); rightY += 5; } const clienteCnpjCpf = document.getElementById('clienteCnpjCpf').value.trim(); if (clienteCnpjCpf) { doc.text(`CPF/CNPJ: ${clienteCnpjCpf}`, halfWidth, rightY); rightY += 5; }
    yPosition = Math.max(leftY, rightY) + 15;
    const tableData = itensOrcamento.map((item, index) => [ index + 1, item.descricao, item.quantidade, formatarMoeda(item.valorUnitario), formatarMoeda(item.valorTotal) ]); doc.autoTable({ head: [['#', 'Descrição', 'Qtd', 'V. Unitário', 'Total']], body: tableData, startY: yPosition, theme: 'grid', headStyles: { fillColor: [255, 107, 53], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' }, columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 15 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 } }, });
    yPosition = doc.previousAutoTable.finalY + 10;
    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.valorTotal, 0); const descontoText = document.getElementById('desconto-valor-display').textContent; const totalGeralText = document.getElementById('total-geral-valor').textContent; const totalBoxX = pageWidth / 2; doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.text(`Subtotal:`, totalBoxX, yPosition, { align: 'left' }); doc.text(formatarMoeda(subtotal), pageWidth - margin, yPosition, { align: 'right' }); yPosition += 7; doc.text(`Desconto:`, totalBoxX, yPosition, { align: 'left' }); doc.text(descontoText, pageWidth - margin, yPosition, { align: 'right' }); yPosition += 7; doc.setLineWidth(0.3); doc.setDrawColor(150, 150, 150); doc.line(totalBoxX, yPosition, pageWidth - margin, yPosition); yPosition += 8; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80); doc.text('TOTAL GERAL:', totalBoxX, yPosition, { align: 'left' }); doc.text(totalGeralText, pageWidth - margin, yPosition, { align: 'right' });
    
    // Inclusão do campo de Observações no PDF
    const observacoes = document.getElementById('observacoes').value.trim();
    if (observacoes) {
        yPosition += 15;
        const obsLines = doc.splitTextToSize(observacoes, pageWidth - margin * 2);
        if (yPosition + (obsLines.length * 5) + 15 > doc.internal.pageSize.height - 20) { doc.addPage(); yPosition = 20; }
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80);
        doc.text('OBSERVAÇÕES', margin, yPosition);
        yPosition += 8;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
        doc.text(obsLines, margin, yPosition);
    }

    const dataAtual = new Date().toLocaleDateString('pt-BR'); for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) { doc.setPage(i); const pageHeight = doc.internal.pageSize.height; doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.text(`Emitido em: ${dataAtual}`, margin, pageHeight - 10); doc.text(`Página ${i} de ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' }); }

    pdfGerado = doc;
    document.getElementById('shareModal').style.display = 'flex';
}

function fecharModal() { document.getElementById('shareModal').style.display = 'none'; }
function baixarPDF() { if (pdfGerado) { pdfGerado.save(`Orcamento_${dadosOrcamento.clienteNome.replace(/\s+/g, '_')}.pdf`); } }
function encaminharWhatsApp() { const telefoneCliente = document.getElementById('clienteTelefone').value; if (!telefoneCliente) { alert('O campo de telefone do cliente está vazio.'); return; } const numeroLimpo = '55' + telefoneCliente.replace(/\D/g, ''); const totalGeralText = document.getElementById('total-geral-valor').textContent; const mensagem = `Olá, ${dadosOrcamento.clienteNome}! Segue o seu orçamento no valor de ${totalGeralText}. Para mais detalhes, consulte o PDF.`; const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`; window.open(url, '_blank'); }

// --- INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // LÓGICA DE LOGIN
    const loginForm = document.getElementById('login-form'); const errorMessage = document.getElementById('error-message'); if (loginForm) { loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const username = document.getElementById('username').value; const password = document.getElementById('password-login').value; errorMessage.textContent = ''; try { const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); if (response.ok) { showApp(); } else { const data = await response.json(); errorMessage.textContent = data.error || 'Credenciais inválidas.'; } } catch (error) { errorMessage.textContent = 'Erro de conexão. Tente novamente.'; } }); }
    // CONECTANDO EVENTOS AOS ELEMENTOS
    const selectCliente = document.getElementById('clienteExistente'); if (selectCliente) { selectCliente.addEventListener('change', selecionarCliente); }
    const btnSalvar = document.getElementById('btnSalvarCliente'); if (btnSalvar) { btnSalvar.addEventListener('click', salvarCliente); }
    const inputCnpjCpf = document.getElementById('clienteCnpjCpf'); if (inputCnpjCpf) { inputCnpjCpf.addEventListener('input', (e) => formatarCnpjCpf(e.target)); }
    const inputTelefone = document.getElementById('clienteTelefone'); if (inputTelefone) { inputTelefone.addEventListener('input', (e) => formatarTelefone(e.target)); }
    const inputValorUnitario = document.getElementById('itemValorUnitario'); if (inputValorUnitario) { inputValorUnitario.addEventListener('input', (e) => formatarCampoMoeda(e.target)); }
    const btnAdicionarItem = document.getElementById('btnAdicionarItem'); if (btnAdicionarItem) { btnAdicionarItem.addEventListener('click', adicionarItem); }
    const itensContainer = document.getElementById('itensContainer'); if (itensContainer) { itensContainer.addEventListener('click', (e) => { if (e.target && e.target.classList.contains('btn-remover-item')) { const itemId = parseInt(e.target.dataset.id, 10); removerItem(itemId); } }); }
    
    // CONECTANDO EVENTO AO HISTÓRICO
    const historicoContainer = document.getElementById('historico-container');
    if (historicoContainer) {
        historicoContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-visualizar-orcamento')) {
                const orcamentoId = e.target.dataset.id;
                visualizarOrcamento(orcamentoId);
            }
        });
    }

    const btnGerarPDF = document.getElementById('btnGerarPDF'); if (btnGerarPDF) { btnGerarPDF.addEventListener('click', gerarPDF); }
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento'); if (btnSalvarOrcamento) { btnSalvarOrcamento.addEventListener('click', salvarOrcamento); }
    const btnBaixarPDF = document.getElementById('btnBaixarPDF'); if (btnBaixarPDF) { btnBaixarPDF.addEventListener('click', baixarPDF); }
    const btnWhatsapp = document.getElementById('btnWhatsapp'); if (btnWhatsapp) { btnWhatsapp.addEventListener('click', encaminharWhatsApp); }
    const btnCloseModal = document.getElementById('btnCloseModal'); if (btnCloseModal) { btnCloseModal.addEventListener('click', fecharModal); }
    // INICIA A VERIFICAÇÃO
    checkLoginStatus();
});
