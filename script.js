const importantColumns = [];
const statsVariables = ["Appliances", "lights", "T1", "RH_1", "T_out"];
const rowsPerPage = 8;
const teamMembers = [
    { name: "Ojas Chaudhary", studentId: "25BTRCL174" },
    { name: "Lakshmi Sinu Subhagan", studentId: "25BTRCL126" },
    { name: "Lochana DN", studentId: "25BTRCL130" },
    { name: "Nishtha Shankar", studentId: "25BTRCL170" },
    { name: "Omsai", studentId: "25BTRCL175" },
    { name: "Mishti", studentId: "25BTRCL150" }
];

let headers = [];
let dataRows = [];
let filteredRows = [];
let currentPage = 1;
let sortColumn = "";
let sortDirection = "asc";
let applianceLineChart;
let scatterChart;
let simulationLineChart;

document.addEventListener("DOMContentLoaded", function () {
    initializeTabs();
    activateTab(getInitialTab(), false);
    loadDataset();
    addControlEvents();
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
        if (applianceLineChart) {
            applianceLineChart.resize();
        }
        if (scatterChart) {
            scatterChart.resize();
        }
        if (simulationLineChart) {
            simulationLineChart.resize();
        }
    });

    setTimeout(function () {
        if (applianceLineChart) {
            applianceLineChart.resize();
        }
        if (scatterChart) {
            scatterChart.resize();
        }
        if (simulationLineChart) {
            simulationLineChart.resize();
        }
    }, 120);
}

function loadDataset() {
    fetch("dataset.csv")
        .then(function (response) {
            if (!response.ok) {
                throw new Error("dataset.csv could not be loaded.");
            }
            return response.text();
        })
        .then(function (csvText) {
            const parsed = parseCSV(csvText);
            headers = parsed[0];
            dataRows = parsed.slice(1).map(rowToObject);
            filteredRows = dataRows.slice();

            const applianceValues = getNumericValues("Appliances");
            const lightsValues = getNumericValues("lights");

            document.getElementById("rowCount").textContent = dataRows.length.toLocaleString();
            document.getElementById("variableCount").textContent = headers.length.toString();
            document.getElementById("appMean").textContent = formatNumber(mean(applianceValues));
            document.getElementById("lightsMean").textContent = formatNumber(mean(lightsValues));

            renderTable();
            updateStatistics();
            createTrendCharts();
            populateProbabilityDropdowns();
            updateProbability();
            updateHypothesis();
            updateSimulation();
            generateReport();
        })
        .catch(function (error) {
            document.getElementById("tableStatus").textContent = error.message;
        });
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        const nextCharacter = text[i + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            value += '"';
            i++;
        } else if (character === '"') {
            insideQuotes = !insideQuotes;
        } else if (character === "," && !insideQuotes) {
            row.push(value.trim());
            value = "";
        } else if ((character === "\n" || character === "\r") && !insideQuotes) {
            if (value.length > 0 || row.length > 0) {
                row.push(value.trim());
                rows.push(row);
                row = [];
                value = "";
            }
            if (character === "\r" && nextCharacter === "\n") {
                i++;
            }
        } else {
            value += character;
        }
    }

    if (value.length > 0 || row.length > 0) {
        row.push(value.trim());
        rows.push(row);
    }

    return rows;
}

function rowToObject(row) {
    const object = {};

    headers.forEach(function (header, index) {
        object[header] = row[index] || "";
    });

    return object;
}

function addControlEvents() {
    document.getElementById("prevPage").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            renderTableBody();
        }
    });
    document.getElementById("nextPage").addEventListener("click", function () {
        const totalPages = getTotalPages();
        if (currentPage < totalPages) {
            currentPage++;
            renderTableBody();
        }
    });

    document.getElementById("statsVariable").addEventListener("change", updateStatistics);
    document.getElementById("applianceThreshold").addEventListener("input", updateProbability);
    document.getElementById("lightsValue").addEventListener("input", updateProbability);
    document.getElementById("simulationVariable").addEventListener("change", updateSimulation);
    document.getElementById("simulationCount").addEventListener("change", updateSimulation);
    document.getElementById("noiseLevel").addEventListener("change", updateSimulation);
}


function renderTable() {
    const tableHead = document.getElementById("tableHead");
    const headerRow = document.createElement("tr");

    tableHead.innerHTML = "";

    headers.forEach(function (header) {
        const th = document.createElement("th");
        th.textContent = header;
        th.className = importantColumns.includes(header) ? "important-column" : "";
        th.addEventListener("click", function () {
            sortTable(header);
        });
        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);
    renderTableBody();
}

function renderTableBody() {
    const tableBody = document.getElementById("tableBody");
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const visibleRows = filteredRows.slice(start, end);

    tableBody.innerHTML = "";

    visibleRows.forEach(function (row) {
        const tr = document.createElement("tr");

        headers.forEach(function (header) {
            const td = document.createElement("td");
            td.textContent = row[header];
            td.className = importantColumns.includes(header) ? "important-column" : "";
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });

    const totalPages = getTotalPages();
    document.getElementById("tableStatus").textContent =
        filteredRows.length.toLocaleString() + " rows shown from " + dataRows.length.toLocaleString() + " total rows";
    document.getElementById("pageInfo").textContent = "Page " + currentPage + " of " + totalPages;
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

function getTotalPages() {
    return Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
}

function sortTable(header) {
    if (sortColumn === header) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = header;
        sortDirection = "asc";
    }

    applySort();
    currentPage = 1;
    renderTableBody();
}

function applySort() {
    if (!sortColumn) {
        return;
    }

    filteredRows.sort(function (a, b) {
        const first = a[sortColumn];
        const second = b[sortColumn];
        const firstNumber = Number(first);
        const secondNumber = Number(second);
        let comparison;

        if (!Number.isNaN(firstNumber) && !Number.isNaN(secondNumber)) {
            comparison = firstNumber - secondNumber;
        } else {
            comparison = String(first).localeCompare(String(second));
        }

        return sortDirection === "asc" ? comparison : -comparison;
    });
}

function getNumericValues(variableName) {
    return dataRows
        .map(function (row) {
            return Number(row[variableName]);
        })
        .filter(function (value) {
            return !Number.isNaN(value);
        });
}

function mean(values) {
    if (values.length === 0) {
        return 0;
    }

    const total = values.reduce(function (sum, value) {
        return sum + value;
    }, 0);

    return total / values.length;
}

function median(values) {
    if (values.length === 0) {
        return 0;
    }

    const sorted = values.slice().sort(function (a, b) {
        return a - b;
    });
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function mode(values) {
    if (values.length === 0) {
        return 0;
    }

    const counts = {};
    let bestValue = values[0];
    let bestCount = 0;

    values.forEach(function (value) {
        const roundedValue = Number(value.toFixed(2));
        counts[roundedValue] = (counts[roundedValue] || 0) + 1;

        if (counts[roundedValue] > bestCount) {
            bestCount = counts[roundedValue];
            bestValue = roundedValue;
        }
    });

    return bestValue;
}

function variance(values) {
    if (values.length === 0) {
        return 0;
    }

    const average = mean(values);
    const squaredDifferences = values.map(function (value) {
        return Math.pow(value - average, 2);
    });

    return mean(squaredDifferences);
}

function stdDev(values) {
    return Math.sqrt(variance(values));
}

function probability(values, conditionFunction) {
    if (values.length === 0) {
        return 0;
    }

    const matchingValues = values.filter(conditionFunction);
    return matchingValues.length / values.length;
}

function updateStatistics() {
    if (dataRows.length === 0) {
        return;
    }

    const variableName = document.getElementById("statsVariable").value;
    const values = getNumericValues(variableName);
    const statistics = [
        ["Mean", mean(values)],
        ["Median", median(values)],
        ["Mode", mode(values)],
        ["Variance", variance(values)],
        ["Std. Deviation", stdDev(values)]
    ];
    const statsCards = document.getElementById("statsCards");

    statsCards.innerHTML = "";

    statistics.forEach(function (statistic) {
        const card = document.createElement("article");
        const label = document.createElement("span");
        const value = document.createElement("strong");

        card.className = "metric-card";
        label.textContent = statistic[0];
        value.textContent = formatNumber(statistic[1]);

        card.appendChild(label);
        card.appendChild(value);
        statsCards.appendChild(card);
    });
}

function createTrendCharts() {
    if (applianceLineChart) {
        applianceLineChart.destroy();
    }
    if (scatterChart) {
        scatterChart.destroy();
    }

    const applianceValues = getNumericValues("Appliances");
    const lightsValues = getNumericValues("lights");
    const sampledRows = sampleRows(dataRows, 650);
    const lineLabels = sampledRows.map(function (row) {
        return row.date;
    });
    const lineValues = sampledRows.map(function (row) {
        return Number(row.Appliances);
    });
    const scatterPoints = sampleRows(dataRows, 650).map(function (row) {
        return {
            x: Number(row.lights),
            y: Number(row.Appliances)
        };
    });

    document.getElementById("correlationValue").textContent = formatNumber(correlation(applianceValues, lightsValues));

    applianceLineChart = new Chart(document.getElementById("applianceLineChart"), {
        type: "line",
        data: {
            labels: lineLabels,
            datasets: [{
                label: "Appliances",
                data: lineValues,
                borderColor: "#2357a4",
                backgroundColor: "rgba(35, 87, 164, 0.12)",
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.25,
                fill: true
            }]
        },
        options: chartOptions("Date", "Energy use")
    });

    scatterChart = new Chart(document.getElementById("scatterChart"), {
        type: "scatter",
        data: {
            datasets: [{
                label: "Appliances vs lights",
                data: scatterPoints,
                backgroundColor: "rgba(40, 120, 95, 0.55)",
                borderColor: "#28785f",
                pointRadius: 3
            }]
        },
        options: chartOptions("lights", "Appliances")
    });

    resizeCharts();
}

function chartOptions(xTitle, yTitle) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 80,
        animation: false,
        interaction: {
            mode: "index",
            intersect: false
        },
        layout: {
            padding: {
                top: 4,
                right: 8,
                bottom: 4,
                left: 4
            }
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    boxWidth: 12,
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: "rgba(23, 32, 51, 0.8)",
                titleColor: "#ffffff",
                bodyColor: "#ffffff",
                borderColor: "#2357a4",
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    title: function(context) {
                        return context[0].label || "Value";
                    },
                    label: function(context) {
                        let label = context.dataset.label || "";
                        if (label) {
                            label += ": ";
                        }
                        if (context.parsed.y !== undefined) {
                            label += formatNumber(context.parsed.y);
                        } else if (context.parsed !== null) {
                            label += formatNumber(context.parsed);
                        }
                        return label;
                    },
                    afterLabel: function(context) {
                        if (context.datasetIndex === 0 && context.dataIndex !== undefined) {
                            const percentage = ((context.parsed.y || context.parsed) / 100) * 100;
                            return "Relative: " + formatNumber(percentage) + "%";
                        }
                        return "";
                    }
                }
            },
            filler: {
                propagate: true
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: xTitle,
                    font: {
                        weight: "bold"
                    }
                },
                ticks: {
                    maxTicksLimit: 8
                },
                grid: {
                    color: "#edf2f7",
                    drawBorder: true
                }
            },
            y: {
                title: {
                    display: true,
                    text: yTitle,
                    font: {
                        weight: "bold"
                    }
                },
                grid: {
                    color: "#edf2f7",
                    drawBorder: true
                }
            }
        }
    };
}

function sampleRows(rows, maximumRows) {
    if (rows.length <= maximumRows) {
        return rows.slice();
    }

    const step = Math.ceil(rows.length / maximumRows);
    return rows.filter(function (row, index) {
        return index % step === 0;
    });
}

function correlation(firstValues, secondValues) {
    const length = Math.min(firstValues.length, secondValues.length);
    const first = firstValues.slice(0, length);
    const second = secondValues.slice(0, length);
    const firstMean = mean(first);
    const secondMean = mean(second);
    let numerator = 0;
    let firstTotal = 0;
    let secondTotal = 0;

    for (let i = 0; i < length; i++) {
        const firstDifference = first[i] - firstMean;
        const secondDifference = second[i] - secondMean;
        numerator += firstDifference * secondDifference;
        firstTotal += firstDifference * firstDifference;
        secondTotal += secondDifference * secondDifference;
    }

    const denominator = Math.sqrt(firstTotal * secondTotal);
    return denominator === 0 ? 0 : numerator / denominator;
}

function populateProbabilityDropdowns() {
    const applianceValues = getNumericValues("Appliances");
    const lightsValues = getNumericValues("lights");

    const appliancePercentiles = [25, 50, 75, 100, 150, 200, 250];
    const lightsSamples = Array.from(new Set(lightsValues.map(function (v) {
        return Math.round(v);
    }))).sort(function (a, b) {
        return a - b;
    }).slice(0, 10);

    const applianceSelect = document.getElementById("applianceThreshold");
    applianceSelect.innerHTML = "";
    appliancePercentiles.forEach(function (value) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value + " Wh";
        applianceSelect.appendChild(option);
    });
    applianceSelect.value = 100;

    const lightsSelect = document.getElementById("lightsValue");
    lightsSelect.innerHTML = "";
    lightsSamples.forEach(function (value) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value + " Wh";
        lightsSelect.appendChild(option);
    });
    if (lightsSamples.length > 0) {
        lightsSelect.value = lightsSamples[0];
    }
}

function updateProbability() {
    if (dataRows.length === 0) {
        return;
    }

    const applianceThreshold = Number(document.getElementById("applianceThreshold").value);
    const selectedLights = Number(document.getElementById("lightsValue").value);
    const applianceValues = getNumericValues("Appliances");
    const lightsValues = getNumericValues("lights");
    const applianceResult = probability(applianceValues, function (value) {
        return value > applianceThreshold;
    });
    const lightsResult = probability(lightsValues, function (value) {
        return value === selectedLights;
    });

    document.getElementById("applianceProbability").textContent = formatPercent(applianceResult);
    document.getElementById("lightsProbability").textContent = formatPercent(lightsResult);
}

function updateHypothesis() {
    const lowLightRows = dataRows.filter(function (row) {
        return Number(row.lights) === 30;
    });
    const highLightRows = dataRows.filter(function (row) {
        const lights = Number(row.lights);
        return lights === 40 || lights === 50;
    });
    const lowMean = mean(lowLightRows.map(function (row) {
        return Number(row.Appliances);
    }));
    const highMean = mean(highLightRows.map(function (row) {
        return Number(row.Appliances);
    }));
    const difference = highMean - lowMean;

    document.getElementById("lowLightMean").textContent = formatNumber(lowMean);
    document.getElementById("highLightMean").textContent = formatNumber(highMean);

    if (difference > 0) {
        document.getElementById("hypothesisInference").textContent =
            "The mean appliance energy consumption is higher for medium/high lights (40 and 50) by " +
            formatNumber(difference) +
            " units. This supports H1 for this descriptive comparison, meaning lights appear to be associated with appliance energy consumption.";
    } else {
        document.getElementById("hypothesisInference").textContent =
            "The mean appliance energy consumption is not higher for medium/high lights (40 and 50). Based on this descriptive comparison, there is limited evidence against H0.";
    }
}

function simulation(variableName, numberOfSimulations, noiseLevel) {
    const values = getNumericValues(variableName);
    const observedMean = mean(values);
    const observedStdDev = stdDev(values);
    const noiseMultiplier = {
        low: 0.25,
        medium: 0.5,
        high: 1
    }[noiseLevel];
    const simulatedValues = [];

    for (let i = 0; i < numberOfSimulations; i++) {
        const randomVariation = (Math.random() - 0.5) * 2 * observedStdDev * noiseMultiplier;
        let simulatedValue = observedMean + observedStdDev + randomVariation;

        if (["Appliances", "lights", "RH_1"].includes(variableName)) {
            simulatedValue = Math.max(0, simulatedValue);
        }

        simulatedValues.push(simulatedValue);
    }

    return simulatedValues;
}

function updateSimulation() {
    if (dataRows.length === 0) {
        return;
    }

    const variableName = document.getElementById("simulationVariable").value;
    const numberOfSimulations = Number(document.getElementById("simulationCount").value);
    const noiseLevel = document.getElementById("noiseLevel").value;
    const simulatedValues = simulation(variableName, numberOfSimulations, noiseLevel);

    document.getElementById("simulationMean").textContent = formatNumber(mean(simulatedValues));
    document.getElementById("simulationVariance").textContent = formatNumber(variance(simulatedValues));
    renderSimulationTable(simulatedValues);
    renderSimulationChart(simulatedValues, variableName);
}

function renderSimulationTable(simulatedValues) {
    const simulationTable = document.getElementById("simulationTable");
    simulationTable.innerHTML = "";

    simulatedValues.forEach(function (value, index) {
        const row = document.createElement("tr");
        const simulationCell = document.createElement("td");
        const valueCell = document.createElement("td");

        simulationCell.textContent = index + 1;
        valueCell.textContent = formatNumber(value);

        row.appendChild(simulationCell);
        row.appendChild(valueCell);
        simulationTable.appendChild(row);
    });
}

function renderSimulationChart(simulatedValues, variableName) {
    const labels = simulatedValues.map(function (value, index) {
        return index + 1;
    });

    if (simulationLineChart) {
        simulationLineChart.destroy();
    }

    simulationLineChart = new Chart(document.getElementById("simulationChart"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Simulated " + variableName,
                data: simulatedValues,
                borderColor: "#28785f",
                backgroundColor: "rgba(40, 120, 95, 0.12)",
                borderWidth: 2,
                pointRadius: simulatedValues.length <= 50 ? 3 : 0,
                tension: 0.25,
                fill: true
            }]
        },
        options: chartOptions("Simulation number", variableName)
    });

    resizeCharts();
}

function updateFinalInference() {
    const applianceValues = getNumericValues("Appliances");
    const lightsValues = getNumericValues("lights");
    const t1Values = getNumericValues("T1");
    const applianceMean = mean(applianceValues);
    const applianceStdDev = stdDev(applianceValues);
    const relation = correlation(applianceValues, lightsValues);
    const t1Mean = mean(t1Values);

    document.getElementById("finalInference").textContent =
        "The dataset contains " +
        dataRows.length.toLocaleString() +
        " observations and " +
        headers.length +
        " variables. Appliance energy consumption has an average value of " +
        formatNumber(applianceMean) +
        " with a standard deviation of " +
        formatNumber(applianceStdDev) +
        ". The Appliances-lights correlation is " +
        formatNumber(relation) +
        ", indicating a measurable but not complete relationship between lighting usage and appliance energy demand. The average indoor temperature T1 is " +
        formatNumber(t1Mean) +
        ", and the simulation section can be used to estimate future values under different noise assumptions.";
}

function formatNumber(value) {
    return Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 3
    });
}

function formatPercent(value) {
    return (value * 100).toLocaleString(undefined, {
        maximumFractionDigits: 2
    }) + "%";
}


function generateReport() {
    if (dataRows.length === 0) {
        return;
    }

    const applianceValues = getNumericValues("Appliances");
    const lightsValues = getNumericValues("lights");
    const applianceMean = mean(applianceValues);
    const applianceMedian = median(applianceValues);
    const applianceStdDev = stdDev(applianceValues);
    const lightsMean = mean(lightsValues);
    const lightsMedian = median(lightsValues);
    const lightsStdDev = stdDev(lightsValues);
    const correlationValue = correlation(applianceValues, lightsValues);

    document.getElementById("reportSummary").textContent =
        "This report presents a comprehensive statistical analysis of household appliance energy consumption. " +
        "The dataset contains " + dataRows.length.toLocaleString() +
        " observations across " + headers.length + " variables. " +
        "Our analysis includes descriptive statistics, correlation analysis, hypothesis testing, and simulation studies.";

    document.getElementById("rf-rows").textContent = dataRows.length.toLocaleString();
    document.getElementById("rf-vars").textContent = headers.length.toString();
    document.getElementById("kf-app-mean").textContent = formatNumber(applianceMean);
    document.getElementById("kf-lights-mean").textContent = formatNumber(lightsMean);
    document.getElementById("kf-correlation").textContent = formatNumber(correlationValue);

    document.getElementById("ra-app-mean").textContent = formatNumber(applianceMean);
    document.getElementById("ra-app-median").textContent = formatNumber(applianceMedian);
    document.getElementById("ra-app-stddev").textContent = formatNumber(applianceStdDev);
    document.getElementById("ra-lights-mean").textContent = formatNumber(lightsMean);
    document.getElementById("ra-lights-median").textContent = formatNumber(lightsMedian);
    document.getElementById("ra-lights-stddev").textContent = formatNumber(lightsStdDev);

    const lowLightRows = dataRows.filter(function (row) {
        return Number(row.lights) === 30;
    });
    const highLightRows = dataRows.filter(function (row) {
        const lights = Number(row.lights);
        return lights === 40 || lights === 50;
    });
    const lowMean = mean(lowLightRows.map(function (row) {
        return Number(row.Appliances);
    }));
    const highMean = mean(highLightRows.map(function (row) {
        return Number(row.Appliances);
    }));

    if (highMean > lowMean) {
        document.getElementById("reportHypothesis").textContent =
            "Result: There is a measurable difference in appliance energy consumption based on lighting levels. " +
            "When lights = 30, mean consumption is " + formatNumber(lowMean) + " Wh. " +
            "When lights = 40-50, mean consumption is " + formatNumber(highMean) + " Wh. " +
            "This supports the hypothesis that lighting affects appliance consumption.";
    } else {
        document.getElementById("reportHypothesis").textContent =
            "Result: The data does not show a strong difference in appliance consumption based on lighting levels. " +
            "Further investigation may be needed to establish causality.";
    }

    document.getElementById("reportConclusion").textContent =
        "The analysis reveals that appliance energy consumption varies significantly across observations, " +
        "with a mean of " + formatNumber(applianceMean) + " Wh and standard deviation of " +
        formatNumber(applianceStdDev) + " Wh. The correlation between appliances and lights is " +
        formatNumber(correlationValue) + ", indicating a measurable relationship. " +
        "These findings suggest that lighting usage is a relevant factor in understanding household energy consumption patterns.";

    const teamTable = document.getElementById("teamMembersTable");
    teamTable.innerHTML = "";
    teamMembers.forEach(function (member) {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        const idCell = document.createElement("td");
        nameCell.textContent = member.name;
        idCell.textContent = member.studentId;
        row.appendChild(nameCell);
        row.appendChild(idCell);
        teamTable.appendChild(row);
    });
}