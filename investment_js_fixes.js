
/* CORREÇÕES JAVASCRIPT PARA CHART.JS - EVITA CRESCIMENTO INFINITO */

// Configuração corrigida para o gráfico de distribuição da carteira
function createDistributionChart() {
    const ctx = document.getElementById('distributionChart');

    // IMPORTANTE: Destruir gráfico existente antes de criar novo
    if (window.distributionChartInstance) {
        window.distributionChartInstance.destroy();
    }

    // Configuração do gráfico com opções que EVITAM crescimento infinito
    const chartConfig = {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#FF6384', '#C7C7C7'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            // CONFIGURAÇÕES CRÍTICAS PARA EVITAR CRESCIMENTO INFINITO
            responsive: true,
            maintainAspectRatio: false, // CRÍTICO: permite controle manual do tamanho

            // Configuração de resize com delay para evitar loops
            onResize: function(chart, size) {
                // Debounce para evitar múltiplos resize
                clearTimeout(chart.resizeTimeout);
                chart.resizeTimeout = setTimeout(() => {
                    chart.update('none');
                }, 100);
            },

            // Configurações de layout que impedem crescimento
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },

            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: R$ ${context.raw.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };

    // Criar novo gráfico e armazenar instância globalmente
    window.distributionChartInstance = new Chart(ctx, chartConfig);

    return window.distributionChartInstance;
}

// Função para atualizar dados do gráfico SEM recriar
function updateDistributionChart() {
    if (!window.distributionChartInstance) {
        createDistributionChart();
        return;
    }

    const investments = JSON.parse(localStorage.getItem('investments') || '[]');
    const labels = [];
    const data = [];

    investments.forEach(inv => {
        labels.push(inv.description);
        data.push(parseFloat(inv.currentValue));
    });

    // Atualizar dados sem recriar o gráfico
    window.distributionChartInstance.data.labels = labels;
    window.distributionChartInstance.data.datasets[0].data = data;

    // Update sem animação para evitar problemas de resize
    window.distributionChartInstance.update('none');
}

// Função para redimensionar gráfico com segurança
function safeResizeChart() {
    if (window.distributionChartInstance) {
        // Forçar tamanho específico antes do resize
        const container = document.querySelector('.chart-distribution-container');
        if (container) {
            container.style.height = '400px';
            container.style.maxHeight = '400px';
        }

        // Resize com timeout para evitar loops
        setTimeout(() => {
            window.distributionChartInstance.resize();
        }, 50);
    }
}

// Event listener para redimensionamento de janela COM DEBOUNCE
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(safeResizeChart, 250);
});

// Função de inicialização segura para a aba de investimentos
function initInvestmentsTab() {
    // Garantir que o container existe antes de criar o gráfico
    const chartContainer = document.querySelector('.chart-distribution-container');
    if (chartContainer) {
        // Configurar tamanho inicial fixo
        chartContainer.style.height = '400px';
        chartContainer.style.maxHeight = '400px';

        // Criar gráfico após pequeno delay para garantir renderização
        setTimeout(() => {
            createDistributionChart();
            updateDistributionChart();
        }, 100);
    }
}
