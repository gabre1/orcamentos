document.addEventListener('DOMContentLoaded', () => {
    // Variáveis globais da aplicação
    let itens = [];
    let contadorItens = 0;
    let clientesCache = [];
    let pdfGerado = null;
    let dadosOrcamento = null;
    let clienteSelecionadoId = null;

    // --- ELEMENTOS DO DOM ---
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const clienteExistenteSelect = document.getElementById('clienteExistente');
    const clienteNomeInput = document.getElementById('clienteNome');
    const clienteCnpjCpfInput = document.getElementById('clienteCnpjCpf');
    const clienteEmailInput = document.getElementById('clienteEmail');
    const clienteTelefoneInput = document.getElementById('clienteTelefone');
    const itemValorUnitarioInput = document.getElementById('itemValorUnitario');
    const historicoSection = document.getElementById('historico-section');
    const historicoContainer = document.getElementById('historico-container');

    // --- FUNÇÕES DE AUTENTICAÇÃO E INICIALIZAÇÃO ---
    function checkLoginStatus() {
        if (document.cookie.includes('app_session=valid')) {
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            document.body.style.alignItems = 'flex-start';
            carregarClientes();
            atualizarTabelaItens();
        } else {
            loginContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            document.body.style.alignItems = 'center';
        }
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password-login').value; // ID corrigido
        errorMessage.textContent = '';

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                checkLoginStatus();
            } else {
                const data = await response.json();
                errorMessage.textContent = data.error || 'Credenciais inválidas.';
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão. Tente novamente.';
        }
    });

    // --- FUNÇÕES DO BACKEND (API) ---
    async function carregarClientes() {
        clienteExistenteSelect.innerHTML = '<option value="">-- Carregando... --</option>';
        try {
            const response = await fetch('/api/clientes');
            if (!response.ok) throw new Error(`Falha na rede: ${response.statusText}`);
            const clientes = await response.json();
            clientesCache = clientes;
            clienteExistenteSelect.innerHTML = '<option value="">-- Novo Cliente --</option>';
            clientes.forEach(cliente => {
                const option = new Option(`${cliente.codigo_cliente} - ${cliente.nome}`, cliente.id);
                clienteExistenteSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            clienteExistenteSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }
    
    async function selecionarCliente() {
        clienteSelecionadoId = clienteExistenteSelect.value;
        preencherCliente();
        if (clienteSelecionadoId) {
            await carregarHistoricoOrcamentos(clienteSelecionadoId);
            historicoSection.style.display = 'block';
        } else {
            historicoSection.style.display = 'none';
            historicoContainer.innerHTML = '';
        }
    }

    async function carregarHistoricoOrcamentos(clienteId) {
        historicoContainer.innerHTML = '<p>Carregando histórico...</p>';
        try {
            const response = await fetch(`/api/orcamentos?cliente_id=${clienteId}`);
            if (!response.ok) throw new Error('Falha ao buscar histórico');
            const orcamentos = await response.json();

            if (orcamentos.length === 0) {
                historicoContainer.innerHTML = '<p>Nenhum orçamento salvo para este cliente.</p>';
                return;
            }

            let html = '<ul>';
            orcamentos.forEach(o => {
                const data = new Date(o.data_criacao).toLocaleDateString('pt-BR');
                html += `<li>Orçamento #${String(o.codigo_orcamento).padStart(4, '0')} - ${data} - ${formatarMoeda(parseFloat(o.valor_total))}</li>`;
            });
            html += '</ul>';
            historicoContainer.innerHTML = html;

        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            historicoContainer.innerHTML = '<p>Erro ao carregar histórico.</p>';
        }
    }

    function preencherCliente() {
        const clienteId = clienteExistenteSelect.value;
        const cliente = clientesCache.find(c => c.id == clienteId);
        clienteNomeInput.value = cliente ? cliente.nome : '';
        clienteEmailInput.value = cliente ? cliente.email : '';
        clienteTelefoneInput.value = cliente ? cliente.telefone : '';
        if (cliente && cliente.telefone) formatarTelefone(clienteTelefoneInput);
        clienteCnpjCpfInput.value = cliente ? cliente.cnpj_cpf : '';
        if (cliente && cliente.cnpj_cpf) formatarCnpjCpf(clienteCnpjCpfInput);
    }

    async function salvarCliente() {
        const nome = clienteNomeInput.value.trim();
        const cnpj_cpf = clienteCnpjCpfInput.value.trim();
        if (!nome) { alert('O nome do cliente é obrigatório para salvar.'); return; }
        const docLimpo = cnpj_cpf.replace(/\D/g, '');
        if (docLimpo.length > 0) {
            if (docLimpo.length === 11 && !validarCPF(docLimpo)) { alert('CPF inválido.'); return; }
            else if (docLimpo.length === 14 && !validarCNPJ(docLimpo)) { alert('CNPJ inválido.'); return; }
            else if (docLimpo.length !== 11 && docLimpo.length !== 14) { alert('CPF/CNPJ com número de dígitos incorreto.'); return; }
        }
        if (clientesCache.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
            alert('Um cliente com este nome já existe.');
            return;
        }
        const email = clienteEmailInput.value.trim();
        const telefone = clienteTelefoneInput.value.trim();
        try {
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, telefone, cnpj_cpf })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Erro do servidor');
            alert(`Cliente "${nome}" salvo com sucesso!`);
            carregarClientes();
        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            alert(`Ocorreu um erro ao salvar: ${error.message}`);
        }
    }

    async function salvarOrcamento() {
        if (!clienteSelecionadoId) {
            alert('Por favor, selecione um cliente ou salve o novo cliente antes de salvar o orçamento.');
            return;
        }
        if (itens.length === 0) {
            alert('Adicione pelo menos um item ao orçamento.');
            return;
        }
        const subtotal = itens.reduce((acc, item) => acc + item.valorTotal, 0);
        const descontoEl = document.getElementById('descontoValor');
        const desconto = descontoEl ? parseCurrency(descontoEl.value) : 0;
        const valorTotal = subtotal - desconto;
        
        try {
            const response = await fetch('/api/orcamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_id: clienteSelecionadoId,
                    valor_total: valorTotal,
                    itens: itens
                })
            });
            if (!response.ok) throw new Error((await response.json()).error);
            const result = await response.json();
            alert(`Orçamento #${String(result.codigo_orcamento).padStart(4, '0')} salvo com sucesso!`);
            carregarHistoricoOrcamentos(clienteSelecionadoId);
        } catch (error) {
            console.error("Erro ao salvar orçamento:", error);
            alert(`Erro ao salvar orçamento: ${error.message}`);
        }
    }
    
    // --- FUNÇÕES DE VALIDAÇÃO E FORMATAÇÃO ---
    function formatarTelefone(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 10) { value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3'); } 
        else if (value.length > 2) { value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3'); } 
        else if (value.length > 0) { value = `(${value}`; }
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

    function validarCPF(cpf){cpf=cpf.replace(/\D/g,"");if(11!==cpf.length||/^(\d)\1+$/.test(cpf))return!1;let t,e=0;for(t=1;t<=9;t++)e+=parseInt(cpf.substring(t-1,t))*(11-t);if(e=10*(e=10*e%11)%11,10!==e&&11!==e||(e=0),e!==parseInt(cpf.substring(9,10)))return!1;for(e=0,t=1;t<=10;t++)e+=parseInt(cpf.substring(t-1,t))*(12-t);return e=10*(e=10*e%11)%11,10!==e&&11!==e||(e=0),e===parseInt(cpf.substring(10,11))}
    function validarCNPJ(cnpj){cnpj=cnpj.replace(/\D/g,"");if(14!==cnpj.length||/^(\d)\1+$/.test(cnpj))return!1;let t=cnpj.length-2,e=cnpj.substring(0,t),n=cnpj.substring(t),r=0,o=t-7;for(let a=t;a>=1;a--)r+=e.charAt(t-a)*o--,o<2&&(o=9);let a=r%11<2?0:11-r%11;if(a!=n.charAt(0))return!1;for(t+=1,e=cnpj.substring(0,t),r=0,o=t-7,a=t;a>=1;a--)r+=e.charAt(t-a)*o--,o<2&&(o=9);return a=r%11<2?0:11-r%11,a==n.charAt(1)}
    
    function formatarCampoMoeda(input) {
        let valor = input.value.replace(/\D/g, '');
        if (valor === '') { input.value = ''; return; }
        valor = (parseInt(valor, 10) / 100).toFixed(2) + '';
        valor = valor.replace('.', ',');
        valor = valor.replace(/(\d)(?=(\d{3})+(?!\d),)/g, '$1.');
        input.value = valor;
    }

    // --- FUNÇÕES DO GERADOR (ITENS, TOTAIS, PDF) ---
    function parseCurrency(value) {
        if (!value) return 0;
        return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0;
    }

    function adicionarItem() {
        const descricao = document.getElementById('itemDescricao').value.trim();
        const quantidade = parseInt(document.getElementById('itemQuantidade').value);
        const valorUnitario = parseCurrency(document.getElementById('itemValorUnitario').value);
        if (!descricao || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
            alert('Por favor, preencha todos os campos do item com valores válidos.');
            return;
        }
        const item = { id: ++contadorItens, descricao, quantidade, valorUnitario, valorTotal: quantidade * valorUnitario };
        itens.push(item);
        atualizarTabelaItens();
        limparFormularioItem();
    }

    function removerItem(id) {
        itens = itens.filter(item => item.id !== id);
        atualizarTabelaItens();
    }

    function limparFormularioItem() {
        document.getElementById('itemDescricao').value = '';
        document.getElementById('itemQuantidade').value = '1';
        document.getElementById('itemValorUnitario').value = '';
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function atualizarTabelaItens() {
        const container = document.getElementById('itensContainer');
        if (itens.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>Nenhum item adicionado</h3></div>`;
        } else {
             container.innerHTML = `
                <table class="items-table">
                    <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${itens.map(item => `
                            <tr>
                                <td>${item.descricao}</td>
                                <td>${item.quantidade}</td>
                                <td>${formatarMoeda(item.valorUnitario)}</td>
                                <td>${formatarMoeda(item.valorTotal)}</td>
                                <td><button class="btn btn-danger btn-remover-item" data-id="${item.id}">🗑️</button></td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        }
        renderizarOuAtualizarTotais();
    }
    
    document.getElementById('itensContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-item')) {
            const itemId = parseInt(e.target.dataset.id, 10);
            removerItem(itemId);
        }
    });

    function renderizarOuAtualizarTotais() {
        const totaisContainer = document.getElementById('totaisContainer');
        if (itens.length === 0) {
            totaisContainer.innerHTML = '';
            return;
        }
        if (!document.getElementById('total-section-id')) {
             totaisContainer.innerHTML = `
                <div class="total-section" id="total-section-id">
                    <div class="form-grid" style="margin-bottom: 20px; text-align: left;">
                        <div class="form-group">
                            <label for="descontoValor" style="color: white;">Desconto (R$)</label>
                            <input type="text" id="descontoValor" placeholder="0,00" style="padding: 12px 15px; border-radius: 10px; border: none; font-size: 1rem;">
                        </div>
                    </div>
                    <p style="font-size: 1rem;">Subtotal: <span id="subtotal-valor"></span></p>
                    <p style="font-size: 1rem; margin-bottom: 10px;">Desconto: <span id="desconto-valor-display"></span></p>
                    <h3>Total Geral</h3>
                    <p id="total-geral-valor"></p>
                </div>`;
            document.getElementById('descontoValor').addEventListener('input', (e) => handleDescontoInput(e.target));
        }
        atualizarValoresTotais();
    }

    function handleDescontoInput(input) {
        formatarCampoMoeda(input);
        atualizarValoresTotais();
    }
    
    function atualizarValoresTotais() {
        if (itens.length === 0) return;
        const subtotal = itens.reduce((acc, item) => acc + item.valorTotal, 0);
        const descontoEl = document.getElementById('descontoValor');
        const desconto = descontoEl ? parseCurrency(descontoEl.value) : 0;
        const totalGeral = subtotal - desconto;
        
        document.getElementById('subtotal-valor').textContent = formatarMoeda(subtotal);
        document.getElementById('desconto-valor-display').textContent = `- ${formatarMoeda(desconto)}`;
        document.getElementById('total-geral-valor').textContent = formatarMoeda(totalGeral);
    }

    function gerarPDF() {
        const clienteNome = clienteNomeInput.value.trim();
        if (!clienteNome || itens.length === 0) {
            alert('Preencha o nome do cliente e adicione pelo menos um item.');
            return;
        }
        dadosOrcamento = { clienteNome, totalGeral: itens.reduce((t, e) => t + e.valorTotal, 0) };
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
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text('ORÇAMENTO', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;
        const infoStartY = yPosition;
        let leftY = infoStartY;
        let rightY = infoStartY;
        const halfWidth = pageWidth / 2;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text('DADOS DA EMPRESA', margin, leftY);
        leftY += 5;
        doc.setLineWidth(0.2);
        doc.line(margin, leftY, halfWidth - margin / 2, leftY);
        leftY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'bold');
        doc.text(document.querySelector('input[value="Fenix Fardamentos LTDA"]').value, margin, leftY);
        leftY += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`CNPJ: ${document.querySelector('input[value="12.000.234/0001-18"]').value}`, margin, leftY); leftY += 5;
        doc.text(document.querySelector('input[value="Rua Pinheiro, 65 - Cidade Universitária"]').value, margin, leftY); leftY += 5;
        doc.text(`Telefone: ${document.querySelector('input[value="(82) 98814-4752"]').value}`, margin, leftY); leftY += 5;
        doc.text(`E-mail: ${document.querySelector('input[value="fenixfardamentos.al@gmail.com"]').value}`, margin, leftY); leftY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text('DADOS DO CLIENTE', halfWidth, rightY);
        rightY += 5;
        doc.line(halfWidth, rightY, pageWidth - margin, rightY);
        rightY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'bold');
        doc.text(document.getElementById('clienteNome').value.trim(), halfWidth, rightY);
        rightY += 6;
        doc.setFont('helvetica', 'normal');
        const clienteEmail = document.getElementById('clienteEmail').value.trim();
        if (clienteEmail) { doc.text(`E-mail: ${clienteEmail}`, halfWidth, rightY); rightY += 5; }
        const clienteTelefone = document.getElementById('clienteTelefone').value.trim();
        if (clienteTelefone) { doc.text(`Telefone: ${clienteTelefone}`, halfWidth, rightY); rightY += 5; }
        const clienteCnpjCpf = document.getElementById('clienteCnpjCpf').value.trim();
        if (clienteCnpjCpf) { doc.text(`CPF/CNPJ: ${clienteCnpjCpf}`, halfWidth, rightY); rightY += 5; }
        yPosition = Math.max(leftY, rightY) + 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 107, 53);
        doc.text('ITENS DO ORÇAMENTO:', margin, yPosition);
        yPosition += 12;
        const tableData = itens.map((item, index) => [
            index + 1, item.descricao, item.quantidade, formatarMoeda(item.valorUnitario), formatarMoeda(item.valorTotal)
        ]);
        doc.autoTable({
            head: [['#', 'Descrição', 'Qtd', 'V. Unitário', 'Total']],
            body: tableData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { fillColor: [255, 107, 53], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 15 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 } },
            didDrawPage: (data) => { yPosition = data.cursor.y; }
        });
        yPosition = doc.previousAutoTable.finalY;
        const subtotal = dadosOrcamento.totalGeral;
        const descontoEl = document.getElementById('descontoValor');
        const desconto = descontoEl ? parseCurrency(descontoEl.value) : 0;
        const totalFinal = subtotal - desconto;
        yPosition += 10;
        const totalBoxX = pageWidth / 2;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Subtotal:', totalBoxX, yPosition, { align: 'left' });
        doc.text(formatarMoeda(subtotal), pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 7;
        doc.text('Desconto:', totalBoxX, yPosition, { align: 'left' });
        doc.text(`- ${formatarMoeda(desconto)}`, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 7;
        doc.setLineWidth(0.3);
        doc.setDrawColor(150, 150, 150);
        doc.line(totalBoxX, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text('TOTAL GERAL:', totalBoxX, yPosition, { align: 'left' });
        doc.text(formatarMoeda(totalFinal), pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 15;
        const observacoes = document.getElementById('observacoes').value.trim();
        if (observacoes) {
            const pageHeight = doc.internal.pageSize.height;
            const footerHeight = 25;
            const obsLines = doc.splitTextToSize(observacoes, pageWidth - margin * 2);
            if (yPosition + (obsLines.length * 5) + 15 > pageHeight - footerHeight) {
                doc.addPage();
                yPosition = 20;
            }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text('OBSERVAÇÕES', margin, yPosition);
            yPosition += 5;
            doc.setLineWidth(0.2);
            doc.line(margin, yPosition, 60, yPosition);
            yPosition += 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(obsLines, margin, yPosition);
        }
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            const pageHeight = doc.internal.pageSize.height;
            const footerY = pageHeight - 15;
            doc.setLineWidth(0.3);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, footerY, pageWidth - margin, footerY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text(`Emitido em: ${dataFormatada}`, margin, footerY + 5);
            doc.text('Este orçamento tem validade de 30 dias.', pageWidth / 2, footerY + 5, { align: 'center' });
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, footerY + 5, { align: 'right' });
        }
        pdfGerado = doc;
        document.getElementById('shareModal').style.display = 'flex';
    }

    function encaminharWhatsApp() {
        const telefoneCliente = clienteTelefoneInput.value;
        if (!telefoneCliente) {
            alert('O campo de telefone do cliente está vazio.');
            return;
        }
        baixarPDF();
        const numeroLimpo = '55' + telefoneCliente.replace(/\D/g, '');
        const mensagem = "Segue o orçamento solicitado.";
        const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
    }

    function fecharModal() { document.getElementById('shareModal').style.display = 'none'; }
    
    function baixarPDF() {
        if (pdfGerado) {
            pdfGerado.save(`Orcamento_${dadosOrcamento.clienteNome.replace(/\s+/g, '_')}.pdf`);
        }
    }
    
    // --- EVENT LISTENERS ---
    clienteExistenteSelect.addEventListener('change', selecionarCliente);
    clienteCnpjCpfInput.addEventListener('input', (e) => formatarCnpjCpf(e.target));
    clienteTelefoneInput.addEventListener('input', (e) => formatarTelefone(e.target));
    itemValorUnitarioInput.addEventListener('input', (e) => formatarCampoMoeda(e.target));
    document.getElementById('btnSalvarCliente').addEventListener('click', salvarCliente);
    document.getElementById('btnAdicionarItem').addEventListener('click', adicionarItem);
    document.getElementById('btnGerarPDF').addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarOrcamento').addEventListener('click', salvarOrcamento);
    document.getElementById('btnBaixarPDF').addEventListener('click', baixarPDF);
    document.getElementById('btnWhatsapp').addEventListener('click', encaminharWhatsApp);
    document.getElementById('btnCloseModal').addEventListener('click', fecharModal);

    // --- INICIALIZAÇÃO ---
    checkLoginStatus();
});
