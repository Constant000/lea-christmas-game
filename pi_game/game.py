
"""
Pi Decimals Game - Ranked Mode
Guess the next decimal of Pi
"""
from datetime import datetime

from flask import Blueprint, render_template, jsonify, request
import json
from pathlib import Path
import random

# Create blueprint
pi_game_bp = Blueprint('pi_game', __name__,
                       template_folder='templates',
                       static_folder='static')

# Pi decimals (first 1000 digits after the decimal point)
PI_DECIMALS = "1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989"

LEADERBOARD_FILE = Path(__file__).parent / "data" / "pi_leaderboard.json"
LEADERBOARD_FILE.parent.mkdir(exist_ok=True)


def load_leaderboard():
    """Load leaderboard from file."""
    if LEADERBOARD_FILE.exists():
        with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_leaderboard(leaderboard):
    """Save leaderboard to file."""
    with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
        json.dump(leaderboard, f, indent=2, ensure_ascii=False)


@pi_game_bp.route('/')
def index():
    """Serve the main game page."""
    return render_template('pi_game.html')


@pi_game_bp.route('/api/question')
def get_question():
    """Get a question about the next Pi decimal."""
    position = request.args.get('position', 0, type=int)

    if position < 0 or position >= len(PI_DECIMALS):
        return jsonify({'error': 'Invalid position'}), 400

    correct_digit = int(PI_DECIMALS[position])

    # Generate 3 wrong answers (different from correct)
    wrong_digits = [d for d in range(10) if d != correct_digit]
    wrong_answers = random.sample(wrong_digits, 3)

    # Combine and shuffle
    options = [correct_digit] + wrong_answers
    random.shuffle(options)

    # Show previous digits for context (last 10)
    start = max(0, position - 10)
    previous_digits = PI_DECIMALS[start:position]

    return jsonify({
        'position': position,
        'previous_digits': previous_digits,
        'options': options,
        'correct': correct_digit
    })


@pi_game_bp.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top 20 scores."""
    leaderboard = load_leaderboard()
    leaderboard.sort(key=lambda x: (-x['position']))
    return jsonify({'leaderboard': leaderboard[:20]})


@pi_game_bp.route('/api/submit-score', methods=['POST'])
def submit_score():
    """Submit a new score."""
    data = request.json

    # Validate data
    if not data.get('name') or data.get('position') is None:
        return jsonify({'error': 'Missing required fields'}), 400

    leaderboard = load_leaderboard()

    # Add new entry
    entry = {
        'name': data['name'][:20],
        'position': int(data['position']),
        'date': datetime.now().isoformat()
    }

    leaderboard.append(entry)

    # Keep only top 100
    leaderboard.sort(key=lambda x: -x['position'])
    leaderboard = leaderboard[:100]

    save_leaderboard(leaderboard)

    # Return rank
    rank = next((i + 1 for i, e in enumerate(leaderboard) if e == entry), None)

    return jsonify({
        'success': True,
        'rank': rank,
        'total': len(leaderboard)
    })


print(f"✓ Pi Game loaded with {len(PI_DECIMALS)} decimals\n")