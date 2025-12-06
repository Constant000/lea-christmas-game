#!/usr/bin/env python3
"""
Flag Comparison Game - Web Version
Compare countries by population, area, GDP, or density
"""

from flask import Blueprint, render_template, jsonify, send_from_directory
import random
import csv
from pathlib import Path

# Create blueprint
flag_game_bp = Blueprint('flag_game', __name__,
                         template_folder='templates',
                         static_folder='static')

FLAGS_FOLDER = Path(__file__).parent / "flags"
countries_data = []

@flag_game_bp.route('/api/all-countries')
def get_all_countries():
    """Get all countries data for offline mode."""
    return jsonify({
        'countries': countries_data
    })

def load_countries():
    """Load country data from CSV."""
    global countries_data
    countries_data = []

    csv_path = Path(__file__).parent / 'stats/countries.csv'

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            f.seek(0)

            delimiter = '\t' if '\t' in first_line else ','
            reader = csv.DictReader(f, delimiter=delimiter)

            for row in reader:
                iso2 = None
                for key in ['iso2', 'ISO2', 'id', 'Id', 'ID']:
                    if key in row and row[key]:
                        iso2 = row[key]
                        break

                if not iso2:
                    continue

                flag_file = FLAGS_FOLDER / f"{iso2.lower()}.png"
                if not flag_file.exists():
                    flag_file = FLAGS_FOLDER / f"{iso2.upper()}.png"
                    if not flag_file.exists():
                        continue

                def safe_int(value):
                    try:
                        if not value or not str(value).strip():
                            return 0
                        clean_value = str(value).replace(',', '').replace(' ', '')
                        return int(float(clean_value))
                    except:
                        return 0

                def safe_float(value):
                    try:
                        if not value or not str(value).strip():
                            return 0.0
                        clean_value = str(value).replace(',', '').replace(' ', '')
                        return float(clean_value)
                    except:
                        return 0.0

                countries_data.append({
                    'name': row.get('country', 'Unknown'),
                    'iso2': iso2.lower(),
                    'population': safe_int(row.get('population', 0)),
                    'area': safe_int(row.get('area', 0)),
                    'gdp': safe_int(row.get('gdp', 0)),
                    'density': safe_float(row.get('density', 0))
                })

        print(f"✓ Loaded {len(countries_data)} countries for flag game")
        return countries_data
    except Exception as e:
        print(f"Error loading CSV: {e}")
        import traceback
        traceback.print_exc()
        return []


@flag_game_bp.route('/')
def index():
    """Serve the main game page."""
    return render_template('flag_game.html')


@flag_game_bp.route('/flags/<path:filename>')
def serve_flag(filename):
    """Serve flag images."""
    return send_from_directory(FLAGS_FOLDER, filename)


@flag_game_bp.route('/api/question')
def get_question():
    """Get a random comparison question."""
    if len(countries_data) < 4:
        return jsonify({'error': 'Not enough countries loaded'}), 404

    metrics = ['population', 'area', 'gdp', 'density']
    metric = random.choice(metrics)

    valid_countries = [c for c in countries_data if c[metric] > 0]

    if len(valid_countries) < 4:
        return jsonify({'error': f'Not enough countries with {metric} data'}), 404

    random.shuffle(valid_countries)
    selected_countries = valid_countries[:4]

    sorted_countries = sorted(selected_countries, key=lambda x: x[metric], reverse=True)
    correct_country = sorted_countries[0]

    # Rugby field conversion constant (1 field ≈ 10,000 m²)
    RUGBY_FIELD_SIZE = 10000  # m²

    options = []
    for country in selected_countries:
        value = country[metric]
        # Convert area from km² to rugby fields
        if metric == 'area':
            value = int((value * 1_000_000) / RUGBY_FIELD_SIZE)  # km² to m² to rugby fields

        options.append({
            'name': country['name'],
            'iso2': country['iso2'],
            'value': value
        })

    random.shuffle(options)

    question_texts = {
        'population': 'Allez ma loute, quel pays à la plus grande population ?',
        'area': 'Quel pays a la plus grande superficie ?',
        'gdp': 'Quel pays a le plus grand PIB ? (pas par habitant hein)',
        'density': 'Quel pays à la plus forte densité ?'
    }

    return jsonify({
        'question': question_texts[metric],
        'metric': metric,
        'options': options,
        'correct_answer': correct_country['name']
    })


# Load countries when module is imported
load_countries()