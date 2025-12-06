/**
 * Shared game results handler
 * Displays appropriate image and message based on final score
 */

const RESULT_DATA = {
    '0-2': {
        image: '/static/results/0-1-2.png',
        messages: {
            rugby: '😅 Aïe aïe aïe... Tu devrais peut-être regarder plus de matchs ! Petite douche froide pour ma loute',
            geography: 'Le score est horrible, ça ne doit pas être léa qui joue ...'
        }
    },
    '3-4': {
        image: '/static/results/3-4.png',
        messages: {
            rugby: '🤔 Mouais ! Tu as quelques bases, continue comme ça ma loute !',
            geography: '🤔 Pas mal, mais tu peux faire mieux ! Continue à t\'entraîner, championne (le fractionné ça paye) !'
        }
    },
    '5-6': {
        image: '/static/results/5-6.png',
        messages: {
            rugby: '👏 Bravo ! Je vois que le stade tu connais, Canon !',
            geography: '👏 Ok ! Tu en as déjà vu des drapeaux, mais tu as déjà vu 2 canons ?'
        }
    },
    '7-8': {
        image: '/static/results/7-8.png',
        messages: {
            rugby: '👏 Bravo ! Tu connais bien ton Stade Toulousain ! Ta famille est fière de toi !',
            geography: '👏 Excellent ! Ta famille serait fière de toi ! Et le drapeau des Pays Basques alors ?'
        }
    },
    '9-10': {
        image: '/static/results/9=10.png',
        messages: {
            rugby: '🏆 PARFAIT ! Tu es un vrai expert du Stade Toulousain ! Chapeau l\'artiste ! 🎉 Tu es une reine inégalé',
            geography: '🏆 SCORE PARFAIT ! Tu es un véritable génie de la géographie ! 🌍✨ La reine des drapeaux ! '
        }
    }
};

/**
 * Get result category based on score
 * @param {number} score - Score out of 10
 * @returns {string} Category key ('0-2', '3-4', '5-6', '7-8', or '9-10')
 */
function getResultCategory(score) {
    if (score >= 10) return '9-10';
    if (score >= 7) return '7-8';
    if (score >= 5) return '5-6';
    if (score >= 3) return '3-4';
    return '0-2';
}

/**
 * Display game over screen with appropriate image and message
 * @param {number} score - Final score out of 10
 * @param {string} gameType - Type of game ('rugby' or 'geography')
 * @param {Object} elements - DOM elements {resultImg, resultMsg, finalScore, accuracy, [bestStreak]}
 * @param {number} maxQuestions - Total number of questions (default: 10)
 */
function displayGameResults(score, gameType, elements, maxQuestions = 10) {
    const category = getResultCategory(score);
    const result = RESULT_DATA[category];

    // Set image
    if (elements.resultImg) {
        elements.resultImg.src = result.image;
        elements.resultImg.alt = `Résultat: ${score}/10`;
    }

    // Set message
    if (elements.resultMsg) {
        elements.resultMsg.textContent = result.messages[gameType] || result.messages.rugby;
    }

    // Set final score
    if (elements.finalScore) {
        elements.finalScore.textContent = score;
    }

    // Set accuracy
    if (elements.accuracy) {
        const accuracyPercent = ((score / maxQuestions) * 100).toFixed(1);
        elements.accuracy.textContent = accuracyPercent;
    }

    // Set best streak (optional, for geography game)
    if (elements.bestStreak !== undefined) {
        elements.bestStreak.textContent = elements.bestStreakValue || 0;
    }
}