#!/usr/bin/env python3
"""
Geography Games Collection
Main menu to access different games
"""

from flask import Flask, render_template, send_from_directory, send_file
from pathlib import Path
import os

app = Flask(__name__)

# Import and register game blueprints
from flag_game.game import flag_game_bp
from toulouse_game.game import toulouse_game_bp
from top14_quiz.game import top14_quiz_bp

app.register_blueprint(flag_game_bp, url_prefix='/flag-game')
app.register_blueprint(toulouse_game_bp, url_prefix='/toulouse')
app.register_blueprint(top14_quiz_bp, url_prefix='/top14-quiz')

# Chemin vers les images de résultats
RESULTS_FOLDER = Path(__file__).parent / "rugby_game" / "results_png"


@app.route('/')
def index():
    """Main menu page."""
    return render_template('menu.html')


@app.route('/static/results/<path:filename>')
def serve_result_image(filename):
    """Serve result images."""
    return send_from_directory(RESULTS_FOLDER, filename)


@app.route('/service-worker.js')
def service_worker():
    """Serve service worker."""
    return send_file('static/service-worker.js', mimetype='application/javascript')


if __name__ == '__main__':
    print("\n🎮 Geography Games Collection")
    print("=" * 50)
    print("📱 Open http://127.0.0.1:5000 in your browser")
    print("\n🎯 Available Games:")
    print("   🌍 Flag Game: http://127.0.0.1:5000/flag-game/")
    print("   🏉 Stade Toulousain: http://127.0.0.1:5000/toulouse/")
    print("   📊 Top 14 Quiz: http://127.0.0.1:5000/top14-quiz/")
    print("=" * 50 + "\n")

    # Configuration pour production/développement
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'True') == 'True'

    app.run(host='0.0.0.0', port=port, debug=debug)