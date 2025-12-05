#!/usr/bin/env python3
"""
Geography Games Collection
Main menu to access different games
"""

from flask import Flask, render_template

app = Flask(__name__)

# Import and register game blueprints
from flag_game.game import flag_game_bp
from toulouse_game.game import toulouse_game_bp
from top14_quiz.game import top14_quiz_bp

app.register_blueprint(flag_game_bp, url_prefix='/flag-game')
app.register_blueprint(toulouse_game_bp, url_prefix='/toulouse')
app.register_blueprint(top14_quiz_bp, url_prefix='/top14-quiz')

@app.route('/')
def index():
    """Main menu page."""
    return render_template('menu.html')

if __name__ == '__main__':
    print("\n🎮 Geography Games Collection")
    print("="*50)
    print("📱 Open http://127.0.0.1:5000 in your browser")
    print("\n🎯 Available Games:")
    print("   🌍 Flag Game: http://127.0.0.1:5000/flag-game/")
    print("   🏉 Stade Toulousain: http://127.0.0.1:5000/toulouse/")
    print("="*50 + "\n")
    app.run(debug=True)