## Project Overview

**Household Energy Consumption Analysis** is an interactive web-based statistical analysis dashboard that visualizes and analyzes household appliance energy consumption patterns using the Appliance Energy Prediction dataset. It provides descriptive statistics, trend visualization, probability analysis, hypothesis testing, and Monte Carlo simulations.

## Architecture

### Core Files
- **index.html** — Single-page application markup with tabbed interface and Chart.js canvas elements
- **script.js** — Vanilla JavaScript (no framework) with statistical calculations, CSV parsing, charting, and DOM manipulation
- **style.css** — CSS custom properties (variables) for theming; responsive grid layouts for dashboard components
- **dataset.csv** — The Appliance Energy Prediction dataset (~19K rows); CSV is loaded client-side via fetch

### Key Concepts

**Tab-Based Navigation**: The dashboard has 6 tabs (Overview, Dataset, Statistics, Inference, Simulation, Report), each represented by a tab panel in the DOM. Tab switching is driven by click handlers and URL hash changes for bookmarkable states. Tabs are organized by statistical methodology: describe → explore relationships → test/infer → predict → summarize. The Overview tab displays key metrics and UCI dataset context, while the Report tab provides comprehensive statistical analysis with team information.

**Statistical Calculations**: All analysis is computed client-side:
- **Descriptive stats** (mean, median, mode, variance, std dev) via math functions
- **Correlation & trends** — Scatter plots and line charts showing bivariate relationships and temporal patterns
- **Probability estimates** — Empirical cumulative distribution (matching condition count / total count) with dropdown-selected thresholds
- **Hypothesis testing** — Compares means between groups (lights = 30 vs lights ≥ 40) with inference text
- **Simulation** — Generates random observations from the empirical distribution with configurable noise (10–500 simulations)

**Data Pipeline**: CSV → parsing (custom parser handles quoted fields and CRLF) → object array → filtering/sorting for table → slicing for pagination → aggregation for stats/charts.

**Charting**: Chart.js instances are stored in global variables (`applianceLineChart`, `scatterChart`, `simulationLineChart`). Charts must be destroyed and recreated when data changes. Resize is triggered both immediately (requestAnimationFrame) and with a 120ms delay to handle async layout.

## Development Workflow

### Viewing the Dashboard
- Open `index.html` in a browser (or use a local HTTP server to avoid CORS issues on CSV fetch)
- Browser console logs loading errors if dataset.csv cannot be found
- Overview tab displays 4 key metric cards (observations, variables, appliances mean, lights mean) plus UCI dataset description (Skovlunde, Denmark; Jan 11–Feb 21 & Jun 5–19, 2010; 19,735 observations at 10-min intervals)
- Dataset table uses 6 rows per page (reduced from 10) to fit on a single viewport without vertical scroll
- Simulation table max-height set to 260px for compact single-page display

### Report Tab
The Report tab displays a professional statistical summary with:
- **generateReport()** — Populates all report sections with computed statistics (called when data loads)
- **printReport()** — Triggers browser print (CSS media query hides UI chrome for professional PDF output)
- **exportReportCSV()** — Generates and downloads CSV file with comprehensive analysis data
- **Team Members Table** — Lists all team members with their student IDs at the bottom of the report

Team members are configured in the `teamMembers` array at the top of script.js with name and studentId properties.

### Adding a New Statistical Metric
1. Add a calculation function (e.g., `quartile()`)
2. Update `updateStatistics()` to include it in the statistics array
3. Optionally add it to UI controls (e.g., dropdown in `statsVariable` list)
4. Update `generateReport()` to include it in the CSV export if needed

### Adding a New Tab
1. Add a `<button class="tab-button" data-tab="name">Label</button>` to the nav
2. Add a `<section class="section-card tab-panel" data-tab-panel="name">` with content
3. Tab activation happens automatically via existing `initializeTabs()` logic

### Modifying Dataset Columns
- Important columns are hardcoded in `importantColumns` array at the top of script.js
- Filter/sort functions iterate over all headers dynamically, so new columns are automatically supported in the table

## Common Tasks

**Update displayed statistics for a variable**: Modify the `statistics` array in `updateStatistics()` (line ~389).

**Change probability thresholds**: The Appliances threshold and lights value dropdowns are populated by `populateProbabilityDropdowns()`. Appliances offers preset percentiles (25–250 Wh), lights values are auto-generated from dataset unique values. Modify the function to change available options.

**Adjust chart appearance**: Modify `chartOptions()` function or the Chart.js config objects in `createTrendCharts()`. Chart heights are 300px (panel) / 240px (canvas); `.chart-grid` has 20px top margin and 20px gap between charts.

**Fix CSV parsing issues**: Debug in `parseCSV()` function; handles quoted fields and CRLF correctly but may need adjustment for unusual CSV dialects.

**Resize chart on tab switch**: Already implemented; calls `resizeCharts()` on tab activation.

**Customize report content**: Edit the HTML report section divs or modify `generateReport()` to populate different metrics. Report auto-generates on data load.

**Change report styling**: Modify `.report-*` classes in style.css. Print media query handles PDF formatting (hides tabs, optimizes spacing, controls page breaks).

## Data and Variables

### Key Dataset Columns
- **date** — Observation timestamp
- **Appliances** — Energy consumption of appliances (Wh)
- **lights** — Energy consumption of lights (Wh)
- **T1, T2, ..., T9** — Temperature readings from different rooms (°C)
- **RH_1, RH_2, ..., RH_9** — Relative humidity readings (%); tracked and displayed
- **T_out** — Outdoor temperature (°C)
- **RH_out** — Outdoor relative humidity (%)
- **Windspeed** — Wind speed (m/s)
- **Visibility** — Visibility (km)
- **Pressure** — Atmospheric pressure (mm Hg)

### Analysis Variables
`statsVariables` array defines which columns are used for statistical analysis (Appliances, lights, T1, RH_1, T_out). Extend this list to include more variables in statistics dropdowns.

## Styling and Theming

CSS uses CSS custom properties (`:root` variables) for colors:
- `--bg`, `--surface`, `--text`, `--accent`, etc.
- Grid layouts (`.metric-grid`, `.control-grid`, `.chart-grid`) are responsive via CSS Grid
- Important columns are highlighted with a soft background color

Change the color scheme by updating `:root` variables in style.css.

## Browser Compatibility

- Uses ES5-compatible JavaScript (no modern syntax like arrow functions or destructuring in release code for broad compatibility)
- Relies on Fetch API (no IE11 support)
- Chart.js handles canvas rendering
- Responsive design works on mobile via viewport meta tag and CSS media queries

## Performance Notes

- CSV parsing and all calculations are synchronous on the main thread (acceptable for ~19K rows)
- Large datasets (100K+ rows) may benefit from Web Workers for parsing/stats
- Charts are sampled to 650 points to keep rendering performant
- Pagination (6 rows/page) prevents rendering many rows at once; reduced from 10 to ensure single-page fit without vertical scroll

## Tab Structure and Content

**1. Overview** — Introduction with 4 key metrics, UCI dataset details (location, time period, observation count, measurement interval, variables), and analysis methodology.

**2. Dataset** — Interactive data table with sortable headers, pagination controls, row count display. Shows all dataset columns dynamically.

**3. Statistics** — Two subsections separated by a divider:
- Central Tendency and Dispersion: Metric cards (mean, median, mode, variance, std dev) for selected variable via dropdown
- Correlation and Trends: Correlation card + two charts (Appliances Over Time line chart, Appliances vs lights scatter chart)

**4. Inference** — Two subsections:
- Probability Estimates (top): Dropdown inputs for Appliances threshold (preset percentiles) and lights value (auto-populated), with two probability metric cards
- Hypothesis Test (bottom): H0/H1 hypothesis cards, mean comparison metric cards, and inference text explaining the result

**5. Simulation** — Controls for variable (Appliances or Lights), simulation count (10–500), and noise level (low/medium/high). Displays simulated mean/variance, plus a line chart and results table side-by-side.

**6. Report** — Professional statistical summary with executive summary, dataset overview, key findings, detailed analysis blocks, hypothesis test results, conclusions, and team member table.