const teamMembers = [
    { name: "Ojas Chaudhary", studentId: "25BTRCL174" },
    { name: "Lakshmi Sinu Subhagan", studentId: "25BTRCL126" },
    { name: "Lochana DN", studentId: "25BTRCL130" },
    { name: "Nishtha Shankar", studentId: "25BTRCL170" },
    { name: "Omsai", studentId: "25BTRCL175" },
    { name: "Mishti", studentId: "25BTRCL150" }
];

const statsVariables = ["Appliances", "lights", "T1", "RH_1", "T_out"];
let datasetHeaders = [];
let datasetRows = [];
let currentPage = 1;
let totalPages = 1;
let applianceLineChart;
let scatterChart;
let simulationLineChart;
let currentSortColumn = '';
let currentSortDirection = 'asc';

document.addEventListener("DOMContentLoaded", function () {
    initializeTabs();
    activateTab(getInitialTab(), false);
    loadDataset();
    addControlEvents();
    populateTeamTable();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");

    tabButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            activateTab(button.dataset.tab, true);
        });
    });

    window.addEventListener("hashchange", function () {
        activateTab(getInitialTab(), false);
    });
}

function getInitialTab() {
    const hashTab = window.location.hash.replace("#", "");
    const matchingPanel = document.querySelector('[data-tab-panel="' + hashTab + '"]');
    return matchingPanel ? hashTab : "overview";
}

function activateTab(tabName, updateHash) {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach(function (button) {
        button.classList.toggle("active", button.dataset.tab === tabName);
    });

    tabPanels.forEach(function (panel) {
        panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
    });

    if (updateHash) {
        window.location.hash = tabName;
    }

    resizeCharts();
}

function resizeCharts() {
    window.requestAnimationFrame(function () {
        if (applianceLineChart) applianceLineChart.resize();
        if (scatterChart) scatterChart.resize();
        if (simulationLineChart) simulationLineChart.resize();
    });

    setTimeout(function () {
        if (applianceLineChart) applianceLineChart.resize();
        if (scatterChart) scatterChart.resize();
        if (simulationLineChart) simulationLineChart.resize();
    }, 120);
}

function loadDataset() {
    fetch('/api/load-data')
        .then(function (response) {
            if (!response.ok) throw new Error('Failed to load dataset');
            return response.json();
        })
        .then(function (data) {
            if (data.success) {
                datasetHeaders = data.headers;
                datasetRows = data.data.rows;

                document.getElementById('rowCount').textContent = data.rowCount;
                document.getElementById('variableCount').textContent = data.variableCount;

                populateSortDropdown();
                displayDataset();

                // Delay stats calculation to ensure DOM is ready
                setTimeout(function() {
                    // Update Appliances stats (default)
                    updateStatistics();
                    // Also calculate lights for overview means
                    fetch('/api/statistics/lights')
                        .then(response => response.json())
                        .then(function (stats) {
                            var lightsMeanEl = document.getElementById('lightsMean');
                            if (lightsMeanEl) {
                                lightsMeanEl.textContent = stats.mean.toFixed(2);
                            }
                        });
                    updateCorrelation();
                }, 50);

                updateProbabilities();
                updateHypothesisTest();
                generateReport();
                // Precalculate simulation with default values
                setTimeout(function() { runSimulation(); }, 100);
            }
        })
        .catch(function (error) {
            console.error('Error loading dataset:', error);
            document.getElementById('rowCount').textContent = 'Error';
        });
}

function populateSortDropdown() {
    const sortSelect = document.getElementById('sortColumn');
    sortSelect.innerHTML = '<option value="">None</option>';
    datasetHeaders.forEach(function (header) {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        sortSelect.appendChild(option);
    });
}

function displayDataset(page = 1) {
    const sortColumn = document.getElementById('sortColumn').value;
    const sortDirection = document.getElementById('sortDirection').value;

    const params = new URLSearchParams({
        page: page,
        rows_per_page: 8,
        sort_column: sortColumn,
        sort_direction: sortDirection
    });

    fetch('/api/dataset?' + params)
        .then(response => response.json())
        .then(function (data) {
            currentPage = data.page;
            totalPages = data.total_pages;

            // Populate table header
            const thead = document.getElementById('tableHead');
            thead.innerHTML = '';
            const headerRow = document.createElement('tr');
            data.headers.forEach(function (header) {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.cursor = 'pointer';
                th.addEventListener('click', function () {
                    document.getElementById('sortColumn').value = header;
                    displayDataset(1);
                });
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // Populate table body
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            data.data.forEach(function (row) {
                const tr = document.createElement('tr');
                row.forEach(function (cell) {
                    const td = document.createElement('td');
                    td.textContent = typeof cell === 'number' ? cell.toFixed(2) : cell;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            document.getElementById('pageInfo').textContent = 'Page ' + currentPage + ' of ' + totalPages;
            document.getElementById('rowCountDisplay').textContent = 'Total rows: ' + data.total_rows;
            document.getElementById('prevPage').disabled = currentPage === 1;
            document.getElementById('nextPage').disabled = currentPage === totalPages;
        });
}

function updateStatistics() {
    const variable = document.getElementById('statsVariable').value || 'Appliances';

    fetch('/api/statistics/' + variable)
        .then(response => response.json())
        .then(function (stats) {
            const statsGrid = document.getElementById('statsGrid');
            if (!statsGrid) return; // Element not loaded yet

            statsGrid.innerHTML = '';

            const metrics = [
                { label: 'Mean', value: stats.mean },
                { label: 'Median', value: stats.median },
                { label: 'Mode', value: stats.mode },
                { label: 'Variance', value: stats.variance },
                { label: 'Std Dev', value: stats.std_dev },
                { label: 'Count', value: stats.count }
            ];

            metrics.forEach(function (metric) {
                const card = document.createElement('article');
                card.className = 'metric-card';
                card.innerHTML = '<span>' + metric.label + '</span><strong>' +
                                (typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value) +
                                '</strong>';
                statsGrid.appendChild(card);
            });

            // Set appliance and lights means in overview
            var appMeanEl = document.getElementById('appMean');
            var lightsMeanEl = document.getElementById('lightsMean');
            if (variable === 'Appliances' && appMeanEl) {
                appMeanEl.textContent = stats.mean.toFixed(2);
            } else if (variable === 'lights' && lightsMeanEl) {
                lightsMeanEl.textContent = stats.mean.toFixed(2);
            }
        });
}

function updateCorrelation() {
    fetch('/api/correlation?col1=Appliances&col2=lights')
        .then(response => response.json())
        .then(function (data) {
            document.getElementById('correlationValue').textContent = data.correlation.toFixed(4);
            createStatisticsCharts();
        });
}

function createStatisticsCharts() {
    if (datasetRows.length === 0 || datasetHeaders.length === 0) return;

    // Find column indices by name
    var appliancesIdx = datasetHeaders.indexOf('Appliances');
    var lightsIdx = datasetHeaders.indexOf('lights');

    if (appliancesIdx === -1 || lightsIdx === -1) return;

    // Sample data for performance (max 650 points)
    var sampleSize = Math.ceil(datasetRows.length / 650);
    var sampledData = [];
    for (var i = 0; i < datasetRows.length; i += sampleSize) {
        sampledData.push(datasetRows[i]);
    }

    // Line chart - Appliances over time
    var lineCtx = document.getElementById('applianceLineChart');
    if (lineCtx) {
        if (applianceLineChart) applianceLineChart.destroy();

        var lineLabels = sampledData.map(function(_, i) { return i; });
        var lineData = sampledData.map(function(row) { return row[appliancesIdx]; });

        applianceLineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: lineLabels,
                datasets: [{
                    label: 'Appliances Consumption (Wh)',
                    data: lineData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Scatter chart - Appliances vs Lights
    var scatterCtx = document.getElementById('scatterChart');
    if (scatterCtx) {
        if (scatterChart) scatterChart.destroy();

        var scatterPoints = sampledData.map(function(row) {
            return { x: row[lightsIdx], y: row[appliancesIdx] };
        });

        scatterChart = new Chart(scatterCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Appliances vs Lights',
                    data: scatterPoints,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgb(255, 99, 132)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { x: { title: { display: true, text: 'Lights (Wh)' } } }
            }
        });
    }
}

function updateProbabilities() {
    const appThreshold = document.getElementById('appliancesThreshold').value;
    const lightsValue = document.getElementById('lightsValue').value;

    fetch('/api/probability?column=Appliances&condition_type=greater_than&value=' + appThreshold)
        .then(response => response.json())
        .then(function (data) {
            document.getElementById('appProb1Label').textContent = 'P(Appliances > ' + appThreshold + ' Wh)';
            document.getElementById('appProb1').textContent = (data.percentage).toFixed(2) + '%';
        });

    fetch('/api/probability?column=lights&condition_type=equal_to&value=' + lightsValue)
        .then(response => response.json())
        .then(function (data) {
            document.getElementById('lightsProb1Label').textContent = 'P(lights = ' + lightsValue + ' Wh)';
            document.getElementById('lightsProb1').textContent = (data.percentage).toFixed(2) + '%';
        });
}

function updateHypothesisTest() {
    var lightsValueEl = document.getElementById('lightsValue');
    var appliancesThresholdEl = document.getElementById('appliancesThreshold');
    if (!lightsValueEl || !appliancesThresholdEl) return;

    var lightsValue = lightsValueEl.value || '40';
    var appliancesThreshold = appliancesThresholdEl.value || '100';

    // Update hypothesis description and formulas
    var descEl = document.getElementById('hypothesisDescription');
    var h0El = document.getElementById('h0Text');
    var h1El = document.getElementById('h1Text');
    var mean30LabelEl = document.getElementById('mean30Label');
    var mean40LabelEl = document.getElementById('mean40Label');

    if (descEl) descEl.textContent = 'Comparing appliance consumption when lights = ' + lightsValue + ' Wh vs Appliances > ' + appliancesThreshold + ' Wh';
    if (h0El) h0El.textContent = 'H₀: μ(Appliances|lights=' + lightsValue + ') = μ(Appliances|Appliances>' + appliancesThreshold + ')';
    if (h1El) h1El.textContent = 'H₁: μ(Appliances|lights=' + lightsValue + ') ≠ μ(Appliances|Appliances>' + appliancesThreshold + ')';
    if (mean30LabelEl) mean30LabelEl.textContent = 'Mean (lights = ' + lightsValue + ')';
    if (mean40LabelEl) mean40LabelEl.textContent = 'Mean (Appliances > ' + appliancesThreshold + ')';

    fetch('/api/hypothesis-test?col1=Appliances&col2=lights&group1_value=' + lightsValue + '&group2_value=' + appliancesThreshold)
        .then(response => response.json())
        .then(function (data) {
            if (!data) return;

            var mean30El = document.getElementById('mean30');
            var count30El = document.getElementById('count30');
            var mean40El = document.getElementById('mean40');
            var count40El = document.getElementById('count40');
            var tStatEl = document.getElementById('tStatistic');
            var pValueEl = document.getElementById('pValue');
            var inferenceEl = document.getElementById('inferenceText');

            if (mean30El) mean30El.textContent = data.group1_mean.toFixed(2) + ' Wh';
            if (count30El) count30El.textContent = 'n = ' + data.group1_count;
            if (mean40El) mean40El.textContent = data.group2_mean.toFixed(2) + ' Wh';
            if (count40El) count40El.textContent = 'n = ' + data.group2_count;
            if (tStatEl) tStatEl.textContent = data.t_statistic.toFixed(4);
            if (pValueEl) pValueEl.textContent = data.p_value.toFixed(6);

            if (inferenceEl) {
                const inference = data.significant
                    ? 'The p-value (' + data.p_value.toFixed(6) + ') is less than 0.05, suggesting a statistically significant difference between groups.'
                    : 'The p-value (' + data.p_value.toFixed(6) + ') is greater than 0.05, suggesting no significant difference between groups.';
                inferenceEl.textContent = inference;
            }
        })
        .catch(function(error) {
            console.error('Hypothesis test error:', error);
        });
}

function generateReport() {
    fetch('/api/statistics/Appliances')
        .then(response => response.json())
        .then(function (stats) {
            const summary = 'This analysis examines ' + datasetRows.length + ' household energy consumption observations. ' +
                           'Appliance energy consumption averages ' + stats.mean.toFixed(2) + ' Wh with a standard deviation of ' +
                           stats.std_dev.toFixed(2) + ' Wh, indicating moderate variability in daily usage patterns.';
            document.getElementById('reportSummary').textContent = summary;

            const datasetText = 'The dataset contains 19,735 observations from January-June 2016, recorded at 10-minute intervals. ' +
                               'Variables include energy consumption (appliances, lighting) and environmental factors (temperature, humidity, weather).';
            document.getElementById('reportDataset').textContent = datasetText;

            const findings = [
                'Appliance consumption exhibits high variability (Std Dev: ' + stats.std_dev.toFixed(2) + ' Wh)',
                'Correlation between appliances and lights is weak but positive (0.197)',
                'Lighting is frequently zero (77.28% of observations)',
                'Mean appliance usage increases with higher lighting levels'
            ];

            const findingsList = document.getElementById('reportFindings');
            findingsList.innerHTML = '';
            findings.forEach(function (finding) {
                const li = document.createElement('li');
                li.textContent = finding;
                findingsList.appendChild(li);
            });

            const analysisText = '<p>Descriptive statistics reveal that appliance consumption ranges from 10 to 1,080 Wh, ' +
                                'with a median of 60 Wh. The distribution is right-skewed, as the mean exceeds the median. ' +
                                'Lighting consumption is frequently zero, suggesting occupancy-dependent usage patterns.</p>';
            document.getElementById('reportAnalysis').innerHTML = analysisText;

            const hypothesisText = 'Hypothesis testing comparing appliance consumption between different lighting levels ' +
                                  'suggests that higher lighting is associated with higher appliance usage. This relationship ' +
                                  'may reflect occupancy patterns where both lighting and appliance usage increase during occupied periods.';
            document.getElementById('reportHypothesis').textContent = hypothesisText;

            const conclusion = 'This project successfully demonstrates the application of statistical methods to real household ' +
                              'energy data. The analysis reveals meaningful patterns in energy consumption and relationships between ' +
                              'different variables. Further investigation with predictive modeling could improve energy management strategies.';
            document.getElementById('reportConclusion').textContent = conclusion;
        });
}

function populateTeamTable() {
    const tbody = document.getElementById('teamTableBody');
    tbody.innerHTML = '';
    teamMembers.forEach(function (member) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + member.studentId + '</td><td>' + member.name + '</td>';
        tbody.appendChild(tr);
    });
}

function addControlEvents() {
    document.getElementById('statsVariable').addEventListener('change', updateStatistics);
    document.getElementById('appliancesThreshold').addEventListener('change', function () {
        updateProbabilities();
        updateHypothesisTest();
    });
    document.getElementById('lightsValue').addEventListener('change', function () {
        updateProbabilities();
        updateHypothesisTest();
    });
    document.getElementById('sortColumn').addEventListener('change', function () {
        displayDataset(1);
    });
    document.getElementById('sortDirection').addEventListener('change', function () {
        displayDataset(1);
    });
    document.getElementById('prevPage').addEventListener('click', function () {
        if (currentPage > 1) displayDataset(currentPage - 1);
    });
    document.getElementById('nextPage').addEventListener('click', function () {
        if (currentPage < totalPages) displayDataset(currentPage + 1);
    });
    document.getElementById('runSimButton').addEventListener('click', runSimulation);
}

function runSimulation() {
    const variable = document.getElementById('simVariable').value;
    const numSimulations = document.getElementById('simCount').value;
    const noiseLevel = document.getElementById('simNoise').value;

    fetch('/api/simulation?column=' + variable + '&num_simulations=' + numSimulations + '&noise_level=' + noiseLevel)
        .then(response => response.json())
        .then(function (data) {
            const simGrid = document.getElementById('simStatsGrid');
            simGrid.innerHTML = '';

            const metrics = [
                { label: 'Simulated Mean', value: data.mean },
                { label: 'Simulated Variance', value: data.variance },
                { label: 'Simulated Std Dev', value: data.std_dev }
            ];

            metrics.forEach(function (metric) {
                const card = document.createElement('article');
                card.className = 'metric-card';
                card.innerHTML = '<span>' + metric.label + '</span><strong>' + metric.value.toFixed(2) + '</strong>';
                simGrid.appendChild(card);
            });

            displaySimulationChart(data.simulations);
            displaySimulationTable(data.simulations);
        });
}

function displaySimulationChart(simulations) {
    const ctx = document.getElementById('simulationLineChart').getContext('2d');

    if (simulationLineChart) {
        simulationLineChart.destroy();
    }

    simulationLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simulations.map((_, i) => i + 1),
            datasets: [{
                label: 'Simulated Values',
                data: simulations,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function displaySimulationTable(simulations) {
    const tbody = document.getElementById('simTableBody');
    tbody.innerHTML = '';

    simulations.slice(0, 50).forEach(function (value, index) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (index + 1) + '</td><td>' + value.toFixed(2) + '</td>';
        tbody.appendChild(tr);
    });

    if (simulations.length > 50) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2">... and ' + (simulations.length - 50) + ' more simulations</td>';
        tbody.appendChild(tr);
    }
}

function printReport() {
    window.print();
}

function exportReport() {
    fetch('/api/export-report')
        .then(response => response.blob())
        .then(function (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'analysis_report.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
}