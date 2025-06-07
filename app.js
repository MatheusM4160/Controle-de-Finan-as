/**
 * FinanceChat - Aplicação de controle financeiro
 * Com correções específicas para o problema de crescimento infinito do gráfico
 */
class FinanceApp {
    constructor() {
        // Estado da aplicação
        this.transactions = [];
        this.investments = [];
        this.banks = ["Banco do Brasil", "Caixa", "Itaú", "Nubank", "Inter", "Santander", "Bradesco", "Outro"];
        this.customBanks = [];
        this.activeTab = 'chat';
        
        // Referências para instâncias de gráficos - IMPORTANTE para gerenciamento de memória
        this.expensesChart = null;
        this.portfolioChart = null;
        
        // Inicialização
        this.loadData();
        this.initializeEventListeners();
        this.renderChatWelcomeMessage();
    }
    
    // Inicialização dos event listeners
    initializeEventListeners() {
        // Botões de navegação
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Chat
        document.getElementById('send-btn').addEventListener('click', () => this.handleChatInput());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleChatInput();
        });
        
        // Formulário de investimentos
        document.getElementById('investment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addInvestment();
        });
        
        // Import/Export
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
        
        // Evitar múltiplas reconstruções em resize - Debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.activeTab === 'reports') {
                    this.updateExpensesChart();
                } else if (this.activeTab === 'investments') {
                    this.updatePortfolioDistribution();
                }
            }, 250);
        });
    }
    
    // Troca entre abas
    switchTab(tabName) {
        // Esconder todas as abas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Desativar todos os botões
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Ativar aba selecionada
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');
        
        // Atualizar estado
        this.activeTab = tabName;
        
        // IMPORTANTE: Destruir charts existentes ao trocar de aba para evitar vazamento de memória
        if (tabName === 'reports') {
            // Destruir qualquer instância anterior do portfolio chart
            if (this.portfolioChart) {
                this.portfolioChart.destroy();
                this.portfolioChart = null;
            }
            
            this.updateReports();
        } else if (tabName === 'investments') {
            // Destruir qualquer instância anterior do expenses chart
            if (this.expensesChart) {
                this.expensesChart.destroy();
                this.expensesChart = null;
            }
            
            this.updateInvestments();
        }
    }
    
    // Manipulação do chat
    handleChatInput() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (message === '') return;
        
        // Adicionar mensagem do usuário
        this.addUserMessage(message);
        
        // Processar mensagem
        if (message.startsWith('/')) {
            this.processCommand(message);
        } else {
            this.processTransaction(message);
        }
        
        // Limpar input
        input.value = '';
    }
    
    addUserMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.textContent = message;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    addBotMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot-message');
        messageElement.innerHTML = message;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    renderChatWelcomeMessage() {
        // Já está no HTML
    }
    
    // Processamento de comandos
    processCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd === '/saldo') {
            this.showBalance();
        } else if (cmd === '/extrato') {
            this.showTransactions();
        } else if (cmd === '/bancos') {
            this.showBanks();
        } else if (cmd === '/help' || cmd === '/ajuda') {
            this.showHelp();
        } else {
            this.addBotMessage('Comando não reconhecido. Digite /help para ver os comandos disponíveis.');
        }
    }
    
    showBalance() {
        // Calcular saldo por banco
        const balances = {};
        
        this.transactions.forEach(transaction => {
            const { type, amount, bank, toBank } = transaction;
            
            if (type === 'receita') {
                balances[bank] = (balances[bank] || 0) + amount;
            } else if (type === 'gasto') {
                balances[bank] = (balances[bank] || 0) - amount;
            } else if (type === 'transferencia') {
                balances[bank] = (balances[bank] || 0) - amount;
                balances[toBank] = (balances[toBank] || 0) + amount;
            } else if (type === 'investimento') {
                balances[bank] = (balances[bank] || 0) - amount;
            }
        });
        
        // Formatar mensagem
        let message = '<strong>Saldo atual:</strong><br>';
        let totalBalance = 0;
        
        Object.entries(balances).forEach(([bank, balance]) => {
            message += `${bank}: ${this.formatCurrency(balance)}<br>`;
            totalBalance += balance;
        });
        
        message += `<br><strong>Total: ${this.formatCurrency(totalBalance)}</strong>`;
        
        this.addBotMessage(message);
    }
    
    showTransactions() {
        const recentTransactions = this.transactions.slice(-10).reverse();
        
        if (recentTransactions.length === 0) {
            this.addBotMessage('Nenhuma transação encontrada.');
            return;
        }
        
        let message = '<strong>Últimas transações:</strong><br><br>';
        
        recentTransactions.forEach(transaction => {
            const { date, type, amount, description, bank, toBank } = transaction;
            const formattedDate = new Date(date).toLocaleDateString('pt-BR');
            
            if (type === 'receita') {
                message += `${formattedDate} - <span style="color: var(--color-success)">+${this.formatCurrency(amount)}</span> (${description}) em ${bank}<br>`;
            } else if (type === 'gasto') {
                message += `${formattedDate} - <span style="color: var(--color-error)">-${this.formatCurrency(amount)}</span> (${description}) em ${bank}<br>`;
            } else if (type === 'transferencia') {
                message += `${formattedDate} - Transferência de ${this.formatCurrency(amount)} de ${bank} para ${toBank}<br>`;
            } else if (type === 'investimento') {
                message += `${formattedDate} - Investimento de ${this.formatCurrency(amount)} em ${description} via ${bank}<br>`;
            }
        });
        
        this.addBotMessage(message);
    }
    
    showBanks() {
        const allBanks = [...this.banks, ...this.customBanks];
        let message = '<strong>Bancos disponíveis:</strong><br>';
        
        allBanks.forEach(bank => {
            message += `• ${bank}<br>`;
        });
        
        this.addBotMessage(message);
    }
    
    showHelp() {
        const message = `
            <strong>Comandos disponíveis:</strong><br>
            • <strong>/saldo</strong> - Ver saldo atual<br>
            • <strong>/extrato</strong> - Ver últimas transações<br>
            • <strong>/bancos</strong> - Ver bancos disponíveis<br>
            • <strong>/help</strong> - Mostrar esta ajuda<br><br>
            
            <strong>Exemplos de transações:</strong><br>
            • Recebi R$ 3000 do salário no Nubank<br>
            • Gastei R$ 50 no mercado<br>
            • Transferi R$ 200 do Itaú para Nubank<br>
            • Investi R$ 1000 em ações
        `;
        
        this.addBotMessage(message);
    }
    
    // Processamento de transações
    processTransaction(message) {
        const lowerMsg = message.toLowerCase();
        
        try {
            // Detectar tipo de transação
            let type, amount, description, bank, toBank;
            
            // Expressão para extrair valor monetário
            const amountRegex = /r\$\s*(\d+([.,]\d+)?)|(\d+([.,]\d+)?)\s*reais|\s(\d+([.,]\d+)?)\s/i;
            const amountMatch = lowerMsg.match(amountRegex);
            
            if (!amountMatch) {
                throw new Error('Valor não encontrado na transação.');
            }
            
            // Extrair valor numérico
            amount = amountMatch[1] || amountMatch[3] || amountMatch[5];
            amount = parseFloat(amount.replace(',', '.'));
            
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Valor inválido.');
            }
            
            // Detectar bancos
            bank = this.detectBank(lowerMsg);
            
            // Classificar tipo de transação
            if (lowerMsg.includes('recebi') || lowerMsg.includes('receb') || lowerMsg.includes('salário') || lowerMsg.includes('salario')) {
                type = 'receita';
                description = this.extractDescription(lowerMsg, 'recebi', 'receb', 'salário', 'salario');
            } else if (lowerMsg.includes('gastei') || lowerMsg.includes('paguei') || lowerMsg.includes('comprei')) {
                type = 'gasto';
                description = this.extractDescription(lowerMsg, 'gastei', 'paguei', 'comprei');
            } else if (lowerMsg.includes('transfer')) {
                type = 'transferencia';
                toBank = this.detectToBank(lowerMsg);
                
                if (!toBank) {
                    throw new Error('Banco de destino não encontrado.');
                }
                
                description = 'Transferência';
            } else if (lowerMsg.includes('investi') || lowerMsg.includes('invest')) {
                type = 'investimento';
                description = this.extractDescription(lowerMsg, 'investi', 'invest');
            } else {
                throw new Error('Tipo de transação não reconhecido.');
            }
            
            // Criar objeto de transação
            const transaction = {
                id: Date.now(),
                date: new Date().toISOString(),
                type,
                amount,
                description,
                bank,
                toBank: type === 'transferencia' ? toBank : null
            };
            
            // Adicionar transação
            this.transactions.push(transaction);
            this.saveData();
            
            // Responder ao usuário
            this.confirmTransaction(transaction);
            
            // Se for investimento, adicionar aos investimentos
            if (type === 'investimento') {
                this.addInvestmentFromTransaction(transaction);
            }
        } catch (error) {
            this.addBotMessage(`Não consegui entender a transação: ${error.message}`);
        }
    }
    
    detectBank(message) {
        const allBanks = [...this.banks, ...this.customBanks];
        
        for (const bank of allBanks) {
            if (message.toLowerCase().includes(bank.toLowerCase())) {
                return bank;
            }
        }
        
        // Banco padrão se não encontrado
        return 'Conta Principal';
    }
    
    detectToBank(message) {
        const allBanks = [...this.banks, ...this.customBanks];
        const lowerMsg = message.toLowerCase();
        
        // Procurar padrão "para [banco]"
        const paraIndex = lowerMsg.indexOf('para');
        
        if (paraIndex !== -1) {
            const afterPara = lowerMsg.substring(paraIndex + 4);
            
            for (const bank of allBanks) {
                if (afterPara.includes(bank.toLowerCase())) {
                    return bank;
                }
            }
        }
        
        return null;
    }
    
    extractDescription(message, ...keywords) {
        let description = '';
        const lowerMsg = message.toLowerCase();
        
        for (const keyword of keywords) {
            if (lowerMsg.includes(keyword)) {
                const parts = lowerMsg.split(keyword);
                if (parts.length > 1) {
                    description = parts[1].trim();
                    break;
                }
            }
        }
        
        // Limpar a descrição
        description = description.replace(/r\$\s*\d+([.,]\d+)?|\d+([.,]\d+)?\s*reais/gi, '');
        description = description.replace(/no|em|do|da|de|via/gi, '');
        
        // Remover banco da descrição
        const allBanks = [...this.banks, ...this.customBanks];
        for (const bank of allBanks) {
            description = description.replace(new RegExp(bank, 'gi'), '');
        }
        
        // Capitalizar primeira letra
        description = description.trim().replace(/^\w/, c => c.toUpperCase());
        
        return description || 'Sem descrição';
    }
    
    confirmTransaction(transaction) {
        const { type, amount, description, bank, toBank } = transaction;
        let message = '';
        
        switch (type) {
            case 'receita':
                message = `✅ Receita de ${this.formatCurrency(amount)} (${description}) adicionada em ${bank}.`;
                break;
            case 'gasto':
                message = `✅ Gasto de ${this.formatCurrency(amount)} (${description}) registrado em ${bank}.`;
                break;
            case 'transferencia':
                message = `✅ Transferência de ${this.formatCurrency(amount)} de ${bank} para ${toBank} registrada.`;
                break;
            case 'investimento':
                message = `✅ Investimento de ${this.formatCurrency(amount)} em ${description} via ${bank} registrado.`;
                break;
        }
        
        this.addBotMessage(message);
    }
    
    // Aba de Relatórios
    updateReports() {
        this.updateSummary();
        this.updateExpensesChart();
        this.updateRecentTransactions();
    }
    
    updateSummary() {
        let totalIncome = 0;
        let totalExpenses = 0;
        
        this.transactions.forEach(transaction => {
            if (transaction.type === 'receita') {
                totalIncome += transaction.amount;
            } else if (transaction.type === 'gasto') {
                totalExpenses += transaction.amount;
            }
        });
        
        const totalBalance = totalIncome - totalExpenses;
        
        document.getElementById('total-income').textContent = this.formatCurrency(totalIncome);
        document.getElementById('total-expenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('total-balance').textContent = this.formatCurrency(totalBalance);
        
        // Adicionar classe para colorir o saldo
        const balanceElement = document.getElementById('total-balance');
        balanceElement.classList.remove('positive', 'negative');
        balanceElement.classList.add(totalBalance >= 0 ? 'positive' : 'negative');
    }
    
    updateExpensesChart() {
        // CORREÇÃO: Destruir chart existente
        if (this.expensesChart) {
            this.expensesChart.destroy();
            this.expensesChart = null;
        }
        
        // Agrupar gastos por categoria
        const expensesByCategory = {};
        
        this.transactions.forEach(transaction => {
            if (transaction.type === 'gasto') {
                const category = transaction.description;
                expensesByCategory[category] = (expensesByCategory[category] || 0) + transaction.amount;
            }
        });
        
        const categories = Object.keys(expensesByCategory);
        const amounts = Object.values(expensesByCategory);
        
        if (categories.length === 0) {
            // Sem dados para exibir
            return;
        }
        
        // Cores para o gráfico
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
        
        // CORREÇÃO: Criar chart com requestAnimationFrame
        requestAnimationFrame(() => {
            const ctx = document.getElementById('expenses-chart').getContext('2d');
            
            this.expensesChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categories,
                    datasets: [{
                        data: amounts,
                        backgroundColor: colors.slice(0, categories.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${this.formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        });
    }
    
    updateRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        container.innerHTML = '';
        
        const recentTransactions = this.transactions.slice(-5).reverse();
        
        if (recentTransactions.length === 0) {
            container.innerHTML = '<p>Nenhuma transação encontrada.</p>';
            return;
        }
        
        recentTransactions.forEach(transaction => {
            const { date, type, amount, description, bank, toBank } = transaction;
            const transactionElement = document.createElement('div');
            transactionElement.classList.add('transaction-item');
            
            const formattedDate = new Date(date).toLocaleDateString('pt-BR');
            
            let html = `
                <div class="transaction-details">
                    <div class="transaction-type ${type}">${this.formatTransactionType(type)}</div>
                    <div>${formattedDate}</div>
                </div>
                <div class="transaction-info">
            `;
            
            if (type === 'receita') {
                html += `<div><strong>${description}</strong> em ${bank}</div>
                         <div class="amount positive">${this.formatCurrency(amount)}</div>`;
            } else if (type === 'gasto') {
                html += `<div><strong>${description}</strong> em ${bank}</div>
                         <div class="amount negative">-${this.formatCurrency(amount)}</div>`;
            } else if (type === 'transferencia') {
                html += `<div>De ${bank} para ${toBank}</div>
                         <div>Transferência</div>`;
            } else if (type === 'investimento') {
                html += `<div><strong>${description}</strong> via ${bank}</div>
                         <div class="amount">-${this.formatCurrency(amount)}</div>`;
            }
            
            html += '</div>';
            
            transactionElement.innerHTML = html;
            container.appendChild(transactionElement);
        });
    }
    
    formatTransactionType(type) {
        const types = {
            'receita': 'Receita',
            'gasto': 'Gasto',
            'transferencia': 'Transferência',
            'investimento': 'Investimento'
        };
        
        return types[type] || type;
    }
    
    // Aba de Investimentos
    addInvestmentFromTransaction(transaction) {
        const investment = {
            id: transaction.id,
            date: transaction.date,
            type: this.mapInvestmentType(transaction.description),
            amount: transaction.amount,
            bank: transaction.bank
        };
        
        this.investments.push(investment);
        this.saveData();
    }
    
    mapInvestmentType(description) {
        const lowerDesc = description.toLowerCase();
        
        if (lowerDesc.includes('ação') || lowerDesc.includes('ações')) {
            return 'acoes';
        } else if (lowerDesc.includes('fundo') || lowerDesc.includes('fundos')) {
            return 'fundos';
        } else if (lowerDesc.includes('renda fixa') || lowerDesc.includes('cdb') || lowerDesc.includes('lci') || lowerDesc.includes('lca')) {
            return 'renda-fixa';
        } else if (lowerDesc.includes('cripto') || lowerDesc.includes('bitcoin')) {
            return 'criptomoedas';
        } else if (lowerDesc.includes('tesouro')) {
            return 'tesouro-direto';
        } else {
            return 'outros';
        }
    }
    
    addInvestment() {
        const type = document.getElementById('investment-type').value;
        const amount = parseFloat(document.getElementById('investment-amount').value);
        const bank = document.getElementById('investment-bank').value;
        
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }
        
        // Adicionar investimento
        const investment = {
            id: Date.now(),
            date: new Date().toISOString(),
            type,
            amount,
            bank
        };
        
        this.investments.push(investment);
        
        // Adicionar transação correspondente
        const typeNames = {
            'acoes': 'Ações',
            'fundos': 'Fundos',
            'renda-fixa': 'Renda Fixa',
            'criptomoedas': 'Criptomoedas',
            'tesouro-direto': 'Tesouro Direto',
            'outros': 'Outros'
        };
        
        const transaction = {
            id: investment.id,
            date: investment.date,
            type: 'investimento',
            amount,
            description: typeNames[type],
            bank
        };
        
        this.transactions.push(transaction);
        
        // Salvar e atualizar
        this.saveData();
        this.updateInvestments();
        
        // Limpar formulário
        document.getElementById('investment-amount').value = '';
        
        // Feedback
        alert('Investimento adicionado com sucesso!');
    }
    
    updateInvestments() {
        this.updateTotalInvested();
        this.updatePortfolioDistribution();
        this.updateInvestmentsTable();
    }
    
    updateTotalInvested() {
        const totalInvested = this.investments.reduce((total, investment) => total + investment.amount, 0);
        document.getElementById('total-invested').textContent = this.formatCurrency(totalInvested);
    }
    
    // CORREÇÃO CRÍTICA: Implementação corrigida para o gráfico de distribuição da carteira
    updatePortfolioDistribution() {
        // 1. Destruir chart existente
        if (this.portfolioChart) {
            this.portfolioChart.destroy();
            this.portfolioChart = null;
        }
        
        // 2. Container altura fixa
        const container = document.getElementById('portfolio-chart-container');
        container.style.height = '300px';
        
        // Agrupar investimentos por tipo
        const investmentsByType = {};
        
        this.investments.forEach(investment => {
            investmentsByType[investment.type] = (investmentsByType[investment.type] || 0) + investment.amount;
        });
        
        const types = Object.keys(investmentsByType);
        const amounts = Object.values(investmentsByType);
        
        if (types.length === 0) {
            // Sem dados para exibir
            return;
        }
        
        // Mapear tipos para nomes mais amigáveis
        const typeNames = {
            'acoes': 'Ações',
            'fundos': 'Fundos',
            'renda-fixa': 'Renda Fixa',
            'criptomoedas': 'Criptomoedas',
            'tesouro-direto': 'Tesouro Direto',
            'outros': 'Outros'
        };
        
        const labels = types.map(type => typeNames[type] || type);
        
        // Cores para o gráfico
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
        
        // 3. Criar novo chart com requestAnimationFrame
        requestAnimationFrame(() => {
            const ctx = document.getElementById('portfolio-distribution-chart').getContext('2d');
            
            this.portfolioChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: amounts,
                        backgroundColor: colors.slice(0, types.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${this.formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        });
    }
    
    updateInvestmentsTable() {
        const container = document.getElementById('investments-table');
        container.innerHTML = '';
        
        if (this.investments.length === 0) {
            container.innerHTML = '<p>Nenhum investimento encontrado.</p>';
            return;
        }
        
        // Agrupar por tipo e banco
        const groupedInvestments = {};
        
        this.investments.forEach(investment => {
            const key = `${investment.type}-${investment.bank}`;
            if (!groupedInvestments[key]) {
                groupedInvestments[key] = {
                    type: investment.type,
                    bank: investment.bank,
                    amount: 0
                };
            }
            
            groupedInvestments[key].amount += investment.amount;
        });
        
        // Criar tabela
        const table = document.createElement('table');
        table.classList.add('investments-table');
        
        // Cabeçalho
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Tipo</th>
                <th>Instituição</th>
                <th>Valor</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Corpo
        const tbody = document.createElement('tbody');
        
        Object.values(groupedInvestments).forEach(item => {
            const row = document.createElement('tr');
            
            const typeNames = {
                'acoes': 'Ações',
                'fundos': 'Fundos',
                'renda-fixa': 'Renda Fixa',
                'criptomoedas': 'Criptomoedas',
                'tesouro-direto': 'Tesouro Direto',
                'outros': 'Outros'
            };
            
            row.innerHTML = `
                <td>${typeNames[item.type] || item.type}</td>
                <td>${item.bank}</td>
                <td>${this.formatCurrency(item.amount)}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    }
    
    // Importação e exportação
    exportData() {
        // Combinar dados
        const data = {
            transactions: this.transactions,
            investments: this.investments,
            customBanks: this.customBanks
        };
        
        // Converter para CSV
        let csv = 'data:text/csv;charset=utf-8,';
        csv += JSON.stringify(data);
        
        // Criar link para download
        const encodedUri = encodeURI(csv);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `financechat_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Limpar
        document.body.removeChild(link);
    }
    
    importData(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.transactions && Array.isArray(data.transactions)) {
                    this.transactions = data.transactions;
                }
                
                if (data.investments && Array.isArray(data.investments)) {
                    this.investments = data.investments;
                }
                
                if (data.customBanks && Array.isArray(data.customBanks)) {
                    this.customBanks = data.customBanks;
                }
                
                this.saveData();
                this.updateReports();
                this.updateInvestments();
                
                alert('Dados importados com sucesso!');
            } catch (error) {
                alert('Erro ao importar dados. Formato inválido.');
            }
        };
        
        reader.readAsText(file);
    }
    
    // Persistência de dados
    saveData() {
        const data = {
            transactions: this.transactions,
            investments: this.investments,
            customBanks: this.customBanks
        };
        
        localStorage.setItem('financechat_data', JSON.stringify(data));
    }
    
    loadData() {
        const savedData = localStorage.getItem('financechat_data');
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                
                if (data.transactions && Array.isArray(data.transactions)) {
                    this.transactions = data.transactions;
                }
                
                if (data.investments && Array.isArray(data.investments)) {
                    this.investments = data.investments;
                }
                
                if (data.customBanks && Array.isArray(data.customBanks)) {
                    this.customBanks = data.customBanks;
                }
            } catch (error) {
                console.error('Erro ao carregar dados salvos:', error);
            }
        }
    }
    
    // Utilitários
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FinanceApp();
});