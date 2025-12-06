/**
 * Single Page Application - Main Controller
 * Handles routing, offline mode, and game initialization
 */

// ===== DEBUG - Add this at the very top of app.js =====
console.log('🔍 Script loaded');
console.log('🔍 Pages found:', document.querySelectorAll('.page').length);
document.querySelectorAll('.page').forEach(p => {
    console.log('  -', p.id, 'active:', p.classList.contains('active'));
});

// ===== GLOBAL STATE =====
let isOffline = !navigator.onLine;
let gameData = {
    countries: [],
    players: [],
    quizData: null
};

// ===== OFFLINE DETECTION =====
window.addEventListener('online', () => {
    isOffline = false;
    document.getElementById('offline-indicator').classList.remove('show');
    console.log('✓ Mode en ligne');
});

window.addEventListener('offline', () => {
    isOffline = true;
    document.getElementById('offline-indicator').classList.add('show');
    console.log('⚠️ Mode hors ligne');
});

if (isOffline) {
    document.getElementById('offline-indicator').classList.add('show');
}

// ===== ROUTING =====
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const pageMap = {
        'menu': 'menu-page',
        'flag-game': 'flag-game-page',
        'toulouse-game': 'toulouse-game-page',
        'top14-quiz': 'top14-quiz-page',
        'pi-game': 'pi-game-page'  // ADD THIS
    };

    const pageId = pageMap[page];
    if (pageId) {
        document.getElementById(pageId).classList.add('active');
        window.location.hash = page === 'menu' ? '' : page;

        // Initialize game if needed
        if (page === 'flag-game' && !flagGame.initialized) {
            flagGame.init();
        } else if (page === 'toulouse-game' && !toulouseGame.initialized) {
            toulouseGame.init();
        } else if (page === 'top14-quiz' && !quizGame.initialized) {
            quizGame.init();
        } else if (page === 'pi-game' && !piGame.initialized) {  // ADD THIS
            piGame.init();
        }
    }
}

// Handle browser back/forward
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    navigateTo(hash || 'menu');
});

// ===== DATA LOADING =====
async function loadAllGameData() {
    console.log('📦 Loading all game data...');

    try {
        // Load countries for flag game
        const countriesRes = await fetch('/flag-game/api/all-countries');
        if (countriesRes.ok) {
            const data = await countriesRes.json();
            gameData.countries = data.countries;
            console.log('✓ Loaded', gameData.countries.length, 'countries');
        }
    } catch (e) {
        console.warn('⚠️ Failed to load countries:', e);
    }

    try {
        // Load players for toulouse game
        const playersRes = await fetch('/toulouse-game/api/all-players');
        if (playersRes.ok) {
            const data = await playersRes.json();
            gameData.players = data.players;
            gameData.positions = data.positions;
            console.log('✓ Loaded', gameData.players.length, 'players');
        }
    } catch (e) {
        console.warn('⚠️ Failed to load players:', e);
    }

    try {
        // Load quiz data
        const quizRes = await fetch('/top14-quiz/api/all-questions');
        if (quizRes.ok) {
            gameData.quizData = await quizRes.json();
            console.log('✓ Loaded quiz data');
        }
    } catch (e) {
        console.warn('⚠️ Failed to load quiz data:', e);
    }

    console.log('✅ All game data loaded');
}
// ===== FLAG GAME =====
const flagGame = {
    initialized: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
    questionNum: 0,
    currentCorrectAnswer: '',
    currentMetric: '',
    maxQuestions: 10,
    rankedMode: false,
    startTime: null,
    endTime: null,

    async init() {
        this.initialized = true;
        this.restart();
    },

    restart(ranked = false) {
        console.log('🔄 Restarting flag game, ranked:', ranked);
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.questionNum = 0;
        this.rankedMode = ranked;
        this.startTime = ranked ? Date.now() : null;
        this.endTime = null;

        document.getElementById('flag-score').textContent = this.score;
        document.getElementById('flag-question-num').textContent = 1;
        document.getElementById('flag-game-content').classList.remove('hidden');
        document.getElementById('flag-game-over').classList.add('hidden');
        document.getElementById('flag-loading').classList.add('hidden');

        this.loadQuestion();
    },

    generateQuestion() {
        if (gameData.countries.length < 4) return null;

        const metrics = ['population', 'area', 'gdp', 'density'];
        const metric = metrics[Math.floor(Math.random() * metrics.length)];

        const validCountries = gameData.countries.filter(c => c[metric] > 0);
        if (validCountries.length < 4) return null;

        const shuffled = [...validCountries].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 4);
        const sorted = [...selected].sort((a, b) => b[metric] - a[metric]);

        const questionTexts = {
            'population': 'Allez ma loute, quel pays à la plus grande population ?',
            'area': 'Quel pays a la plus grande superficie (en terrains de rugby) ?',
            'gdp': 'Quel pays a le plus grand PIB ? (pas par habitant hein)',
            'density': 'Quel pays a la plus grande densité de population ?'
        };

        return {
            question: questionTexts[metric],
            metric: metric,
            options: selected.map(c => ({
                name: c.name,
                iso2: c.iso2,
                value: c[metric]
            })),
            correct_answer: sorted[0].name
        };
    },

    formatNumber(num, metric) {
        if (metric === 'population') {
            return num.toLocaleString();
        } else if (metric === 'area') {
            const rugbyFields = Math.round((num * 1000000) / 10000);
            return rugbyFields.toLocaleString() + ' terrains de rugby';
        } else if (metric === 'gdp') {
            if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'T';
            if (num >= 1000) return '$' + (num / 1000).toFixed(2) + 'B';
            return '$' + num.toFixed(2) + 'M';
        } else if (metric === 'density') {
            return num.toFixed(1) + ' per km²';
        }
        return num.toLocaleString();
    },

    loadQuestion() {
        console.log('🎯 Flag game - loading question');
        console.log('🎯 Countries available:', gameData.countries.length);

        const questionData = this.generateQuestion();
        console.log('🎯 Generated question:', questionData);

        if (!questionData) {
            alert('Erreur: Pas assez de données');
            return;
        }

        this.currentCorrectAnswer = questionData.correct_answer;
        this.currentMetric = questionData.metric;

        document.getElementById('flag-question').textContent = questionData.question;

        const optionsContainer = document.getElementById('flag-options');
        optionsContainer.innerHTML = '';

        questionData.options.forEach(option => {
            const card = document.createElement('div');
            card.className = 'option-card';
            card.onclick = () => this.checkAnswer(option.name, card);

            card.innerHTML = `
                <img src="https://flagcdn.com/w320/${option.iso2.toLowerCase()}.png" 
                     alt="${option.name}" 
                     class="flag-image">
                <div class="country-name">${option.name}</div>
                <div class="country-value" data-value="${option.value}">???</div>
            `;

            optionsContainer.appendChild(card);
        });

        document.getElementById('flag-result').classList.add('hidden');
        document.getElementById('flag-next-btn').classList.add('hidden');

        document.getElementById('flag-loading').classList.add('hidden');
        document.getElementById('flag-game-content').classList.remove('hidden');

        console.log('✅ Flag question displayed');
    },

    checkAnswer(selectedAnswer, selectedCard) {
        const isCorrect = selectedAnswer === this.currentCorrectAnswer;

        const cards = document.querySelectorAll('#flag-options .option-card');
        cards.forEach(card => {
            card.classList.add('disabled');

            const countryNameElement = card.querySelector('.country-name');
            if (!countryNameElement) return;
            const countryName = countryNameElement.textContent;
            const valueDiv = card.querySelector('.country-value');
            const value = parseInt(valueDiv.dataset.value);

            valueDiv.textContent = this.formatNumber(value, this.currentMetric);
            valueDiv.classList.add('revealed');

            if (countryName === this.currentCorrectAnswer) {
                card.classList.add('correct');
            } else if (card === selectedCard && !isCorrect) {
                card.classList.add('wrong');
            }
        });

        if (isCorrect) {
        this.score += 10;
        this.streak++;
        if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
        this.streak = 0;
    }

    document.getElementById('flag-score').textContent = this.score;

    const resultDiv = document.getElementById('flag-result');
    resultDiv.classList.remove('hidden');

    if (isCorrect) {
        resultDiv.textContent = '✅ Tu es la best! bravo!';
        resultDiv.className = 'result correct';
    } else {
        resultDiv.textContent = `❌ Faux! C'était ${this.currentCorrectAnswer}`;
        resultDiv.className = 'result wrong';
    }

    // Hide the next button (not needed anymore)
    document.getElementById('flag-next-btn').classList.add('hidden');

    this.questionNum++;

    // Auto-advance after 2 seconds
    setTimeout(() => {
        if (this.questionNum >= this.maxQuestions) {
            this.showGameOver();
        } else {
            document.getElementById('flag-question-num').textContent = this.questionNum + 1;
            this.loadQuestion();
        }
    }, 1000);
},
    nextQuestion() {
        if (this.questionNum >= this.maxQuestions) {
            this.showGameOver();
        } else {
            document.getElementById('flag-question-num').textContent = this.questionNum + 1;
            this.loadQuestion();
        }
    },

    showGameOver() {
        console.log('🏁 Game Over - rankedMode:', this.rankedMode);

        document.getElementById('flag-game-content').classList.add('hidden');
        document.getElementById('flag-game-over').classList.remove('hidden');

        const scoreOutOf10 = this.score / 10;

        // Calculate and show time if ranked
        if (this.rankedMode && this.startTime) {
            this.endTime = Date.now();
            const timeInSeconds = ((this.endTime - this.startTime) / 1000).toFixed(1);

            const timeContainer = document.getElementById('flag-time-container');
            const timeSpan = document.getElementById('flag-time');
            if (timeContainer && timeSpan) {
                timeSpan.textContent = timeInSeconds + 's';
                timeContainer.classList.remove('hidden');
            }
        } else {
            const timeContainer = document.getElementById('flag-time-container');
            if (timeContainer) {
                timeContainer.classList.add('hidden');
            }
        }

        // Show/hide ranked elements
        const submitSection = document.getElementById('flag-leaderboard-submit');
        console.log('🔍 Submit section found:', !!submitSection);

        if (this.rankedMode && submitSection) {
            console.log('✅ Showing leaderboard submit');
            submitSection.classList.remove('hidden');
        } else if (submitSection) {
            console.log('⚠️ Not ranked mode, hiding submit');
            submitSection.classList.add('hidden');
        }

        displayGameResults(scoreOutOf10, 'geography', {
            resultImg: document.getElementById('flag-result-img'),
            resultMsg: document.getElementById('flag-result-msg'),
            finalScore: document.getElementById('flag-final-score'),
            accuracy: document.getElementById('flag-accuracy'),
            bestStreak: document.getElementById('flag-best-streak'),
            bestStreakValue: this.bestStreak
        }, this.maxQuestions);
    },

    async submitToLeaderboard() {
        const name = document.getElementById('flag-player-name').value.trim();
        if (!name) {
            alert('Entre ton nom !');
            return;
        }

        const timeInSeconds = ((this.endTime - this.startTime) / 1000);

        console.log('📤 Submitting score:', {
            name: name,
            score: this.score / 10,
            time: timeInSeconds
        });

        try {
            const response = await fetch('/flag-game/api/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    score: this.score / 10,  // Score sur 10
                    time: timeInSeconds
                })
            });

            console.log('📥 Response status:', response.status);
            const data = await response.json();
            console.log('📥 Response data:', data);

            if (data.success) {
                alert(`🎉 Score enregistré ! Tu es ${data.rank}/${data.total}`);
                document.getElementById('flag-leaderboard-submit').classList.add('hidden');
                this.showLeaderboard();
            } else {
                alert('Erreur: ' + (data.error || 'Erreur inconnue'));
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            alert('Erreur lors de l\'enregistrement du score');
        }
    },

    async showLeaderboard() {
        try {
            const response = await fetch('/flag-game/api/leaderboard');
            const data = await response.json();

            const leaderboardDiv = document.getElementById('flag-leaderboard');
            leaderboardDiv.innerHTML = '<h3>🏆 Classement</h3>';

            const table = document.createElement('table');
            table.className = 'leaderboard-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Rang</th>
                        <th>Nom</th>
                        <th>Score</th>
                        <th>Temps</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.leaderboard.map((entry, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${entry.name}</td>
                            <td>${entry.score}/10</td>
                            <td>${entry.time.toFixed(1)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            leaderboardDiv.appendChild(table);
            leaderboardDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
};

// ===== TOULOUSE GAME =====
const toulouseGame = {
    initialized: false,
    score: 0,
    questionNum: 0,
    currentQuestion: null,
    selectedName: null,
    selectedPosition: null,
    maxQuestions: 10,

    async init() {
        this.initialized = true;
        this.restart();
    },

    restart() {
        this.score = 0;
        this.questionNum = 0;
        this.selectedName = null;
        this.selectedPosition = null;

        document.getElementById('toulouse-score').textContent = this.score;
        document.getElementById('toulouse-question-num').textContent = 1;
        document.getElementById('toulouse-game-content').classList.remove('hidden');
        document.getElementById('toulouse-game-over').classList.add('hidden');
        document.getElementById('toulouse-loading').classList.add('hidden');

        this.loadQuestion();
    },

    generateQuestion() {
        if (gameData.players.length === 0) return null;

        const correctPlayer = gameData.players[Math.floor(Math.random() * gameData.players.length)];

        if (isOffline) {
            const wrongPositions = gameData.positions.filter(p => p !== correctPlayer.position);
            const shuffledWrong = wrongPositions.sort(() => Math.random() - 0.5).slice(0, 3);
            const positionOptions = [correctPlayer.position, ...shuffledWrong].sort(() => Math.random() - 0.5);

            return {
                player: correctPlayer,
                position_options: positionOptions,
                offline_mode: true
            };
        }

        const otherPlayers = gameData.players.filter(p => p.name !== correctPlayer.name);
        const wrongNames = otherPlayers.sort(() => Math.random() - 0.5).slice(0, 3);
        const nameOptions = [correctPlayer.name, ...wrongNames.map(p => p.name)].sort(() => Math.random() - 0.5);

        const wrongPositions = gameData.positions.filter(p => p !== correctPlayer.position);
        const positionOptions = [correctPlayer.position, ...wrongPositions.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);

        return {
            player: correctPlayer,
            name_options: nameOptions,
            position_options: positionOptions,
            offline_mode: false
        };
    },

    loadQuestion() {
        this.currentQuestion = this.generateQuestion();
        if (!this.currentQuestion) {
            alert('Erreur: Pas assez de données');
            return;
        }

        this.selectedName = null;
        this.selectedPosition = null;

        const playerImageDiv = document.getElementById('toulouse-player-image');
        const nameSection = document.getElementById('toulouse-name-section');

        if (this.currentQuestion.offline_mode) {
            // Hide image (not available offline)
            playerImageDiv.style.display = 'none';

            // Show player name (not clickable, just display)
            nameSection.style.display = 'block';
            const nameOptions = document.getElementById('toulouse-name-options');
            nameOptions.innerHTML = `
                <div style="text-align: center; padding: 25px; background: linear-gradient(135deg, #c8102e 0%, #000000 100%); border-radius: 15px; margin-bottom: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                    <p style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Joueur</p>
                    <h2 style="color: white; font-size: 2rem; margin: 0; font-weight: bold;">
                        ${this.currentQuestion.player.name}
                    </h2>
                </div>
                <h3 style="color: #c8102e; margin-bottom: 15px; font-size: 1.3em;">Quel est son poste ?</h3>
            `;
        } else {
            playerImageDiv.style.display = 'block';
            nameSection.style.display = 'block';

            const img = document.getElementById('toulouse-player-img');
            img.src = `/toulouse-game/players/${this.currentQuestion.player.image_path}`;
            img.onerror = () => {
                playerImageDiv.style.display = 'none';
            };

            const nameOptions = document.getElementById('toulouse-name-options');
            nameOptions.innerHTML = '';
            this.currentQuestion.name_options.forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = name;
                btn.onclick = () => this.selectName(name, btn);
                nameOptions.appendChild(btn);
            });
        }

        const positionOptions = document.getElementById('toulouse-position-options');
        positionOptions.innerHTML = '';
        this.currentQuestion.position_options.forEach(position => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = position;
            btn.onclick = () => this.selectPosition(position, btn);
            positionOptions.appendChild(btn);
        });

        document.getElementById('toulouse-result').classList.add('hidden');
        document.getElementById('toulouse-next-btn').classList.add('hidden');
    },

    selectName(name, btn) {
        if (this.selectedName !== null) return;
        this.selectedName = name;

        document.querySelectorAll('#toulouse-name-options .option-btn').forEach(b => {
            b.disabled = true;
            if (b === btn) {
                b.style.background = '#764ba2';
                b.style.color = 'white';
            }
        });

        this.checkAnswer();
    },

    selectPosition(position, btn) {
        if (this.selectedPosition !== null) return;
        this.selectedPosition = position;

        document.querySelectorAll('#toulouse-position-options .option-btn').forEach(b => {
            b.disabled = true;
            if (b === btn) {
                b.style.background = '#764ba2';
                b.style.color = 'white';
            }
        });

        this.checkAnswer();
    },

    checkAnswer() {
        console.log('🔍 checkAnswer called');
        console.log('🔍 offline_mode:', this.currentQuestion.offline_mode);
        console.log('🔍 selectedPosition:', this.selectedPosition);
        console.log('🔍 selectedName:', this.selectedName);
        console.log('🔍 correct position:', this.currentQuestion.player.position);

        // OFFLINE MODE - Only position question
        if (this.currentQuestion.offline_mode) {
            if (this.selectedPosition === null) return;

            const positionCorrect = this.selectedPosition === this.currentQuestion.player.position;

            document.querySelectorAll('#toulouse-position-options .option-btn').forEach(b => {
                if (b.textContent === this.currentQuestion.player.position) {
                    b.classList.add('correct');
                } else if (b.textContent === this.selectedPosition && !positionCorrect) {
                    b.classList.add('wrong');
                }
            });

            const resultDiv = document.getElementById('toulouse-result');
            if (positionCorrect) {
                this.score++;
                document.getElementById('toulouse-score').textContent = this.score;
                resultDiv.textContent = `✅ Bravo ! C'est bien ${this.currentQuestion.player.position} !`;
                resultDiv.className = 'result correct';
            } else {
                resultDiv.textContent = `❌ C'est ${this.currentQuestion.player.position}`;
                resultDiv.className = 'result wrong';
            }

            resultDiv.classList.remove('hidden');
            document.getElementById('toulouse-next-btn').classList.remove('hidden');
            this.questionNum++;
            return;
        }

        // ONLINE MODE - Name AND position questions
        if (this.selectedName === null || this.selectedPosition === null) return;

        const nameCorrect = this.selectedName === this.currentQuestion.player.name;
        const positionCorrect = this.selectedPosition === this.currentQuestion.player.position;

        document.querySelectorAll('#toulouse-name-options .option-btn').forEach(b => {
            if (b.textContent === this.currentQuestion.player.name) {
                b.classList.add('correct');
            } else if (b.textContent === this.selectedName && !nameCorrect) {
                b.classList.add('wrong');
            }
        });

        document.querySelectorAll('#toulouse-position-options .option-btn').forEach(b => {
            if (b.textContent === this.currentQuestion.player.position) {
                b.classList.add('correct');
            } else if (b.textContent === this.selectedPosition && !positionCorrect) {
                b.classList.add('wrong');
            }
        });

        const resultDiv = document.getElementById('toulouse-result');
        if (nameCorrect && positionCorrect) {
            this.score++;
            document.getElementById('toulouse-score').textContent = this.score;
            resultDiv.textContent = `✅ Bravo ! C'est bien ${this.currentQuestion.player.name}, ${this.currentQuestion.player.position} !`;
            resultDiv.className = 'result correct';
        } else if (nameCorrect) {
            resultDiv.textContent = `⚠️ Bon nom, mais c'est un ${this.currentQuestion.player.position}`;
            resultDiv.className = 'result wrong';
        } else if (positionCorrect) {
            resultDiv.textContent = `⚠️ Bon poste, mais c'est ${this.currentQuestion.player.name}`;
            resultDiv.className = 'result wrong';
        } else {
            resultDiv.textContent = `❌ C'est ${this.currentQuestion.player.name}, ${this.currentQuestion.player.position}`;
            resultDiv.className = 'result wrong';
        }

        resultDiv.classList.remove('hidden');
        document.getElementById('toulouse-next-btn').classList.remove('hidden');
        this.questionNum++;
    },

    nextQuestion() {
        if (this.questionNum >= this.maxQuestions) {
            this.showGameOver();
        } else {
            document.getElementById('toulouse-question-num').textContent = this.questionNum + 1;
            this.loadQuestion();
        }
    },

    showGameOver() {
        document.getElementById('toulouse-game-content').classList.add('hidden');
        document.getElementById('toulouse-game-over').classList.remove('hidden');

        displayGameResults(this.score, 'rugby', {
            resultImg: document.getElementById('toulouse-result-img'),
            resultMsg: document.getElementById('toulouse-result-msg'),
            finalScore: document.getElementById('toulouse-final-score'),
            accuracy: document.getElementById('toulouse-accuracy')
        }, this.maxQuestions);
    }
};

// ===== TOP14 QUIZ =====
const quizGame = {
    initialized: false,
    score: 0,
    questionNum: 0,
    currentQuestion: null,
    maxQuestions: 10,

    async init() {
        this.initialized = true;
        this.restart();
    },

    restart() {
        console.log('🔄 Restarting quiz...');
        this.score = 0;
        this.questionNum = 0;

        document.getElementById('quiz-score').textContent = this.score;
        document.getElementById('quiz-question-num').textContent = 1;
        document.getElementById('quiz-game-over').classList.add('hidden');

        this.loadQuestion();  // loadQuestion will handle showing/hiding loading
    },

    generateQuestion() {
        if (!gameData.quizData || !gameData.quizData.questions || gameData.quizData.questions.length === 0) {
            return null;
        }

        // Get a random question
        const randomIndex = Math.floor(Math.random() * gameData.quizData.questions.length);
        return gameData.quizData.questions[randomIndex];
    },

    async loadQuestion() {
        console.log('📝 Loading quiz question...');
        console.log('🔍 gameData.quizData:', gameData.quizData);
        console.log('🔍 Has questions?', gameData.quizData?.questions?.length);

        document.getElementById('quiz-loading').classList.remove('hidden');
        document.getElementById('quiz-game-content').classList.add('hidden');

        let data;

        // Use cached data if available
        if (gameData.quizData && gameData.quizData.questions && gameData.quizData.questions.length > 0) {
            console.log('📦 Using cached quiz data');
            data = this.generateQuestion();
        } else {
        console.log('⚠️ No cached data, trying to fetch...');
        // ... rest of code else {
            // Fallback: try to fetch if cache is empty
            try {
                const response = await fetch('/top14-quiz/api/question');

                // Check if response is ok before parsing JSON
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                data = await response.json();
            } catch (error) {
                console.error('❌ Error loading question:', error);
                document.getElementById('quiz-loading').textContent = 'Erreur: Pas de données disponibles. Connectez-vous à internet.';
                return;
            }
        }

        if (!data) {
            document.getElementById('quiz-loading').textContent = 'Erreur: Pas de questions disponibles';
            return;
        }

        this.currentQuestion = data;
        console.log('✅ Question loaded:', data.question);

        document.getElementById('quiz-question').textContent = data.question;

        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';

        data.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option;
            btn.onclick = () => this.checkAnswer(option, btn);
            optionsContainer.appendChild(btn);
        });

        document.getElementById('quiz-result').classList.add('hidden');
        document.getElementById('quiz-next-btn').classList.add('hidden');

        document.getElementById('quiz-loading').classList.add('hidden');
        document.getElementById('quiz-game-content').classList.remove('hidden');

        console.log('✅ Quiz question displayed');
    },

    checkAnswer(selected, btn) {
        const isCorrect = selected === this.currentQuestion.correct;

        document.querySelectorAll('#quiz-options .option-btn').forEach(b => {
            b.disabled = true;
            if (b.textContent === this.currentQuestion.correct) {
                b.classList.add('correct');
            } else if (b === btn && !isCorrect) {
                b.classList.add('wrong');
            }
        });

        const resultDiv = document.getElementById('quiz-result');
        if (isCorrect) {
            this.score++;
            document.getElementById('quiz-score').textContent = this.score;
            resultDiv.textContent = '✅ Bravo ! Bonne réponse !';
            resultDiv.className = 'result correct';
        } else {
            resultDiv.textContent = `❌ Faux ! La bonne réponse était : ${this.currentQuestion.correct}`;
            resultDiv.className = 'result wrong';
        }

        resultDiv.classList.remove('hidden');

        // Hide the next button
        document.getElementById('quiz-next-btn').classList.add('hidden');

        this.questionNum++;

        // Auto-advance after 2 seconds
        setTimeout(() => {
            if (this.questionNum >= this.maxQuestions) {
                this.showGameOver();
            } else {
                document.getElementById('quiz-question-num').textContent = this.questionNum + 1;
                this.loadQuestion();
            }
        }, 1000);
    },

    nextQuestion() {
        if (this.questionNum >= this.maxQuestions) {
            this.showGameOver();
        } else {
            document.getElementById('quiz-question-num').textContent = this.questionNum + 1;
            this.loadQuestion();
        }
    },

    showGameOver() {
        document.getElementById('quiz-game-content').classList.add('hidden');
        document.getElementById('quiz-game-over').classList.remove('hidden');

        displayGameResults(this.score, 'rugby', {
            resultImg: document.getElementById('quiz-result-img'),
            resultMsg: document.getElementById('quiz-result-msg'),
            finalScore: document.getElementById('quiz-final-score'),
            accuracy: document.getElementById('quiz-accuracy')
        }, this.maxQuestions);
    }
};


// ===== PI GAME =====
const piGame = {
    initialized: false,
    currentPosition: 0,
    currentQuestion: null,

    async init() {
        this.initialized = true;
        this.restart();
    },

    restart() {
        this.currentPosition = 0;

        document.getElementById('pi-game-content').classList.remove('hidden');
        document.getElementById('pi-game-over').classList.add('hidden');

        this.loadQuestion();
    },

    async loadQuestion() {
        try {
            const response = await fetch(`/pi-game/api/question?position=${this.currentPosition}`);
            const data = await response.json();

            this.currentQuestion = data;

            // Vérifications avec logs
            const positionEl = document.getElementById('pi-position');
            const previousEl = document.getElementById('pi-previous-digits');
            const optionsEl = document.getElementById('pi-options');
            const resultEl = document.getElementById('pi-result');

            console.log('Elements found:', {
                position: !!positionEl,
                previous: !!previousEl,
                options: !!optionsEl,
                result: !!resultEl
            });

            if (!positionEl || !previousEl || !optionsEl || !resultEl) {
                console.error('Missing elements!');
                return;
            }

            positionEl.textContent = this.currentPosition;
            previousEl.textContent = data.previous_digits;

            optionsEl.innerHTML = '';

            data.options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option;
                btn.onclick = () => this.checkAnswer(option, btn);
                optionsEl.appendChild(btn);
            });

            resultEl.classList.add('hidden');

        } catch (error) {
            console.error('Error loading question:', error);
        }
    },
    checkAnswer(selected, btn) {
        const isCorrect = selected === this.currentQuestion.correct;

        // Disable all buttons
        document.querySelectorAll('#pi-options .option-btn').forEach(b => {
            b.disabled = true;
            if (parseInt(b.textContent) === this.currentQuestion.correct) {
                b.classList.add('correct');
            } else if (b === btn && !isCorrect) {
                b.classList.add('wrong');
            }
        });

        const resultDiv = document.getElementById('pi-result');
        resultDiv.classList.remove('hidden');

        if (isCorrect) {
            resultDiv.textContent = '✅ Correct !';
            resultDiv.className = 'result correct';

            this.currentPosition++;

            if (this.currentPosition >= 1000) {
                setTimeout(() => this.gameOver(), 1000);
            } else {
                setTimeout(() => this.loadQuestion(), 1000);
            }
        } else {
            resultDiv.textContent = `❌ Faux ! C'était ${this.currentQuestion.correct}`;
            resultDiv.className = 'result wrong';

            setTimeout(() => this.gameOver(), 1000);
        }
    },

    gameOver() {
        clearInterval(this.timerInterval);

        const finalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);

        document.getElementById('pi-game-content').classList.add('hidden');
        document.getElementById('pi-game-over').classList.remove('hidden');

        document.getElementById('pi-final-position').textContent = this.currentPosition;
    },

    async submitScore() {
        const name = document.getElementById('pi-player-name').value.trim();
        if (!name) {
            alert('Entre ton nom !');
            return;
        }

        try {
            const response = await fetch('/pi-game/api/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    position: this.currentPosition,
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(`🎉 Score enregistré ! Tu es ${data.rank}/${data.total}`);
                document.getElementById('pi-submit-section').classList.add('hidden');
                this.showLeaderboard();
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            alert('Erreur lors de l\'enregistrement du score');
        }
    },

    async showLeaderboard() {
        try {
            const response = await fetch('/pi-game/api/leaderboard');
            const data = await response.json();

            const leaderboardDiv = document.getElementById('pi-leaderboard');
            leaderboardDiv.innerHTML = '<h3>🏆 Classement</h3>';

            const table = document.createElement('table');
            table.className = 'leaderboard-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Rang</th>
                        <th>Nom</th>
                        <th>Position</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.leaderboard.map((entry, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${entry.name}</td>
                            <td>${entry.position}/1000</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            leaderboardDiv.appendChild(table);
            leaderboardDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
};

// ===== INITIALIZATION =====
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    console.log('🎮 Initializing Single Page App...');

    // First, ensure only menu is visible
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        console.log('Hiding:', p.id);
    });

    const menuPage = document.getElementById('menu-page');
    if (menuPage) {
        menuPage.classList.add('active');
        console.log('✅ Menu page shown');
    } else {
        console.error('❌ Menu page not found!');
    }

    // Load all game data
    await loadAllGameData();

    // Handle initial route AFTER showing menu
    const hash = window.location.hash.slice(1);
    console.log('Initial hash:', hash);

    if (hash && hash !== '') {
        console.log('Navigating to hash:', hash);
        navigateTo(hash);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registered:', registration.scope);
        } catch (error) {
            console.log('❌ Service Worker registration failed:', error);
        }
    }

    console.log('✅ App initialized');
}