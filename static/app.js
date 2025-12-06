/**
 * Single Page Application - Main Controller
 * Handles routing, offline mode, and game initialization
 */

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
        'top14-quiz': 'top14-quiz-page'
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
        const quizRes = await fetch('/top14-quiz/api/all-data');
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

    async init() {
        this.initialized = true;
        this.restart();
    },

    restart() {
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.questionNum = 0;

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
        const data = this.generateQuestion();
        if (!data) {
            alert('Erreur: Pas assez de données');
            return;
        }

        this.currentCorrectAnswer = data.correct_answer;
        this.currentMetric = data.metric;

        document.getElementById('flag-question').textContent = data.question;

        const optionsContainer = document.getElementById('flag-options');
        optionsContainer.innerHTML = '';

        data.options.forEach(option => {
            const card = document.createElement('div');
            card.className = 'option-card';
            card.onclick = () => this.checkAnswer(option.name, card);

            if (isOffline) {
                card.innerHTML = `
                    <div style="font-size: 4rem; margin-bottom: 15px;">🌍</div>
                    <div class="country-name">${option.name}</div>
                    <div class="country-value" data-value="${option.value}">???</div>
                `;
            } else {
                card.innerHTML = `
                    <img src="/flag-game/flags/${option.iso2}.png"
                         alt="${option.name}"
                         class="flag-image"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="font-size: 4rem; margin-bottom: 15px; display: none;">🌍</div>
                    <div class="country-name">${option.name}</div>
                    <div class="country-value" data-value="${option.value}">???</div>
                `;
            }

            optionsContainer.appendChild(card);
        });

        document.getElementById('flag-result').classList.add('hidden');
        document.getElementById('flag-next-btn').classList.add('hidden');
    },

    checkAnswer(selectedAnswer, selectedCard) {
        const isCorrect = selectedAnswer === this.currentCorrectAnswer;

        const cards = document.querySelectorAll('#flag-options .option-card');
        cards.forEach(card => {
            card.classList.add('disabled');

            const countryName = card.querySelector('.country-name').textContent;
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

        document.getElementById('flag-next-btn').classList.remove('hidden');
        this.questionNum++;
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
        document.getElementById('flag-game-content').classList.add('hidden');
        document.getElementById('flag-game-over').classList.remove('hidden');

        const scoreOutOf10 = this.score / 10;
        displayGameResults(scoreOutOf10, 'geography', {
            resultImg: document.getElementById('flag-result-img'),
            resultMsg: document.getElementById('flag-result-msg'),
            finalScore: document.getElementById('flag-final-score'),
            accuracy: document.getElementById('flag-accuracy'),
            bestStreak: document.getElementById('flag-best-streak'),
            bestStreakValue: this.bestStreak
        }, this.maxQuestions);
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
            playerImageDiv.style.display = 'none';
            nameSection.style.display = 'none';
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
        this.score = 0;
        this.questionNum = 0;

        document.getElementById('quiz-score').textContent = this.score;
        document.getElementById('quiz-question-num').textContent = 1;
        document.getElementById('quiz-game-content').classList.remove('hidden');
        document.getElementById('quiz-game-over').classList.add('hidden');
        document.getElementById('quiz-loading').classList.add('hidden');

        this.loadQuestion();
    },

    async loadQuestion() {
        try {
            const response = await fetch('/top14-quiz/api/question');
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Erreur');

            this.currentQuestion = data;

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
        } catch (error) {
            console.error('Error loading question:', error);
            alert('Erreur de chargement');
        }
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
        document.getElementById('quiz-next-btn').classList.remove('hidden');
        this.questionNum++;
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

// ===== INITIALIZATION =====
(async function init() {
    console.log('🎮 Initializing Single Page App...');

    // Load all game data
    await loadAllGameData();

    // Handle initial route
    const hash = window.location.hash.slice(1);
    if (hash) {
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
})();