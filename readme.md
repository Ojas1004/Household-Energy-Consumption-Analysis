## Project Overview

**Household Energy Consumption Analysis (HECA)** is a statistical analysis web application dashboard for household appliance energy consumption. It analyzes the Appliance Energy Prediction dataset (19,735 observations from Skovlunde, Denmark) with descriptive statistics, correlation analysis, probability estimates, hypothesis testing, and Monte Carlo simulations.

**Architecture**: Flask (Python) backend + Vanilla JavaScript (ES5) + HTML5/CSS3 frontend with Chart.js visualizations. All statistical computations run on the backend; frontend only displays results.

## Stack

- **Backend**: Python 3.8+, Flask 3.0+, pandas 2.0+, numpy 1.24+, scipy 1.10+
- **Frontend**: Vanilla JavaScript (ES5), HTML5, CSS3, Chart.js 3.9+
- **Data**: CSV file (dataset.csv, 19,735 rows × 29 columns)

## Architecture

### Backend (Flask, app.py)

**Global State**:
- `dataset` — pandas DataFrame loaded from CSV
- `headers` — list of column names
- `dataRows` — list of row values

**Core Functions**:
- `load_dataset()` — Load CSV and populate global variables
- `calculate_statistics(column_name)` — Descriptive stats (mean, median, mode, variance, std dev, min, max, q1, q3, count)
- `calculate_correlation(col1, col2)` — Pearson correlation coefficient
- `calculate_probability(column_name, condition_type, condition_value)` — Empirical probability for conditions (greater_than, less_than, equal_to, greater_equal)
- `hypothesis_test(col1, col2, group1_value, group2_value)` — Independent t-test comparing two groups by filtering col2 on group values, testing col1
- `monte_carlo_simulation(column_name, num_simulations, noise_level)` — Generate random samples with configurable noise (low 0.1σ, medium 0.3σ, high 0.5σ)

**API Endpoints** (all return JSON):
- `GET /` — Serve dashboard HTML
- `GET /api/load-data` — Return headers, row count, variable count, and paginated data
- `GET /api/statistics/<column_name>` — Descriptive statistics for a column
- `GET /api/correlation?col1=X&col2=Y` — Pearson correlation
- `GET /api/probability?column=X&condition_type=Y&value=Z` — Empirical probability
- `GET /api/hypothesis-test?col1=X&col2=Y&group1_value=A&group2_value=B` — t-test results
- `GET /api/simulation?column=X&num_simulations=N&noise_level=L` — Monte Carlo simulation results
- `GET /api/dataset?page=P&rows_per_page=R&sort_column=C&sort_direction=D` — Paginated/sorted dataset
- `GET /api/export-report` — Download analysis report as CSV
- `GET /api/inference-data?...` — All inference data (hypothesis test + probabilities) in one call
- `GET /style.css` — Serve stylesheet
- `GET /script.js` — Serve JavaScript

**Important Details**:
- `hypothesis_test()` bug fix: line 127 must filter for col2==group2_value but extract col1 data: `dataset[dataset[col2] == float(group2_value)][col1]`
- Boolean serialization: use `bool(p_value < 0.05)` for JSON compatibility
- CSV file must be named `dataset.csv` (not data.csv)
- Flask runs on localhost:5000 with debug=False

### Frontend (web/)

**Files**:
- `index.html` — Single-page dashboard with 6 tabs (Overview, Dataset, Statistics, Inference, Simulation, Report)
- `script.js` — All frontend logic: tab navigation, API calls, charting, DOM manipulation (~450 lines)
- `style.css` — Responsive CSS Grid layouts with CSS custom properties for theming

**Key JavaScript Functions**:
- `loadDataset()` — Fetch /api/load-data, populate global `datasetHeaders`/`datasetRows`, initialize tabs
- `updateStatistics()` — Fetch /api/statistics/<variable>, display metric cards, create charts
- `createStatisticsCharts()` — Create Chart.js line chart (Appliances over time) and scatter chart (Appliances vs Lights); sample to 650 points for performance
- `updateHypothesisTest()` — Fetch /api/hypothesis-test with dropdown values, update H0/H1 formulas dynamically, display results
- `updateProbabilities()` — Fetch /api/probability data based on threshold dropdowns
- `runSimulation()` — Fetch /api/simulation, display histogram and results table
- `generateReport()` — Fetch /api/statistics/Appliances, populate report sections with analysis summary
- `displayDataset()` — Render paginated table with sorting support

**Important Details**:
- Initialization: loadDataset() → updateStatistics('Appliances') → updateCorrelation() → updateProbabilities() → updateHypothesisTest() → generateReport() → runSimulation() (with ~50-100ms delays)
- Dropdowns trigger updateHypothesisTest() + updateProbabilities() on change
- Chart containers use class="chart-panel" (300px height, responsive grid)
- Uses fetch() with promise chains (ES5 compatible)

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask server
python3 app.py

# Navigate to http://localhost:5000 in browser
```

Server logs "Running on http://127.0.0.1:5000". The dashboard auto-initializes with default statistics, charts, and hypothesis test.

## Development Workflow

### Adding a New Statistical Calculation

1. Implement function in `app.py` (e.g., `calculate_skewness()`)
2. Add API endpoint that calls it (e.g., `@app.route('/api/skewness/<column>')`)
3. Call endpoint in `script.js` where needed (e.g., in `updateStatistics()` or new function)
4. Update HTML to display result (add metric card or update existing div)

### Modifying the Hypothesis Test

The test dynamically compares appliance consumption between two user-selected conditions:
- **Group 1**: Appliances consumption where lights = [user's Lights Value selection]
- **Group 2**: Appliances consumption where Appliances > [user's Appliances Threshold selection]

To modify the hypothesis test logic:
1. In `script.js`, update `updateHypothesisTest()` to change which dropdowns are used
2. In `app.py`, modify `hypothesis_test()` function to change filtering criteria (currently: Group 1 uses equality filter on col2, Group 2 uses threshold filter on col1)
3. Update HTML element IDs and labels in index.html to reflect new comparisons

### Adding a New Tab

1. Add button to nav: `<button class="tab-button" data-tab="name">Label</button>`
2. Add section: `<section class="section-card tab-panel" data-tab-panel="name">...</section>`
3. Add API endpoint in `app.py` if new data is needed
4. Add fetch + DOM update in `script.js` if tab has interactive elements
5. Tab navigation is automatic via existing `initializeTabs()` logic

### Testing API Endpoints

```bash
# While server is running (python3 app.py):
curl http://localhost:5000/api/statistics/Appliances | python3 -m json.tool
curl 'http://localhost:5000/api/correlation?col1=Appliances&col2=lights'
curl 'http://localhost:5000/api/hypothesis-test?col1=Appliances&col2=lights&group1_value=30&group2_value=40'
curl 'http://localhost:5000/api/simulation?column=Appliances&num_simulations=100&noise_level=medium'
```

## Dataset and Variables

**File**: dataset.csv (19,735 rows × 29 columns)

**Key Columns**:
- `Appliances`, `lights` — Energy consumption (Wh)
- `T1`–`T9`, `RH_1`–`RH_9` — Temperature (°C) and humidity (%) from rooms 1–9
- `T_out`, `RH_out`, `Windspeed`, `Visibility`, `Pressure` — Outdoor environment

**Analysis Variables** (visible in dropdown):
- Appliances, lights, T1, RH_1, T_out (configurable in script.js)

## Key Statistics

From Report.tex and verified via API:
- **Appliances**: Mean 97.69 Wh, Median 60 Wh, Mode 50 Wh, Std Dev 102.52 Wh, Variance 10,510.82 Wh²
  - Range: 10–1,080 Wh (high variance due to wide spread between baseline and peak usage)
  - Count: 19,735 observations
- **Lights**: Mean 3.80 Wh (77.28% of observations are 0 — lights off most of the time)
- **Correlation**: Appliances vs Lights = 0.197 (weak positive relationship)

## Browser Compatibility

- ES5 JavaScript (no arrow functions, destructuring for broad compatibility)
- Fetch API required (no IE11 support)
- Chart.js 3.9+ for canvas visualization
- Responsive design for mobile/tablet via CSS Grid and viewport meta tag

## Performance and Scalability

- CSV load + statistics calculation: ~500ms for 19.7K rows on modern hardware
- Charts sample to 650 points to prevent rendering lag
- Pagination: 8 rows/page prevents rendering many DOM nodes
- All computation on backend; frontend is just a display layer
- For datasets >100K rows, consider:
  - Paginating data delivery from backend
  - Adding server-side data aggregation caching
  - Using Web Workers for chart rendering (frontend)

## Troubleshooting

**Port 5000 in use?**
```bash
lsof -ti:5000 | xargs kill -9
# Or change port in app.py: app.run(port=5001)
```

**"No module named flask/pandas/numpy/scipy"**
```bash
pip install -r requirements.txt
```

**Dataset not loading?**
- Verify `dataset.csv` exists in the same directory as `app.py`
- Check app.py line 26: `csv_path = os.path.join(os.path.dirname(__file__), 'dataset.csv')`
- Check server logs for "Error loading dataset"

**API returns 400 errors?**
- Check parameter names (col1, col2, condition_type, condition_value, etc.)
- Verify column names exist in dataset (case-sensitive: "Appliances", "lights", "T1", etc.)
- Check console.log in browser DevTools for fetch errors

**Charts not rendering?**
- Check browser console for JavaScript errors
- Ensure Chart.js CDN is loaded: `<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>`
- Verify chart containers have class="chart-panel" with 300px height

## Common Tasks

**Update team member names**: Edit `teamMembers` array at top of script.js

**Change default variable for statistics tab**: Modify `statsVariable` dropdown default in index.html or script.js initialization

**Add new probability threshold**: Add `<option>` to `appliancesThreshold` select in index.html, then updateProbabilities() will use new value

**Modify hypothesis test groups**: Change dropdown defaults (group1_value, group2_value) in index.html and updateHypothesisTest() function

**Change simulation noise levels**: Modify `noise_factors` dict in `monte_carlo_simulation()` function in app.py

## Requirements Documentation

The project satisfies the academic requirement to use Python for statistical computations:
- All statistics (mean, median, mode, variance, correlation, t-test, probability, simulation) are implemented in Python using pandas/numpy/scipy
- Frontend only displays results via API calls
- Refer to Report.tex for detailed mathematical methodology