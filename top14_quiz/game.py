#!/usr/bin/env python3
"""
Top 14 Quiz Game
Test your knowledge about Top 14 2024-2025 season
"""

from flask import Blueprint, render_template, jsonify
import random
import json
from pathlib import Path

# Create blueprint
top14_quiz_bp = Blueprint('top14_quiz', __name__,
                          template_folder='templates',
                          static_folder='static')

# Load data
DATA_FOLDER = Path(__file__).parent / "stats"


def load_json_data(filename):
    """Load JSON data file."""
    try:
        with open(DATA_FOLDER / filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return None


# Load all data
classement = load_json_data('classement_final_top_14_2025.json')
buteurs = load_json_data('meilleur-buteur-2024-2025.json')
stats = load_json_data('stats_globales_2024-2025.json')
playoffs = load_json_data('stats_phases_finales_2025.json')

print(f"📊 Loading Top 14 Quiz data...")
print(f"  - Classement: {len(classement) if classement else 0} équipes")
print(f"  - Buteurs: {len(buteurs) if buteurs else 0} joueurs")
print(f"  - Stats: {'✓' if stats else '✗'}")
print(f"  - Playoffs: {'✓' if playoffs else '✗'}")

# Question templates
QUESTIONS = [
    # Questions sur le classement
    {
        'type': 'classement_champion',
        'generate': lambda: {
            'question': 'Quelle équipe a remporté le Top 14 2024-2025 ?',
            'options': [classement[0]['club'], classement[1]['club'], classement[2]['club'], classement[3]['club']],
            'correct': playoffs['phase_finale']['finale']['champion']
        }
    },
    {
        'type': 'classement_position',
        'generate': lambda: {
            'question': f"Quelle équipe a terminé à la 2ème place du classement ?",
            'options': [classement[i]['club'] for i in [1, 2, 3, 4]],
            'correct': classement[1]['club']
        }
    },
    {
        'type': 'classement_dernier',
        'generate': lambda: {
            'question': 'Quelle équipe a terminé dernière du classement ?',
            'options': [classement[i]['club'] for i in [11, 12, 13, 10]],
            'correct': classement[13]['club']
        }
    },
    {
        'type': 'classement_points',
        'generate': lambda: {
            'question': 'Quelle équipe a marqué le plus de points en saison régulière ?',
            'options': [c['club'] for c in stats['statistiques_clubs']['meilleure_attaque'][:4]],
            'correct': stats['statistiques_clubs']['meilleure_attaque'][0]['club']
        }
    },
    {
        'type': 'meilleur_buteur',
        'generate': lambda: {
            'question': 'Qui est le meilleur réalisateur de la saison 2024-2025 ?',
            'options': [b['nom'] for b in buteurs[:4]],
            'correct': buteurs[0]['nom']
        }
    },
    {
        'type': 'buteur_club',
        'generate': lambda: {
            'buteur': buteurs[random.randint(0, min(9, len(buteurs) - 1))],
            'question': lambda b: f"Dans quel club joue {b['nom']} ?",
            'options': lambda b: random.sample([c['club'] for c in classement[:8] if c['club'] != b['club']], 3) + [
                b['club']],
            'correct': lambda b: b['club']
        }
    },
    {
        'type': 'buteur_points',
        'generate': lambda: {
            'question': f"Combien de points {buteurs[0]['nom']} a-t-il marqué cette saison ?",
            'correct_val': buteurs[0]['points'],
            'options': lambda v: [str(v), str(v + 20), str(v - 30), str(v + 50)],
            'correct': lambda v: str(v)
        }
    },
    {
        'type': 'meilleur_essayeur',
        'generate': lambda: {
            'question': 'Qui est le meilleur marqueur d\'essais de la saison ?',
            'options': [p['nom'] for p in stats['meilleurs_joueurs']['meilleur_marqueur_essais'][:3]] + [
                buteurs[0]['nom']],
            'correct': stats['meilleurs_joueurs']['meilleur_marqueur_essais'][0]['nom']
        }
    },
    {
        'type': 'essayeur_nombre',
        'generate': lambda: {
            'question': f"Combien d'essais {stats['meilleurs_joueurs']['meilleur_marqueur_essais'][0]['nom']} a-t-il marqué ?",
            'correct_val': stats['meilleurs_joueurs']['meilleur_marqueur_essais'][0]['essais'],
            'options': lambda v: [str(v), str(v + 3), str(v - 2), str(v + 5)],
            'correct': lambda v: str(v)
        }
    },
    {
        'type': 'finale_score',
        'generate': lambda: {
            'question': 'Quel était le score de la finale ?',
            'finale': playoffs['phase_finale']['finale'],
            'options': lambda f: [
                f"{f['score_domicile']} - {f['score_exterieur']}",
                f"{f['score_domicile'] + 5} - {f['score_exterieur']}",
                f"{f['score_domicile']} - {f['score_exterieur'] + 7}",
                f"{f['score_domicile'] - 3} - {f['score_exterieur'] + 3}"
            ],
            'correct': lambda f: f"{f['score_domicile']} - {f['score_exterieur']}"
        }
    },
    {
        'type': 'finale_adversaire',
        'generate': lambda: {
            'question': 'Quelle équipe a perdu en finale ?',
            'options': [classement[i]['club'] for i in [1, 2, 3, 4]],
            'correct': playoffs['phase_finale']['finale']['equipe_exterieur']
        }
    },
    {
        'type': 'stats_essais',
        'generate': lambda: {
            'question': 'Combien d\'essais ont été marqués au total cette saison ?',
            'correct_val': stats['essais']['total'],
            'options': lambda v: [str(v), str(v + 50), str(v - 100), str(v + 150)],
            'correct': lambda v: str(v)
        }
    },
    {
        'type': 'stats_cartons_rouges',
        'generate': lambda: {
            'question': 'Combien de cartons rouges ont été distribués cette saison ?',
            'correct_val': stats['cartons']['rouges'],
            'options': lambda v: [str(v), str(v + 5), str(v + 10), str(v - 5) if v > 5 else str(v + 3)],
            'correct': lambda v: str(v)
        }
    },
    {
        'type': 'stats_cartons_jaunes',
        'generate': lambda: {
            'question': 'Combien de cartons jaunes ont été distribués cette saison ?',
            'correct_val': stats['cartons']['jaunes'],
            'options': lambda v: [str(v), str(v + 30), str(v - 50), str(v + 80)],
            'correct': lambda v: str(v)
        }
    },
    {
        'type': 'meilleur_gratteur',
        'generate': lambda: {
            'question': 'Qui est le meilleur gratteur de la saison ?',
            'options': [p['nom'] for p in stats['meilleurs_joueurs']['meilleur_gratteur'][:4]],
            'correct': stats['meilleurs_joueurs']['meilleur_gratteur'][0]['nom']
        }
    },
    {
        'type': 'gratteur_nombre',
        'generate': lambda: {
            'question': f"Combien de ballons {stats['meilleurs_joueurs']['meilleur_gratteur'][0]['nom']} a-t-il gratté ?",
            'correct_val': stats['meilleurs_joueurs']['meilleur_gratteur'][0]['ballons_grattes'],
            'options': lambda v: [str(v), str(v + 5), str(v - 3), str(v + 10)],
            'correct': lambda v: str(v)
        }
    },
    {
        'type': 'possession',
        'generate': lambda: {
            'question': 'Quelle équipe a eu le meilleur temps de possession ?',
            'options': [c['club'] for c in stats['statistiques_clubs']['meilleur_temps_possession'][:4]],
            'correct': stats['statistiques_clubs']['meilleur_temps_possession'][0]['club']
        }
    },
    {
        'type': 'defense',
        'generate': lambda: {
            'question': 'Quelle équipe a la meilleure défense (moins de points encaissés) ?',
            'options': [c['club'] for c in stats['statistiques_clubs']['meilleure_defense'][:4]],
            'correct': stats['statistiques_clubs']['meilleure_defense'][0]['club']
        }
    },
    {
        'type': 'barrages',
        'generate': lambda: {
            'question': 'Quelle équipe a gagné son match de barrage ?',
            'options': [
                playoffs['phase_finale']['barrages'][0]['vainqueur'],
                playoffs['phase_finale']['barrages'][1]['vainqueur'],
                playoffs['phase_finale']['barrages'][0]['equipe_exterieur'],
                playoffs['phase_finale']['barrages'][1]['equipe_exterieur']
            ],
            'correct': random.choice([
                playoffs['phase_finale']['barrages'][0]['vainqueur'],
                playoffs['phase_finale']['barrages'][1]['vainqueur']
            ])
        }
    },
    {
        'type': 'moyenne_points',
        'generate': lambda: {
            'question': 'Quelle est la moyenne de points par match cette saison ?',
            'correct_val': stats['points']['moyenne_par_match'],
            'options': lambda v: [f"{v:.1f}", f"{v + 5:.1f}", f"{v - 3:.1f}", f"{v + 10:.1f}"],
            'correct': lambda v: f"{v:.1f}"
        }
    },
    {
        'type': 'victoires_domicile',
        'generate': lambda: {
            'question': 'Quel pourcentage de victoires à domicile cette saison ?',
            'correct_val': stats['matches']['victoires_domicile']['pourcentage'],
            'options': lambda v: [f"{v}%", f"{v + 5}%", f"{v - 10}%", f"{v + 15}%"],
            'correct': lambda v: f"{v}%"
        }
    },
]

@top14_quiz_bp.route('/api/all-questions')
def get_all_questions():
    """Generate all possible questions for offline mode."""
    try:
        all_questions = []

        # Generate multiple instances of each question type
        for _ in range(50):  # Generate 50 questions total
            q_template = random.choice(QUESTIONS)
            q_data = q_template['generate']()

            # Handle complex question generation
            if 'buteur' in q_data:
                buteur = q_data['buteur']
                question = q_data['question'](buteur)
                options = q_data['options'](buteur)
                correct = q_data['correct'](buteur)
            elif 'finale' in q_data:
                finale = q_data['finale']
                question = q_data['question']
                options = q_data['options'](finale)
                correct = q_data['correct'](finale)
            elif 'correct_val' in q_data:
                val = q_data['correct_val']
                question = q_data['question']
                options = q_data['options'](val)
                correct = q_data['correct'](val)
            else:
                question = q_data['question']
                options = q_data['options'][:]
                correct = q_data['correct']

            # Shuffle options
            random.shuffle(options)

            all_questions.append({
                'question': question,
                'options': options,
                'correct': correct
            })

        return jsonify({
            'questions': all_questions
        })

    except Exception as e:
        print(f"Error generating questions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to generate questions'}), 500

@top14_quiz_bp.route('/api/all-data')
def get_all_data():
    """Get all quiz data for offline mode."""
    return jsonify({
        'classement': classement,
        'buteurs': buteurs,
        'stats': stats,
        'playoffs': playoffs
    })

@top14_quiz_bp.route('/')
def index():
    """Serve the main game page."""
    return render_template('top14_quiz.html')


@top14_quiz_bp.route('/api/question')
def get_question():
    """Get a random quiz question."""
    try:
        # Select random question type
        q_template = random.choice(QUESTIONS)
        q_data = q_template['generate']()

        # Handle complex question generation
        if 'buteur' in q_data:
            buteur = q_data['buteur']
            question = q_data['question'](buteur)
            options = q_data['options'](buteur)
            correct = q_data['correct'](buteur)
        elif 'finale' in q_data:
            finale = q_data['finale']
            question = q_data['question']
            options = q_data['options'](finale)
            correct = q_data['correct'](finale)
        elif 'correct_val' in q_data:
            val = q_data['correct_val']
            question = q_data['question']
            options = q_data['options'](val)
            correct = q_data['correct'](val)
        else:
            question = q_data['question']
            options = q_data['options']
            correct = q_data['correct']

        # Shuffle options
        random.shuffle(options)

        return jsonify({
            'question': question,
            'options': options,
            'correct': correct
        })

    except Exception as e:
        print(f"Error generating question: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to generate question'}), 500


print(f"✓ Top 14 Quiz loaded with {len(QUESTIONS)} question types\n")