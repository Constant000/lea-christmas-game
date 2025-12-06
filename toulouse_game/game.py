#!/usr/bin/env python3
"""
Stade Toulousain Player Guessing Game
Guess the player's name and position from their photo
"""

from flask import Blueprint, render_template, jsonify, send_from_directory
import random
import os
from pathlib import Path

# Create blueprint
toulouse_game_bp = Blueprint('toulouse_game', __name__,
                             template_folder='templates',
                             static_folder='static')

PLAYERS_FOLDER = Path(__file__).parent / "stats" / "joueur_stade_toulousain"

# Position mapping
POSITIONS = {
    '1ere_ligne_png': '1ère ligne',
    '2eme_ligne_png': '2ème ligne',
    '3eme_ligne_png': '3ème ligne',
    'aillier_png': 'Ailier',
    'arriere_png': 'Arrière',
    'centre_png': 'Centre',
    'demi_d_ouverture_png': "Demi d'ouverture"
}

players_data = []


def load_players():
    """Load all players from folders."""
    global players_data
    players_data = []

    print(f"🔍 Looking for players in: {PLAYERS_FOLDER}")
    print(f"🔍 Folder exists: {PLAYERS_FOLDER.exists()}")

    for folder_name, position in POSITIONS.items():
        folder_path = PLAYERS_FOLDER / folder_name

        if not folder_path.exists():
            print(f"⚠️  Warning: Folder {folder_path} does not exist")
            continue

        # Get all PNG files in the folder
        png_files = list(folder_path.glob("*.png"))
        print(f"✓ Found {len(png_files)} files in {folder_name}")

        for png_file in png_files:
            # Extract player name from filename (remove .png extension)
            filename = png_file.stem  # Gets filename without extension

            # Convert name_name.png to "Name NAME"
            # Replace all underscores with spaces, then format properly
            parts = filename.split('_')
            if len(parts) >= 2:
                # First part is the first name (capitalize each word for composed names)
                first_name = ' '.join(word.capitalize() for word in parts[0].split())
                # Rest is the last name (uppercase, replace _ with spaces)
                last_name = ' '.join(parts[1:]).upper()
                full_name = f"{first_name} {last_name}"
            else:
                # Fallback: just replace underscores with spaces and title case
                full_name = filename.replace('_', ' ').title()

            players_data.append({
                'name': full_name,
                'position': position,
                'image_path': f"{folder_name}/{png_file.name}",
                'folder': folder_name
            })

    print(f"\n✓ Loaded {len(players_data)} players from Stade Toulousain\n")
    return players_data

@toulouse_game_bp.route('/api/all-players')
def get_all_players():
    """Get all players data for offline mode."""
    return jsonify({
        'players': players_data,
        'positions': list(POSITIONS.values())
    })

@toulouse_game_bp.route('/')
def index():
    """Serve the main game page."""
    return render_template('toulouse_game.html')


@toulouse_game_bp.route('/players/<path:filename>')
def serve_player_image(filename):
    """Serve player images."""
    return send_from_directory(PLAYERS_FOLDER, filename)


@toulouse_game_bp.route('/api/question')
def get_question():
    """Get a random player question."""
    if len(players_data) < 4:
        return jsonify({'error': 'Not enough players loaded'}), 404

    # Select a random correct player
    correct_player = random.choice(players_data)

    # Get 3 other random names for wrong answers
    other_players = [p for p in players_data if p['name'] != correct_player['name']]
    wrong_names = random.sample(other_players, min(3, len(other_players)))

    # Create name options
    name_options = [correct_player['name']] + [p['name'] for p in wrong_names]
    random.shuffle(name_options)

    # Get 3 other random positions for wrong answers
    all_positions = list(POSITIONS.values())
    wrong_positions = [p for p in all_positions if p != correct_player['position']]
    position_options = [correct_player['position']] + random.sample(wrong_positions, min(3, len(wrong_positions)))
    random.shuffle(position_options)

    return jsonify({
        'image': correct_player['image_path'],
        'name_options': name_options,
        'position_options': position_options,
        'correct_name': correct_player['name'],
        'correct_position': correct_player['position']
    })


@toulouse_game_bp.route('/api/stats')
def get_stats():
    """Get game statistics."""
    position_counts = {}
    for position in POSITIONS.values():
        count = len([p for p in players_data if p['position'] == position])
        position_counts[position] = count

    return jsonify({
        'total_players': len(players_data),
        'positions': position_counts
    })


# Load players when module is imported
load_players()