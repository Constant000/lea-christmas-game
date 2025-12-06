#!/usr/bin/env python3
"""
Geography Games Collection
Main menu to access different games
"""

from flask import Flask, render_template, send_from_directory, jsonify
from pathlib import Path
import os

app = Flask(__name__)

# Import and register game blueprints
from flag_game.game import flag_game_bp
from toulouse_game.game import toulouse_game_bp
from top14_quiz.game import top14_quiz_bp

app.register_blueprint(flag_game_bp, url_prefix='/flag-game')
app.register_blueprint(toulouse_game_bp, url_prefix='/toulouse-game')
app.register_blueprint(top14_quiz_bp, url_prefix='/top14-quiz')

# Chemin vers les images de résultats
RESULTS_FOLDER = Path(__file__).parent / "static" / "results"


@app.route('/')
def index():
    """Single page application."""
    return render_template('index.html')


@app.route('/static/results/<path:filename>')
def serve_result_image(filename):
    """Serve result images."""
    return send_from_directory(RESULTS_FOLDER, filename)


@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest."""
    return jsonify({
        "name": "Jeux de Léa & Constant",
        "short_name": "L&C Games",
        "description": "Collection de jeux de géographie et rugby",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#667eea",
        "theme_color": "#667eea",
        "icons": [
            {
                "src": "/static/icon-192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/static/icon-512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    })


@app.route('/service-worker.js')
def service_worker():
    """Serve service worker."""
    return send_from_directory('static', 'service-worker.js', mimetype='application/javascript')


if __name__ == '__main__':
    print("\n🎮 Geography Games Collection - Single Page App")
    print("=" * 50)
    print("📱 Open http://127.0.0.1:5000 in your browser")
    print("\n🎯 Features:")
    print("   ✨ Single-page application (no page reloads)")
    print("   📡 Offline mode support")
    print("   🚀 Instant navigation between games")
    print("   💾 Service Worker caching")
    print("\n🎮 Games:")
    print("   🌍 Flag Game")
    print("   🏉 Stade Toulousain")
    print("   📊 Top 14 Quiz")
    print("=" * 50 + "\n")

    # Configuration pour production/développement
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'True') == 'True'

    app.run(host='0.0.0.0', port=port, debug=debug)