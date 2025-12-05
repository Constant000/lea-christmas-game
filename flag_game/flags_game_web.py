#!/usr/bin/env python3
"""
Flag Comparison Game - Web Version
Compare countries by population, area, GDP, or density
"""

from flask import Flask, render_template, jsonify, send_from_directory
import random
import csv
from pathlib import Path

app = Flask(__name__)

FLAGS_FOLDER = Path("flags")
countries_data = []


def load_countries():
    """Load country data from CSV."""
    global countries_data
    countries_data = []

    try:
        with open('countries.csv', 'r', encoding='utf-8') as f:
            # Read first line to check delimiter
            first_line = f.readline()
            print(f"First line: {first_line[:100]}")

            # Reset file pointer
            f.seek(0)

            # Try to detect delimiter
            if '\t' in first_line:
                delimiter = '\t'
                print("Using TAB delimiter")
            elif ',' in first_line:
                delimiter = ','
                print("Using COMMA delimiter")
            else:
                delimiter = '\t'
                print("Defaulting to TAB delimiter")

            reader = csv.DictReader(f, delimiter=delimiter)

            # Print column names
            print(f"CSV Columns: {reader.fieldnames}")

            # Process rows
            for row in reader:
                process_row(row)

        print(f"Successfully loaded {len(countries_data)} countries")
        return countries_data
    except Exception as e:
        print(f"Error loading CSV: {e}")
        import traceback
        traceback.print_exc()
        return []


def process_row(row):
    """Process a single CSV row."""
    try:
        # Get ISO2 code - try different possible column names
        iso2 = None
        for key in ['iso2', 'ISO2', 'id', 'Id', 'ID']:
            if key in row and row[key]:
                iso2 = row[key]
                break

        if not iso2:
            print(f"Skipping row - no ISO2 code found: {row.get('country', 'Unknown')}")
            return

        # Check if flag file exists
        flag_file = FLAGS_FOLDER / f"{iso2.lower()}.png"
        if not flag_file.exists():
            # Try uppercase
            flag_file = FLAGS_FOLDER / f"{iso2.upper()}.png"
            if not flag_file.exists():
                print(f"Flag not found for {row.get('country', 'Unknown')}: {iso2}.png")
                return

        # Parse numeric values safely
        def safe_int(value):
            try:
                if not value or not str(value).strip():
                    return 0
                # Remove any commas or spaces
                clean_value = str(value).replace(',', '').replace(' ', '')
                return int(float(clean_value))
            except:
                return 0

        def safe_float(value):
            try:
                if not value or not str(value).strip():
                    return 0.0
                # Remove any commas or spaces
                clean_value = str(value).replace(',', '').replace(' ', '')
                return float(clean_value)
            except:
                return 0.0

        country_data = {
            'name': row.get('country', 'Unknown'),
            'iso2': iso2.lower(),
            'population': safe_int(row.get('population', 0)),
            'area': safe_int(row.get('area', 0)),
            'gdp': safe_int(row.get('gdp', 0)),
            'density': safe_float(row.get('density', 0))
        }

        countries_data.append(country_data)
        print(f"✓ Loaded: {country_data['name']} ({iso2})")

    except Exception as e:
        print(f"Error processing row: {e}")
        import traceback
        traceback.print_exc()


@app.route('/')
def index():
    """Serve the main game page."""
    return render_template('index.html')


@app.route('/flags/<path:filename>')
def serve_flag(filename):
    """Serve flag images."""
    return send_from_directory(FLAGS_FOLDER, filename)


@app.route('/api/question')
def get_question():
    """Get a random comparison question."""
    if len(countries_data) < 4:
        return jsonify({'error': 'Not enough countries loaded'}), 404

    # Select random metric
    metrics = ['population', 'area', 'gdp', 'density']
    metric = random.choice(metrics)

    # Select 4 random countries with non-zero values for the metric
    valid_countries = [c for c in countries_data if c[metric] > 0]

    if len(valid_countries) < 4:
        return jsonify({'error': f'Not enough countries with {metric} data'}), 404

    # Shuffle valid countries first for more randomness
    random.shuffle(valid_countries)
    selected_countries = valid_countries[:4]

    # Sort by metric to find the correct answer
    sorted_countries = sorted(selected_countries, key=lambda x: x[metric], reverse=True)
    correct_country = sorted_countries[0]

    # Prepare options
    options = []
    for country in selected_countries:
        options.append({
            'name': country['name'],
            'iso2': country['iso2'],
            'value': country[metric]
        })

    # Shuffle options again for display
    random.shuffle(options)

    # Create question text
    question_texts = {
        'population': 'Which country has the HIGHEST population?',
        'area': 'Which country has the LARGEST area?',
        'gdp': 'Which country has the HIGHEST GDP?',
        'density': 'Which country has the HIGHEST population density?'
    }

    return jsonify({
        'question': question_texts[metric],
        'metric': metric,
        'options': options,
        'correct_answer': correct_country['name']
    })


if __name__ == '__main__':
    load_countries()
    if not countries_data:
        print("\n" + "=" * 50)
        print("ERROR: No countries loaded!")
        print("=" * 50)
        print("\nPlease check:")
        print("1. countries.csv exists in the same folder")
        print("2. CSV has headers: country, iso2, population, area, gdp, density")
        print("3. flags/ folder contains PNG files with ISO2 codes")
        print("   Example: cn.png, us.png, fr.png (lowercase)")
        print("   Or: CN.png, US.png, FR.png (uppercase)")
    else:
        print(f"\n✅ Loaded {len(countries_data)} countries")
        print("🚀 Starting server...")
        print("📱 Open http://127.0.0.1:5000 in your browser\n")
        app.run(debug=True)