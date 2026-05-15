import io
import os
import csv
import json
import numpy as np
import pandas as pd
from scipy import stats
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory

# Configure Flask to serve from web folder
app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(__file__), 'web'),
            static_folder=None)

# Global variable to store dataset
dataset = None
headers = []
dataRows = []

def load_dataset():
    """Load and parse the CSV dataset"""
    global dataset, headers, dataRows

    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'dataset.csv')
        dataset = pd.read_csv(csv_path)
        headers = dataset.columns.tolist()
        dataRows = dataset.values.tolist()
        return True
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return False

def calculate_mode(values):
    """Calculate mode of a list of values"""
    try:
        mode_result = stats.mode(values, keepdims=True)
        return float(mode_result.mode[0])
    except:
        return None

def calculate_statistics(column_name):
    """Calculate descriptive statistics for a column"""
    if dataset is None or column_name not in dataset.columns:
        return None

    values = dataset[column_name].dropna().astype(float).values

    if len(values) == 0:
        return None

    stats_dict = {
        'column': column_name,
        'count': int(len(values)),
        'mean': float(np.mean(values)),
        'median': float(np.median(values)),
        'mode': calculate_mode(values),
        'variance': float(np.var(values, ddof=0)),
        'std_dev': float(np.std(values, ddof=0)),
        'min': float(np.min(values)),
        'max': float(np.max(values)),
        'q1': float(np.percentile(values, 25)),
        'q3': float(np.percentile(values, 75))
    }

    return stats_dict

def calculate_correlation(col1, col2):
    """Calculate Pearson correlation between two columns"""
    if dataset is None or col1 not in dataset.columns or col2 not in dataset.columns:
        return None

    try:
        valid_data = dataset[[col1, col2]].dropna()
        if len(valid_data) < 2:
            return None

        correlation = float(valid_data[col1].corr(valid_data[col2]))
        return correlation
    except:
        return None

def calculate_probability(column_name, condition_type, condition_value):
    """Calculate empirical probability for a condition"""
    if dataset is None or column_name not in dataset.columns:
        return None

    try:
        values = dataset[column_name].dropna().astype(float)
        total = len(values)

        if total == 0:
            return None

        if condition_type == 'greater_than':
            count = len(values[values > float(condition_value)])
        elif condition_type == 'less_than':
            count = len(values[values < float(condition_value)])
        elif condition_type == 'equal_to':
            count = len(values[values == float(condition_value)])
        elif condition_type == 'greater_equal':
            count = len(values[values >= float(condition_value)])
        else:
            return None

        probability = count / total
        return {
            'probability': float(probability),
            'count': int(count),
            'total': int(total),
            'percentage': float(probability * 100)
        }
    except:
        return None

def hypothesis_test(col1, col2, group1_value, group2_value):
    """Perform hypothesis test comparing means between two groups"""
    if dataset is None or col1 not in dataset.columns or col2 not in dataset.columns:
        return None

    try:
        # Group 1: where col2 == group1_value (exact match)
        group1 = dataset[dataset[col2] == float(group1_value)][col1].dropna().astype(float)

        # Group 2: where col1 > group2_value (threshold-based, for appliances threshold)
        group2 = dataset[dataset[col1] > float(group2_value)][col1].dropna().astype(float)

        if len(group1) < 2 or len(group2) < 2:
            return None

        mean1 = float(np.mean(group1))
        mean2 = float(np.mean(group2))
        std1 = float(np.std(group1, ddof=1))
        std2 = float(np.std(group2, ddof=1))

        # Perform t-test
        t_stat, p_value = stats.ttest_ind(group1, group2)

        return {
            'group1_value': float(group1_value),
            'group1_mean': mean1,
            'group1_std': std1,
            'group1_count': int(len(group1)),
            'group2_value': float(group2_value),
            'group2_mean': mean2,
            'group2_std': std2,
            'group2_count': int(len(group2)),
            't_statistic': float(t_stat),
            'p_value': float(p_value),
            'significant': bool(p_value < 0.05)
        }
    except Exception as e:
        print(f"Error in hypothesis test: {e}")
        return None

def monte_carlo_simulation(column_name, num_simulations, noise_level='medium'):
    """Perform Monte Carlo simulation"""
    if dataset is None or column_name not in dataset.columns:
        return None

    try:
        values = dataset[column_name].dropna().astype(float).values

        if len(values) == 0:
            return None

        mean = np.mean(values)
        std = np.std(values, ddof=0)

        # Noise levels
        noise_factors = {'low': 0.1, 'medium': 0.3, 'high': 0.5}
        noise = noise_factors.get(noise_level, 0.3) * std

        # Generate simulations
        simulations = np.random.normal(mean, noise, int(num_simulations))

        sim_results = {
            'simulations': simulations.tolist(),
            'mean': float(np.mean(simulations)),
            'variance': float(np.var(simulations, ddof=0)),
            'std_dev': float(np.std(simulations, ddof=0)),
            'min': float(np.min(simulations)),
            'max': float(np.max(simulations))
        }

        return sim_results
    except Exception as e:
        print(f"Error in simulation: {e}")
        return None

@app.route('/')
def index():
    """Serve the main dashboard"""
    return render_template('index.html')

@app.route('/api/load-data')
def api_load_data():
    """API endpoint to load dataset"""
    if load_dataset():
        return jsonify({
            'success': True,
            'headers': headers,
            'rowCount': len(dataRows),
            'variableCount': len(headers),
            'data': {
                'headers': headers,
                'rows': dataRows
            }
        })
    else:
        return jsonify({'success': False, 'error': 'Failed to load dataset'}), 500

@app.route('/api/statistics/<column_name>')
def api_statistics(column_name):
    """API endpoint for descriptive statistics"""
    stats_result = calculate_statistics(column_name)
    if stats_result:
        return jsonify(stats_result)
    else:
        return jsonify({'error': 'Could not calculate statistics'}), 400

@app.route('/api/correlation')
def api_correlation():
    """API endpoint for correlation"""
    col1 = request.args.get('col1')
    col2 = request.args.get('col2')

    correlation = calculate_correlation(col1, col2)
    if correlation is not None:
        return jsonify({'correlation': correlation, 'col1': col1, 'col2': col2})
    else:
        return jsonify({'error': 'Could not calculate correlation'}), 400

@app.route('/api/probability')
def api_probability():
    """API endpoint for probability calculation"""
    column = request.args.get('column')
    condition_type = request.args.get('condition_type')
    condition_value = request.args.get('value')

    prob_result = calculate_probability(column, condition_type, condition_value)
    if prob_result:
        return jsonify(prob_result)
    else:
        return jsonify({'error': 'Could not calculate probability'}), 400

@app.route('/api/hypothesis-test')
def api_hypothesis_test():
    """API endpoint for hypothesis testing"""
    col1 = request.args.get('col1')
    col2 = request.args.get('col2')
    group1_value = request.args.get('group1_value')
    group2_value = request.args.get('group2_value')

    result = hypothesis_test(col1, col2, group1_value, group2_value)
    if result:
        return jsonify(result)
    else:
        return jsonify({'error': 'Could not perform hypothesis test'}), 400

@app.route('/api/simulation')
def api_simulation():
    """API endpoint for Monte Carlo simulation"""
    column = request.args.get('column')
    num_simulations = int(request.args.get('num_simulations', 100))
    noise_level = request.args.get('noise_level', 'medium')

    result = monte_carlo_simulation(column, num_simulations, noise_level)
    if result:
        return jsonify(result)
    else:
        return jsonify({'error': 'Could not perform simulation'}), 400

@app.route('/api/export-report')
def api_export_report():
    """Export analysis report as CSV"""
    if dataset is None:
        return jsonify({'error': 'No dataset loaded'}), 400

    try:
        output = io.StringIO()
        writer = csv.writer(output)

        # Report header
        writer.writerow(['Household Energy Consumption Analysis - Report Export'])
        writer.writerow(['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])

        # Descriptive statistics
        writer.writerow(['Descriptive Statistics'])
        writer.writerow(['Variable', 'Mean', 'Median', 'Std Dev', 'Min', 'Max'])

        stats_vars = ['Appliances', 'lights', 'T1', 'RH_1', 'T_out']
        for var in stats_vars:
            if var in dataset.columns:
                stats_result = calculate_statistics(var)
                if stats_result:
                    writer.writerow([
                        var,
                        f"{stats_result['mean']:.2f}",
                        f"{stats_result['median']:.2f}",
                        f"{stats_result['std_dev']:.2f}",
                        f"{stats_result['min']:.2f}",
                        f"{stats_result['max']:.2f}"
                    ])

        writer.writerow([])
        writer.writerow(['Correlation Analysis'])
        corr = calculate_correlation('Appliances', 'lights')
        if corr:
            writer.writerow(['Appliances vs lights', f"{corr:.4f}"])

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name='analysis_report.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dataset')
def api_get_dataset():
    """Get full dataset or paginated data"""
    if dataset is None:
        return jsonify({'error': 'No dataset loaded'}), 400

    page = int(request.args.get('page', 1))
    rows_per_page = int(request.args.get('rows_per_page', 8))
    sort_column = request.args.get('sort_column', '')
    sort_direction = request.args.get('sort_direction', 'asc')

    # Create a copy for sorting
    data_copy = dataset.copy()

    # Sort if requested
    if sort_column and sort_column in data_copy.columns:
        ascending = sort_direction.lower() == 'asc'
        data_copy = data_copy.sort_values(by=sort_column, ascending=ascending)

    # Paginate
    total_rows = len(data_copy)
    total_pages = (total_rows + rows_per_page - 1) // rows_per_page
    start_idx = (page - 1) * rows_per_page
    end_idx = min(start_idx + rows_per_page, total_rows)

    paginated_data = data_copy.iloc[start_idx:end_idx]

    return jsonify({
        'headers': headers,
        'data': paginated_data.values.tolist(),
        'page': page,
        'total_pages': total_pages,
        'total_rows': total_rows,
        'rows_per_page': rows_per_page
    })

@app.route('/style.css')
def serve_css():
    """Serve CSS file"""
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), 'web'),
        'style.css',
        mimetype='text/css'
    )

@app.route('/script.js')
def serve_js():
    """Serve JavaScript file"""
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), 'web'),
        'script.js',
        mimetype='application/javascript'
    )

@app.route('/api/inference-data')
def api_inference_data():
    """Get all inference data at once for the Inference tab"""
    group1_value = request.args.get('group1_value', '30')
    group2_value = request.args.get('group2_value', '40')

    try:
        # Hypothesis test
        hyp_test = hypothesis_test('Appliances', 'lights', group1_value, group2_value)

        # Probabilities
        app_prob = calculate_probability('Appliances', 'greater_than', request.args.get('app_threshold', '50'))
        lights_prob = calculate_probability('lights', 'equal_to', request.args.get('lights_value', '0'))

        return jsonify({
            'hypothesis_test': hyp_test,
            'appliances_probability': app_prob,
            'lights_probability': lights_prob,
            'group1_value': float(group1_value),
            'group2_value': float(group2_value)
        })
    except Exception as e:
        print(f"Error in inference data: {e}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    # Load dataset on startup
    load_dataset()
    app.run(debug=False, host='localhost', port=5000)
