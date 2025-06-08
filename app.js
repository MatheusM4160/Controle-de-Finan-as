// Dados iniciais da aplicação
const dadosIniciais = {
    transactions: [],
    customBanks: [],
    investments: []
};

// Lista de bancos predefinidos
const bancosPredefinidos = ["Banco do Brasil", "Caixa", "Itaú", "Nubank", "Inter", "Santander", "Bradesco", "Outro"];

// Tipos de transações com cores
const tiposTransacao = [
    {value: "receita", label: "💰 Receita", color: "#4CAF50"},
    {value: "gasto", label: "💸 Gasto", color: "#F44336"},
    {value: "transferencia", label: "💱 Transferência", color: "#2196F3"},
    {value: "investimento", label: "📈 Investimento", color: "#9C27B0"}
];

// Estado da aplicação
let appData = {
    transactions: [],
    customBanks: [],
    investments: []
};

// Elementos DOM
let elements = {};

// Variáveis dos gráficos
let typeChart, bankChart, portfolioChart;

// Debounce para redimensionamento - CORREÇÃO CRÍTICA
let resizeTimeout;
let chartUpdateTimeout;
const RESIZE_DEBOUNCE_DELAY = 250;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initApp();
    setupEventListeners();
    loadData();
    updateUI();
});

// Inicializar elementos DOM
function initializeElements() {
    elements = {
        tabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        transactionForm: document.getElementById('transactionForm'),
        chatMessages: document.getElementById('chatMessages'),
        typeSelect: document.getElementById('type'),
        bankSelect: document.getElementById('bank'),
        bankToSelect: document.getElementById('bankTo'),
        customBankGroup: document.getElementById('customBankGroup'),
        customBankInput: document.getElementById('customBank'),
        transferFields: document.getElementById('transferFields'),
        investmentFields: document.getElementById('investmentFields'),
        totalReceitas: document.getElementById('totalReceitas'),
        totalGastos: document.getElementById('totalGastos'),
        totalTransferencias: document.getElementById('totalTransferencias'),
        totalInvestimentos: document.getElementById('totalInvestimentos'),
        saldoAtual: document.getElementById('saldoAtual'),
        exportBtn: document.getElementById('exportBtn'),
        exportAllBtn: document.getElementById('exportAllBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        clearDataBtn: document.getElementById('clearDataBtn'),
        investmentForm: document.getElementById('investmentForm'),
        investmentsList: document.getElementById('investmentsList'),
        totalInvestido: document.getElementById('totalInvestido'),
        valorAtualTotal: document.getElementById('valorAtualTotal'),
        rendimentoTotal: document.getElementById('rendimentoTotal')
    };
}

// Inicialização da aplicação
function initApp() {
    populateBankSelects();
    
    // Configurar os gráficos com delay para garantir DOM carregado
    setTimeout(() => {
        setupCharts();
    }, 100);
}

// Configuração de Event Listeners
function setupEventListeners() {
    // Navegação entre abas
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
            
            // Atualiza os gráficos ao trocar para a aba de relatórios
            if (tabId === 'relatorios') {
                setTimeout(() => {
                    updateCharts();
                }, 100);
            }
            
            // Atualiza a lista de investimentos e gráfico ao trocar para a aba de investimentos
            if (tabId === 'investimentos') {
                setTimeout(() => {
                    updateInvestmentsList();
                    updateInvestmentSummary();
                    safeUpdatePortfolioChart();
                }, 100);
            }
        });
    });

    // Formulário de transação
    if (elements.transactionForm) {
        elements.transactionForm.addEventListener('submit', handleTransactionSubmit);
    }
    
    // Alteração no tipo de transação
    if (elements.typeSelect) {
        elements.typeSelect.addEventListener('change', handleTransactionTypeChange);
    }
    
    // Alteração no banco selecionado
    if (elements.bankSelect) {
        elements.bankSelect.addEventListener('change', handleBankChange);
    }
    
    // Formatação de valores
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', formatCurrency);
    }
    
    const currentValueInput = document.getElementById('currentValue');
    if (currentValueInput) {
        currentValueInput.addEventListener('input', formatCurrency);
    }
    
    // Formulário de investimentos
    if (elements.investmentForm) {
        elements.investmentForm.addEventListener('submit', handleInvestmentSubmit);
    }
    
    // Formatação para inputs de investimento
    const investmentInitialInput = document.getElementById('investmentInitial');
    if (investmentInitialInput) {
        investmentInitialInput.addEventListener('input', formatCurrency);
    }
    
    const investmentCurrentInput = document.getElementById('investmentCurrent');
    if (investmentCurrentInput) {
        investmentCurrentInput.addEventListener('input', formatCurrency);
    }
    
    // Exportação de dados
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportTransactionsCSV);
    }
    
    if (elements.exportAllBtn) {
        elements.exportAllBtn.addEventListener('click', exportAllDataCSV);
    }
    
    // Importação de dados
    if (elements.importFile) {
        elements.importFile.addEventListener('change', handleFileSelect);
    }
    
    if (elements.importBtn) {
        elements.importBtn.addEventListener('click', importCSV);
    }
    
    // Limpar dados
    if (elements.clearDataBtn) {
        elements.clearDataBtn.addEventListener('click', clearAllData);
    }

    // CORREÇÃO CRÍTICA: Event listener para redimensionamento com debounce
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            try {
                if (portfolioChart && portfolioChart.canvas) {
                    portfolioChart.resize();
                }
                if (typeChart && typeChart.canvas) {
                    typeChart.resize();
                }
                if (bankChart && bankChart.canvas) {
                    bankChart.resize();
                }
            } catch (error) {
                console.warn('Erro no redimensionamento dos gráficos:', error);
            }
        }, RESIZE_DEBOUNCE_DELAY);
    });
}

// Mudar para tab específica
function switchTab(tabId) {
    elements.tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });
    
    elements.tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });
}

// Preencher selects de bancos
function populateBankSelects() {
    const allBanks = [...bancosPredefinidos, ...appData.customBanks].filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
    
    // Limpar selects
    if (elements.bankSelect) {
        elements.bankSelect.innerHTML = '<option value="">Selecione</option>';
    }
    if (elements.bankToSelect) {
        elements.bankToSelect.innerHTML = '<option value="">Selecione</option>';
    }
    
    // Preencher selects
    allBanks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank;
        option.textContent = bank;
        
        if (elements.bankSelect) {
            elements.bankSelect.appendChild(option.cloneNode(true));
        }
        if (elements.bankToSelect) {
            elements.bankToSelect.appendChild(option.cloneNode(true));
        }
    });
}

// Formatar valores para moeda brasileira
function formatCurrency(e) {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d)(\d{2})$/, '$1,$2');
    value = value.replace(/(?=(\d{3})+(\D))\B/g, '.');
    
    e.target.value = value;
    return value;
}

// Converter string formatada para número
function currencyToNumber(currency) {
    if (!currency) return 0;
    return parseFloat(currency.replace(/\./g, '').replace(',', '.'));
}

// Formatar número para moeda brasileira
function formatNumberToCurrency(number) {
    return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });
}

// Lidar com mudança no tipo de transação
function handleTransactionTypeChange() {
    const transactionType = elements.typeSelect.value;
    
    // Mostrar/esconder campos de transferência
    if (transactionType === 'transferencia') {
        elements.transferFields.classList.remove('hidden');
    } else {
        elements.transferFields.classList.add('hidden');
    }
    
    // Mostrar/esconder campos de investimento
    if (transactionType === 'investimento') {
        elements.investmentFields.classList.remove('hidden');
    } else {
        elements.investmentFields.classList.add('hidden');
    }
}

// Lidar com mudança no banco selecionado
function handleBankChange() {
    const selectedBank = elements.bankSelect.value;
    
    if (selectedBank === 'Outro') {
        elements.customBankGroup.classList.remove('hidden');
        elements.customBankInput.setAttribute('required', 'required');
    } else {
        elements.customBankGroup.classList.add('hidden');
        elements.customBankInput.removeAttribute('required');
    }
}

// Lidar com envio do formulário de transação
function handleTransactionSubmit(e) {
    e.preventDefault();
    
    try {
        // Obter valores do formulário
        const type = elements.typeSelect.value;
        const amountInput = document.getElementById('amount');
        const description = document.getElementById('description').value;
        let bank = elements.bankSelect.value;
        
        // Validações básicas
        if (!type || !amountInput.value || !description || !bank) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        // Verificar banco personalizado
        if (bank === 'Outro') {
            bank = elements.customBankInput.value.trim();
            if (!bank) {
                alert('Por favor, informe o nome do banco.');
                return;
            }
            
            // Adicionar banco personalizado se não existir
            if (!appData.customBanks.includes(bank)) {
                appData.customBanks.push(bank);
                populateBankSelects();
            }
        }
        
        // Obter dados adicionais conforme o tipo
        let bankTo = null;
        let currentValue = null;
        
        if (type === 'transferencia') {
            bankTo = elements.bankToSelect.value;
            if (!bankTo) {
                alert('Por favor, selecione o banco de destino para transferências.');
                return;
            }
        }
        
        if (type === 'investimento') {
            const currentValueInput = document.getElementById('currentValue');
            if (currentValueInput.value) {
                currentValue = currencyToNumber(currentValueInput.value);
            }
        }
        
        // Criar transação
        const transaction = {
            id: Date.now().toString(),
            type,
            amount: currencyToNumber(amountInput.value),
            description,
            bank,
            bankTo,
            currentValue,
            timestamp: new Date().toISOString()
        };
        
        // Adicionar transação
        appData.transactions.push(transaction);
        
        // Se for investimento, adicionar também na lista de investimentos
        if (type === 'investimento') {
            const investment = {
                id: transaction.id,
                description,
                initialValue: transaction.amount,
                currentValue: currentValue || transaction.amount,
                bank
            };
            appData.investments.push(investment);
        }
        
        // Salvar dados, atualizar UI e limpar formulário
        saveData();
        addMessageToChat(transaction);
        updateStatistics();
        updateCharts();
        updateFinancialTips();
        
        // Limpar formulário
        elements.transactionForm.reset();
        elements.customBankGroup.classList.add('hidden');
        elements.transferFields.classList.add('hidden');
        elements.investmentFields.classList.add('hidden');
    } catch (error) {
        console.error('Erro ao processar transação:', error);
        alert('Erro ao processar transação. Tente novamente.');
    }
}

// Adicionar mensagem ao chat
function addMessageToChat(transaction) {
    // Remover estado vazio se for a primeira mensagem
    if (appData.transactions.length === 1) {
        elements.chatMessages.innerHTML = '';
    }
    
    // Criar elemento de mensagem
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', transaction.type);
    
    // Formatar timestamp para exibição
    const date = new Date(transaction.timestamp);
    const formattedDate = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
    
    // Preparar conteúdo da mensagem
    let content = `
        <div class="message-content">
            <div class="message-amount">${formatNumberToCurrency(transaction.amount)}</div>
            <div class="message-description">${transaction.description}</div>
            <div class="message-bank">Banco: ${transaction.bank}</div>
    `;
    
    // Adicionar banco destino para transferências
    if (transaction.type === 'transferencia' && transaction.bankTo) {
        content += `<div class="message-bank">Para: ${transaction.bankTo}</div>`;
    }
    
    // Adicionar valor atual para investimentos
    if (transaction.type === 'investimento' && transaction.currentValue) {
        content += `<div class="message-bank">Valor Atual: ${formatNumberToCurrency(transaction.currentValue)}</div>`;
    }
    
    // Adicionar timestamp
    content += `<div class="message-timestamp">${formattedDate}</div>`;
    content += `</div>`;
    
    messageEl.innerHTML = content;
    elements.chatMessages.appendChild(messageEl);
    
    // Scrollar para a mensagem mais recente
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Atualizar estatísticas
function updateStatistics() {
    const totals = {
        receita: 0,
        gasto: 0,
        transferencia: 0,
        investimento: 0
    };
    
    // Calcular totais por tipo
    appData.transactions.forEach(transaction => {
        totals[transaction.type] += transaction.amount;
    });
    
    // Calcular saldo (receitas - gastos)
    const saldo = totals.receita - totals.gasto;
    
    // Atualizar elementos no DOM
    if (elements.totalReceitas) {
        elements.totalReceitas.textContent = formatNumberToCurrency(totals.receita);
    }
    if (elements.totalGastos) {
        elements.totalGastos.textContent = formatNumberToCurrency(totals.gasto);
    }
    if (elements.totalTransferencias) {
        elements.totalTransferencias.textContent = formatNumberToCurrency(totals.transferencia);
    }
    if (elements.totalInvestimentos) {
        elements.totalInvestimentos.textContent = formatNumberToCurrency(totals.investimento);
    }
    
    // Atualizar saldo e aplicar classe baseada no valor
    if (elements.saldoAtual) {
        elements.saldoAtual.textContent = formatNumberToCurrency(saldo);
        if (saldo > 0) {
            elements.saldoAtual.style.color = '#4CAF50';
        } else if (saldo < 0) {
            elements.saldoAtual.style.color = '#F44336';
        } else {
            elements.saldoAtual.style.color = 'var(--color-text)';
        }
    }
}

// CORREÇÃO CRÍTICA: Configurar gráficos com proteção contra crescimento infinito
function setupCharts() {
    try {
        // Destruir gráficos existentes antes de criar novos
        if (typeChart) {
            typeChart.destroy();
            typeChart = null;
        }
        if (bankChart) {
            bankChart.destroy();
            bankChart = null;
        }
        if (portfolioChart) {
            portfolioChart.destroy();
            portfolioChart = null;
        }

        // Gráfico por tipo de transação
        const typeCtx = document.getElementById('typeChart');
        if (typeCtx) {
            typeChart = new Chart(typeCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Receitas', 'Gastos', 'Transferências', 'Investimentos'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Gráfico por banco
        const bankCtx = document.getElementById('bankChart');
        if (bankCtx) {
            bankChart = new Chart(bankCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // CORREÇÃO CRÍTICA: Gráfico da carteira de investimentos com configuração específica
        const portfolioCtx = document.getElementById('portfolioChart');
        if (portfolioCtx) {
            portfolioChart = new Chart(portfolioCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // CRÍTICO: Impede crescimento infinito
                    animation: {
                        duration: 0 // Desabilita animação para evitar loops
                    },
                    onResize: null, // Remove callback de resize personalizado
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao configurar gráficos:', error);
    }
}

// Atualizar gráficos
function updateCharts() {
    if (!typeChart || !bankChart) return;
    
    try {
        // Dados para o gráfico por tipo
        const typeTotals = {
            receita: 0,
            gasto: 0,
            transferencia: 0,
            investimento: 0
        };
        
        // Dados para o gráfico por banco
        const bankTotals = {};
        
        // Calcular totais
        appData.transactions.forEach(transaction => {
            typeTotals[transaction.type] += transaction.amount;
            
            if (!bankTotals[transaction.bank]) {
                bankTotals[transaction.bank] = 0;
            }
            bankTotals[transaction.bank] += transaction.amount;
        });
        
        // Atualizar gráfico por tipo
        typeChart.data.datasets[0].data = [
            typeTotals.receita,
            typeTotals.gasto,
            typeTotals.transferencia,
            typeTotals.investimento
        ];
        
        // Atualizar gráfico por banco
        const bankNames = Object.keys(bankTotals);
        const bankValues = bankNames.map(name => bankTotals[name]);
        
        bankChart.data.labels = bankNames;
        bankChart.data.datasets[0].data = bankValues;
        
        // Atualizar os gráficos sem animação para evitar problemas
        typeChart.update('none');
        bankChart.update('none');
    } catch (error) {
        console.error('Erro ao atualizar gráficos:', error);
    }
}

// CORREÇÃO CRÍTICA: Função segura para atualizar gráfico da carteira
function safeUpdatePortfolioChart() {
    clearTimeout(chartUpdateTimeout);
    chartUpdateTimeout = setTimeout(() => {
        try {
            if (!portfolioChart || !portfolioChart.canvas) {
                console.warn('Gráfico de carteira não disponível');
                return;
            }
            
            const investmentsByDescription = {};
            
            // Agrupar investimentos por descrição
            appData.investments.forEach(investment => {
                const key = investment.description;
                if (!investmentsByDescription[key]) {
                    investmentsByDescription[key] = 0;
                }
                investmentsByDescription[key] += investment.currentValue;
            });
            
            // Preparar dados para o gráfico
            const investmentNames = Object.keys(investmentsByDescription);
            const investmentValues = investmentNames.map(name => investmentsByDescription[name]);
            
            // Atualizar dados do gráfico de forma segura
            if (portfolioChart.data) {
                portfolioChart.data.labels = investmentNames;
                portfolioChart.data.datasets[0].data = investmentValues;
                
                // CRÍTICO: Atualizar sem animação para evitar loops infinitos
                portfolioChart.update('none');
            }
        } catch (error) {
            console.error('Erro ao atualizar gráfico de carteira:', error);
        }
    }, 50);
}

// Função de fallback para o gráfico da carteira
function updatePortfolioChart() {
    safeUpdatePortfolioChart();
}

// Lidar com envio do formulário de investimento
function handleInvestmentSubmit(e) {
    e.preventDefault();
    
    try {
        const name = document.getElementById('investmentName').value;
        const initialValue = currencyToNumber(document.getElementById('investmentInitial').value);
        const currentValue = currencyToNumber(document.getElementById('investmentCurrent').value);
        const bank = document.getElementById('investmentBank').value;
        
        // Validações
        if (!name || !initialValue || !currentValue || !bank) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        
        // Criar novo investimento
        const investment = {
            id: Date.now().toString(),
            description: name,
            initialValue,
            currentValue,
            bank
        };
        
        // Adicionar investimento à lista
        appData.investments.push(investment);
        
        // Criar transação correspondente
        const transaction = {
            id: investment.id,
            type: 'investimento',
            amount: initialValue,
            description: name,
            bank,
            currentValue,
            timestamp: new Date().toISOString()
        };
        
        appData.transactions.push(transaction);
        
        // Atualizar UI de forma segura
        saveData();
        addMessageToChat(transaction);
        updateInvestmentsList();
        updateInvestmentSummary();
        safeUpdatePortfolioChart();
        updateStatistics();
        updateCharts();
        
        // Limpar formulário
        elements.investmentForm.reset();
    } catch (error) {
        console.error('Erro ao adicionar investimento:', error);
        alert('Erro ao adicionar investimento. Tente novamente.');
    }
}

// Atualizar lista de investimentos
function updateInvestmentsList() {
    if (!elements.investmentsList) return;
    
    // Limpar lista
    elements.investmentsList.innerHTML = '';
    
    // Estado vazio
    if (appData.investments.length === 0) {
        elements.investmentsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📈</span>
                <p>Nenhum investimento registrado ainda.</p>
            </div>
        `;
        return;
    }
    
    // Adicionar cada investimento
    appData.investments.forEach(investment => {
        const rendimento = investment.currentValue - investment.initialValue;
        const rendimentoPercent = (rendimento / investment.initialValue) * 100;
        const isPositive = rendimento >= 0;
        
        const investmentEl = document.createElement('div');
        investmentEl.classList.add('investment-item');
        investmentEl.innerHTML = `
            <div class="investment-info">
                <h4>${investment.description}</h4>
                <p>Banco: ${investment.bank}</p>
            </div>
            <div class="investment-values">
                <p>Inicial: ${formatNumberToCurrency(investment.initialValue)}</p>
                <p>Atual: ${formatNumberToCurrency(investment.currentValue)}</p>
                <p style="color: ${isPositive ? '#4CAF50' : '#F44336'}">
                    Rendimento: ${formatNumberToCurrency(rendimento)} (${rendimentoPercent.toFixed(2)}%)
                </p>
                <div class="investment-actions">
                    <button class="btn btn--sm btn--secondary update-investment" data-id="${investment.id}">
                        Atualizar
                    </button>
                </div>
            </div>
        `;
        
        elements.investmentsList.appendChild(investmentEl);
    });
    
    // Adicionar event listeners para botões de atualização
    const updateButtons = document.querySelectorAll('.update-investment');
    updateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            promptUpdateInvestment(id);
        });
    });
}

// Atualizar investimento via prompt
function promptUpdateInvestment(id) {
    const investment = appData.investments.find(inv => inv.id === id);
    if (!investment) return;
    
    const newValue = prompt(`Atualizar valor de "${investment.description}".\nValor atual: ${formatNumberToCurrency(investment.currentValue)}\n\nDigite o novo valor:`, investment.currentValue.toString().replace('.', ','));
    
    if (newValue !== null) {
        try {
            // Atualizar valor
            const numValue = currencyToNumber(newValue);
            investment.currentValue = numValue;
            
            // Atualizar também na transação correspondente
            const transaction = appData.transactions.find(t => t.id === id);
            if (transaction) {
                transaction.currentValue = numValue;
            }
            
            // Atualizar UI de forma segura
            saveData();
            updateInvestmentsList();
            updateInvestmentSummary();
            safeUpdatePortfolioChart();
        } catch (error) {
            console.error('Erro ao atualizar investimento:', error);
            alert('Erro ao atualizar investimento. Verifique o valor informado.');
        }
    }
}

// Atualizar resumo de investimentos
function updateInvestmentSummary() {
    if (!elements.totalInvestido) return;
    
    let totalInicial = 0;
    let totalAtual = 0;
    
    appData.investments.forEach(investment => {
        totalInicial += investment.initialValue;
        totalAtual += investment.currentValue;
    });
    
    const rendimento = totalAtual - totalInicial;
    const rendimentoPercent = totalInicial > 0 ? (rendimento / totalInicial) * 100 : 0;
    
    elements.totalInvestido.textContent = formatNumberToCurrency(totalInicial);
    elements.valorAtualTotal.textContent = formatNumberToCurrency(totalAtual);
    
    const rendimentoText = `${formatNumberToCurrency(rendimento)} (${rendimentoPercent.toFixed(2)}%)`;
    elements.rendimentoTotal.textContent = rendimentoText;
    elements.rendimentoTotal.style.color = rendimento >= 0 ? '#4CAF50' : '#F44336';
}

// Exportar transações para CSV
function exportTransactionsCSV() {
    if (appData.transactions.length === 0) {
        alert('Não há transações para exportar.');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Tipo,Valor,Descrição,Banco,Banco Destino,Valor Atual,Data\n';
    
    appData.transactions.forEach(transaction => {
        const row = [
            transaction.id,
            transaction.type,
            transaction.amount,
            transaction.description,
            transaction.bank,
            transaction.bankTo || '',
            transaction.currentValue || '',
            transaction.timestamp
        ].map(value => {
            if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
        
        csvContent += row + '\n';
    });
    
    downloadCSV(csvContent, 'transacoes.csv');
}

// Exportar todos os dados para CSV
function exportAllDataCSV() {
    exportTransactionsCSV();
    
    if (appData.investments.length > 0) {
        let investmentsCSV = 'data:text/csv;charset=utf-8,';
        investmentsCSV += 'ID,Nome,Valor Inicial,Valor Atual,Banco\n';
        
        appData.investments.forEach(investment => {
            const row = [
                investment.id,
                investment.description,
                investment.initialValue,
                investment.currentValue,
                investment.bank
            ].map(value => {
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
            
            investmentsCSV += row + '\n';
        });
        
        setTimeout(() => {
            downloadCSV(investmentsCSV, 'investimentos.csv');
        }, 100);
    }
}

// Função auxiliar para download de CSV
function downloadCSV(csvContent, fileName) {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Lidar com seleção de arquivo CSV
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        elements.importBtn.disabled = false;
    } else {
        elements.importBtn.disabled = true;
    }
}

// Importar dados de CSV
function importCSV() {
    const file = elements.importFile.files[0];
    if (!file) {
        alert('Por favor, selecione um arquivo CSV para importar.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const lines = csvData.split('\n');
            
            if (lines.length <= 1) {
                alert('Arquivo CSV vazio ou inválido.');
                return;
            }
            
            const header = lines[0].split(',');
            const isTransactionFile = header.includes('Tipo') || header.includes('"Tipo"');
            
            let importedCount = 0;
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                let currentLine = lines[i];
                const values = [];
                let insideQuotes = false;
                let currentValue = '';
                
                for (let j = 0; j < currentLine.length; j++) {
                    const char = currentLine[j];
                    
                    if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                        values.push(currentValue);
                        currentValue = '';
                    } else {
                        currentValue += char;
                    }
                }
                
                values.push(currentValue);
                
                if (isTransactionFile) {
                    const transaction = {
                        id: values[0].replace(/"/g, '') || Date.now().toString(),
                        type: values[1].replace(/"/g, ''),
                        amount: parseFloat(values[2]),
                        description: values[3].replace(/"/g, ''),
                        bank: values[4].replace(/"/g, ''),
                        bankTo: values[5] ? values[5].replace(/"/g, '') : null,
                        currentValue: values[6] ? parseFloat(values[6]) : null,
                        timestamp: values[7] ? values[7].replace(/"/g, '') : new Date().toISOString()
                    };
                    
                    if (!transaction.type || isNaN(transaction.amount) || !transaction.description || !transaction.bank) {
                        continue;
                    }
                    
                    if (!bancosPredefinidos.includes(transaction.bank) && !appData.customBanks.includes(transaction.bank)) {
                        appData.customBanks.push(transaction.bank);
                    }
                    
                    appData.transactions.push(transaction);
                    importedCount++;
                }
            }
            
            if (importedCount > 0) {
                populateBankSelects();
                loadTransactionsToChat();
                updateStatistics();
                updateCharts();
                updateInvestmentsList();
                updateInvestmentSummary();
                safeUpdatePortfolioChart();
                updateFinancialTips();
                saveData();
                
                alert(`Importação concluída com sucesso! ${importedCount} registros importados.`);
            } else {
                alert('Nenhum registro válido foi encontrado no arquivo.');
            }
            
            elements.importFile.value = '';
            elements.importBtn.disabled = true;
        } catch (error) {
            console.error('Erro ao importar arquivo:', error);
            alert('Erro ao importar arquivo. Verifique o formato e tente novamente.');
        }
    };
    
    reader.readAsText(file);
}

// Limpar todos os dados
function clearAllData() {
    if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.')) {
        appData = {
            transactions: [],
            customBanks: [],
            investments: []
        };
        
        saveData();
        loadTransactionsToChat();
        updateStatistics();
        updateCharts();
        updateInvestmentsList();
        updateInvestmentSummary();
        safeUpdatePortfolioChart();
        updateFinancialTips();
        populateBankSelects();
        
        alert('Todos os dados foram removidos com sucesso.');
    }
}

// Carregar dados salvos
function loadData() {
    const savedData = localStorage.getItem('financialAppData');
    if (savedData) {
        try {
            appData = JSON.parse(savedData);
            
            if (!appData.transactions) appData.transactions = [];
            if (!appData.customBanks) appData.customBanks = [];
            if (!appData.investments) appData.investments = [];
            
            loadTransactionsToChat();
            populateBankSelects();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            appData = { ...dadosIniciais };
        }
    } else {
        appData = { ...dadosIniciais };
    }
}

// Salvar dados
function saveData() {
    try {
        localStorage.setItem('financialAppData', JSON.stringify(appData));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar dados. O armazenamento local pode estar cheio ou indisponível.');
    }
}

// Carregar transações para o chat
function loadTransactionsToChat() {
    if (!elements.chatMessages) return;
    
    elements.chatMessages.innerHTML = '';
    
    if (appData.transactions.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💬</span>
                <p>Comece registrando sua primeira transação!</p>
            </div>
        `;
        return;
    }
    
    appData.transactions.forEach(transaction => {
        addMessageToChat(transaction);
    });
}

// Atualizar toda a UI
function updateUI() {
    loadTransactionsToChat();
    updateStatistics();
    updateInvestmentsList();
    updateInvestmentSummary();
    updateFinancialTips();
}

// Atualizar dicas financeiras
function updateFinancialTips() {
    const tipsContainer = document.getElementById('financialTips');
    if (!tipsContainer) return;
    
    tipsContainer.innerHTML = '';
    
    if (appData.transactions.length < 3) {
        const tipElement = document.createElement('div');
        tipElement.classList.add('tip-item');
        tipElement.textContent = 'Registre mais transações para receber dicas personalizadas!';
        tipsContainer.appendChild(tipElement);
        return;
    }
    
    const totalReceitas = appData.transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalGastos = appData.transactions
        .filter(t => t.type === 'gasto')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalInvestimentos = appData.transactions
        .filter(t => t.type === 'investimento')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const tips = [];
    
    if (totalGastos > totalReceitas) {
        tips.push('⚠️ Atenção! Seus gastos estão maiores que suas receitas. Considere reduzir despesas.');
    } else if (totalGastos > totalReceitas * 0.9) {
        tips.push('⚠️ Seus gastos estão muito próximos das receitas. Tente economizar mais.');
    } else if (totalGastos < totalReceitas * 0.5) {
        tips.push('🌟 Excelente! Você está gastando menos da metade do que ganha. Continue assim!');
    }
    
    const percentInvestimentos = totalReceitas > 0 ? (totalInvestimentos / totalReceitas) * 100 : 0;
    if (percentInvestimentos < 10 && totalReceitas > 0) {
        tips.push('💡 Tente investir pelo menos 10% da sua renda mensal para construir patrimônio.');
    } else if (percentInvestimentos >= 10 && percentInvestimentos < 20) {
        tips.push('👍 Bom trabalho! Você está investindo mais de 10% da sua renda. Continue investindo!');
    } else if (percentInvestimentos >= 20) {
        tips.push('🌟 Parabéns! Você está investindo mais de 20% da sua renda, isso é excelente para o futuro.');
    }
    
    const banksUsed = new Set(appData.transactions.map(t => t.bank));
    if (banksUsed.size > 3) {
        tips.push('💳 Você está usando muitos bancos diferentes. Considere consolidar para facilitar a gestão.');
    }
    
    if (tips.length === 0) {
        tips.push('✅ Continue registrando suas transações para obter mais dicas personalizadas.');
    }
    
    tips.forEach(tip => {
        const tipElement = document.createElement('div');
        tipElement.classList.add('tip-item');
        tipElement.textContent = tip;
        tipsContainer.appendChild(tipElement);
    });
}