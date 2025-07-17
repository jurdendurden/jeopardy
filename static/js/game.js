class JeopardyGame {
    constructor() {
        this.categories = [];
        this.questions = {};
        this.score = 0;
        this.currentQuestion = null;
        this.answeredQuestions = new Set();
        this.isLoading = false;
        this.gameCompleted = false;
        this.totalQuestions = 0;
        
        // Multiplayer support
        this.players = [];
        this.currentPlayer = null;
        this.isMultiplayer = false;
        this.gameStarted = false;
        
        // Timer and difficulty support
        this.difficulty = "medium";
        this.timerSeconds = 10;
        this.currentTimer = null;
        this.timeLeft = 0;
        
        // Voice recognition support
        this.speechRecognition = null;
        this.voiceEnabled = false;
        this.isListening = false;
        this.playerVoiceProfiles = new Map(); // Store voice characteristics for each player
        this.currentVoiceInput = '';
        
        this.initializeVoiceRecognition();
        
        this.setupKeyboardNavigation();
        this.setupSoundEffects();
        this.initializePlayerSetup();
    }

    initializeVoiceRecognition() {
        console.log('Initializing voice recognition...');
        
        // Check if speech recognition is supported
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.speechRecognition = new SpeechRecognition();
            
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = false;
            this.speechRecognition.lang = 'en-US';
            this.speechRecognition.maxAlternatives = 1;
            
            this.speechRecognition.onstart = () => {
                console.log('Speech recognition started');
            };
            
            this.speechRecognition.onresult = (event) => {
                console.log('Speech recognition result:', event.results[0][0]);
                const result = event.results[0][0].transcript;
                this.handleVoiceInput(result, event.results[0][0].confidence);
            };
            
            this.speechRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error, event);
                this.showVoiceError(`Speech recognition error: ${event.error}`);
                this.stopVoiceRecognition();
            };
            
            this.speechRecognition.onend = () => {
                console.log('Speech recognition ended');
                this.isListening = false;
                this.updateVoiceButton();
                this.hideVoiceListening();
            };
            
            this.voiceEnabled = true;
            console.log('Voice recognition initialized successfully');
        } else {
            console.warn('Speech recognition not supported in this browser');
            this.voiceEnabled = false;
        }
    }

    async createVoiceProfile(playerName) {
        // Create a simple voice profile based on speech characteristics
        // This is a simplified approach - in production, you'd use more sophisticated voice analysis
        return new Promise((resolve) => {
            if (!this.voiceEnabled) {
                resolve(null);
                return;
            }
            
            // Store basic profile information
            const profile = {
                playerName: playerName,
                created: Date.now(),
                samples: []
            };
            
            this.playerVoiceProfiles.set(playerName, profile);
            resolve(profile);
        });
    }

    async verifyVoiceMatch(playerName, confidence) {
        // Simplified voice verification - in production, this would analyze audio characteristics
        // For now, we'll use confidence level and timing patterns
        const profile = this.playerVoiceProfiles.get(playerName);
        
        if (!profile) {
            // First time speaking, create profile
            await this.createVoiceProfile(playerName);
            return { verified: true, confidence: confidence };
        }
        
        // Add sample to profile
        profile.samples.push({
            timestamp: Date.now(),
            confidence: confidence
        });
        
        // Keep only last 10 samples
        if (profile.samples.length > 10) {
            profile.samples = profile.samples.slice(-10);
        }
        
        // Simple verification: check if confidence is consistent
        const avgConfidence = profile.samples.reduce((sum, sample) => sum + sample.confidence, 0) / profile.samples.length;
        const confidenceVariance = profile.samples.reduce((sum, sample) => sum + Math.pow(sample.confidence - avgConfidence, 2), 0) / profile.samples.length;
        
        // If confidence varies too much, it might be a different person
        const isVerified = confidenceVariance < 0.1 && confidence > 0.7;
        
        return {
            verified: isVerified,
            confidence: confidence,
            avgConfidence: avgConfidence,
            variance: confidenceVariance
        };
    }

    async handleVoiceInput(transcript, confidence) {
        if (!this.currentPlayer) return;
        
        // Verify voice matches the current player
        const verification = await this.verifyVoiceMatch(this.currentPlayer.name, confidence);
        
        if (!verification.verified) {
            this.showVoiceError('Voice verification failed. Please ensure the same player is speaking.');
            return;
        }
        
        // Update the answer input with the transcript
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.value = transcript;
            this.currentVoiceInput = transcript;
            
            // Show voice feedback
            this.showVoiceFeedback(transcript, verification.confidence);
            
            // Enable submit button
            const submitBtn = document.getElementById('submitAnswer');
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    }

    async startVoiceRecognition() {
        if (!this.voiceEnabled || this.isListening || !this.speechRecognition) {
            console.log('Voice recognition not available:', {
                voiceEnabled: this.voiceEnabled,
                isListening: this.isListening,
                speechRecognition: !!this.speechRecognition
            });
            return;
        }
        
        try {
            console.log('Starting voice recognition...');
            
            // Request microphone permission first
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Stop the stream immediately, we just needed permission
                stream.getTracks().forEach(track => track.stop());
                console.log('Microphone permission granted');
            } catch (permissionError) {
                console.error('Microphone permission denied:', permissionError);
                this.showVoiceError('Microphone permission is required for voice input. Please allow microphone access and try again.');
                return;
            }
            
            this.isListening = true;
            this.currentVoiceInput = '';
            this.speechRecognition.start();
            this.updateVoiceButton();
            
            // Show listening indicator
            this.showVoiceListening();
            console.log('Voice recognition started successfully');
            
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            this.isListening = false;
            this.updateVoiceButton();
            this.showVoiceError('Failed to start voice recognition. Please try again.');
        }
    }

    stopVoiceRecognition() {
        if (!this.voiceEnabled || !this.isListening || !this.speechRecognition) return;
        
        try {
            this.speechRecognition.stop();
            this.isListening = false;
            this.updateVoiceButton();
            this.hideVoiceListening();
        } catch (error) {
            console.error('Error stopping voice recognition:', error);
        }
    }

    updateVoiceButton() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (!voiceBtn) return;
        
        if (this.isListening) {
            voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop Listening';
            voiceBtn.classList.add('btn-danger');
            voiceBtn.classList.remove('btn-success');
        } else {
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak Answer';
            voiceBtn.classList.add('btn-success');
            voiceBtn.classList.remove('btn-danger');
        }
    }

    showVoiceListening() {
        const modalBody = document.querySelector('.modal-body');
        let listeningDiv = document.getElementById('voiceListening');
        
        if (!listeningDiv) {
            listeningDiv = document.createElement('div');
            listeningDiv.id = 'voiceListening';
            listeningDiv.className = 'voice-listening alert alert-info mt-2';
            modalBody.appendChild(listeningDiv);
        }
        
        listeningDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>Listening... Speak your answer now</span>
            </div>
        `;
        listeningDiv.style.display = 'block';
    }

    hideVoiceListening() {
        const listeningDiv = document.getElementById('voiceListening');
        if (listeningDiv) {
            listeningDiv.style.display = 'none';
        }
    }

    showVoiceFeedback(transcript, confidence) {
        const modalBody = document.querySelector('.modal-body');
        let feedbackDiv = document.getElementById('voiceFeedback');
        
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'voiceFeedback';
            feedbackDiv.className = 'voice-feedback alert alert-success mt-2';
            modalBody.appendChild(feedbackDiv);
        }
        
        feedbackDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-check-circle me-2"></i>
                <div>
                    <strong>Voice recognized:</strong> "${transcript}"<br>
                    <small>Confidence: ${Math.round(confidence * 100)}%</small>
                </div>
            </div>
        `;
        feedbackDiv.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            if (feedbackDiv) {
                feedbackDiv.style.display = 'none';
            }
        }, 3000);
    }

    showVoiceError(message) {
        const modalBody = document.querySelector('.modal-body');
        let errorDiv = document.getElementById('voiceError');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'voiceError';
            errorDiv.className = 'voice-error alert alert-danger mt-2';
            modalBody.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <span>${message}</span>
            </div>
        `;
        errorDiv.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 5000);
    }

    setupVoiceButton() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (!voiceBtn) {
            console.log('Voice button not found in DOM');
            return;
        }
        
        console.log('Setting up voice button, voiceEnabled:', this.voiceEnabled);
        
        // Show/hide voice button based on support
        if (this.voiceEnabled) {
            voiceBtn.style.display = 'inline-block';
            this.updateVoiceButton();
            
            // Remove existing event listeners to prevent duplicates
            if (this.voiceButtonClickHandler) {
                voiceBtn.removeEventListener('click', this.voiceButtonClickHandler);
            }
            
            // Create bound handler for proper this context
            this.voiceButtonClickHandler = () => {
                console.log('Voice button clicked, isListening:', this.isListening);
                if (this.isListening) {
                    this.stopVoiceRecognition();
                } else {
                    this.startVoiceRecognition();
                }
            };
            
            // Add event listener
            voiceBtn.addEventListener('click', this.voiceButtonClickHandler);
            console.log('Voice button event listener added');
        } else {
            voiceBtn.style.display = 'none';
            console.log('Voice button hidden (voice not enabled)');
        }
    }

    cleanupVoiceElements() {
        // Clean up voice-related UI elements
        const voiceElements = ['voiceListening', 'voiceFeedback', 'voiceError'];
        voiceElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Stop voice recognition
        this.stopVoiceRecognition();
    }

    initializePlayerSetup() {
        // Show player setup modal on page load
        this.showPlayerSetupModal();
        this.setupPlayerSetupEvents();
    }

    setupPlayerSetupEvents() {
        // Player count selector
        const countButtons = document.querySelectorAll('.player-count-btn');
        countButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                countButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                // Update player inputs
                this.updatePlayerInputs(parseInt(btn.dataset.count));
            });
        });

        // Difficulty selector
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                difficultyButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                // Store difficulty and timer
                this.difficulty = btn.dataset.difficulty;
                this.timerSeconds = parseInt(btn.dataset.time);
            });
        });

        // Start game button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.handleGameStart();
        });

        // New game button
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.showPlayerSetupModal();
        });
    }

    updatePlayerInputs(playerCount) {
        const container = document.getElementById('playerInputs');
        container.innerHTML = '';
        
        for (let i = 0; i < playerCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'player-input-group';
            inputGroup.innerHTML = `
                <input type="text" class="player-input" 
                       placeholder="Enter name for Player ${i + 1} (optional)" 
                       maxlength="20">
            `;
            container.appendChild(inputGroup);
        }
    }

    async handleGameStart() {
        const inputs = document.querySelectorAll('.player-input');
        const playerNames = Array.from(inputs).map(input => input.value.trim());
        
        try {
            // Set up players with difficulty
            await this.setupPlayers(playerNames, this.difficulty);
            
            // Hide setup modal
            this.hidePlayerSetupModal();
            
            // Initialize game
            await this.initializeGame();
            
            this.gameStarted = true;
        } catch (error) {
            console.error('Error starting game:', error);
            this.showError('Failed to start game. Please try again.');
        }
    }

    async setupPlayers(playerNames, difficulty) {
        try {
            const response = await fetch('/api/game/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    players: playerNames,
                    difficulty: difficulty
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.players = data.players;
            this.currentPlayer = data.current_player;
            this.isMultiplayer = data.is_multiplayer;
            this.difficulty = data.difficulty;
            this.timerSeconds = data.timer_seconds;
            
            // Update UI based on multiplayer mode
            this.updateUIForMultiplayer();
            
        } catch (error) {
            console.error('Error setting up players:', error);
            throw error;
        }
    }

    updateUIForMultiplayer() {
        const container = document.querySelector('.container');
        if (this.isMultiplayer) {
            container.classList.add('multiplayer');
        } else {
            container.classList.remove('multiplayer');
        }
    }

    showPlayerSetupModal() {
        const modal = new bootstrap.Modal(document.getElementById('playerSetupModal'));
        modal.show();
        
        // Reset to single player
        document.querySelector('.player-count-btn[data-count="1"]').classList.add('active');
        document.querySelectorAll('.player-count-btn:not([data-count="1"])').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Reset to medium difficulty
        document.querySelector('.difficulty-btn[data-difficulty="medium"]').classList.add('active');
        document.querySelectorAll('.difficulty-btn:not([data-difficulty="medium"])').forEach(btn => {
            btn.classList.remove('active');
        });
        this.difficulty = "medium";
        this.timerSeconds = 10;
        
        this.updatePlayerInputs(1);
    }

    hidePlayerSetupModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('playerSetupModal'));
        if (modal) {
            modal.hide();
        }
    }

    updatePlayersDisplay() {
        if (!this.isMultiplayer) {
            // Single player mode - update legacy score
            this.updateScore();
            return;
        }

        const playersDisplay = document.getElementById('playersDisplay');
        playersDisplay.innerHTML = '';

        this.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-score';
            
            if (this.currentPlayer && player.name === this.currentPlayer.name) {
                playerDiv.classList.add('current-player');
            }
            
            playerDiv.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-score-value">$${player.score}</div>
            `;
            
            playersDisplay.appendChild(playerDiv);
        });
    }

    updateCurrentPlayerIndicator() {
        if (this.isMultiplayer && this.currentPlayer) {
            const indicator = document.getElementById('currentPlayerIndicator');
            const nameSpan = document.getElementById('currentPlayerName');
            if (nameSpan) {
                nameSpan.textContent = this.currentPlayer.name;
            }
        }
    }

    startTimer() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
        }
        
        this.timeLeft = this.timerSeconds;
        this.updateTimerDisplay();
        
        this.currentTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.handleTimerExpired();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
        this.stopThinkingMusic();
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        const timerText = document.getElementById('timerText');
        
        if (timerText) {
            timerText.textContent = this.timeLeft;
        }
        
        if (timerDisplay) {
            // Remove existing classes
            timerDisplay.classList.remove('warning', 'danger');
            
            // Add appropriate class based on time left
            if (this.timeLeft <= 2) {
                timerDisplay.classList.add('danger');
            } else if (this.timeLeft <= 5) {
                timerDisplay.classList.add('warning');
            }
        }
    }

    handleTimerExpired() {
        this.stopTimer();
        this.stopThinkingMusic();
        this.sounds.timeUp();
        
        // Automatically submit wrong answer
        this.submitAnswer('', true); // Pass true to indicate timeout
    }

    setupSoundEffects() {
        // Create audio context for sound effects (optional)
        this.sounds = {
            select: this.createTone(800, 0.1),
            correct: this.createTone(1000, 0.3),
            incorrect: this.createTone(300, 0.3),
            hover: this.createTone(600, 0.05),
            buzzer: this.createBuzzer(),
            timeUp: this.createTimeUpSound(),
            thinkingMusic: this.createThinkingMusic()
        };
        
        // Set up thinking music audio element
        this.thinkingMusicAudio = new Audio('/static/sound/theme.mp3');
        this.thinkingMusicAudio.loop = true;
        this.thinkingMusicAudio.volume = 0.3; // Set to comfortable background level
        this.thinkingMusicAudio.preload = 'auto';
        
        // Add error handling for audio loading
        this.thinkingMusicAudio.addEventListener('error', (e) => {
            console.warn('Error loading thinking music file:', e);
        });
        
        // Track thinking music state
        this.thinkingMusicPlaying = false;
    }

    createTone(frequency, duration) {
        return () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (e) {
                // Silently fail if audio is not supported
            }
        };
    }

    createBuzzer() {
        return () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 400;
                oscillator.type = 'sawtooth';
                
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (e) {
                // Silently fail if audio is not supported
            }
        };
    }

    createTimeUpSound() {
        return () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create a series of descending tones
                const frequencies = [800, 600, 400, 200];
                frequencies.forEach((freq, index) => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = freq;
                    oscillator.type = 'square';
                    
                    const startTime = audioContext.currentTime + (index * 0.1);
                    gainNode.gain.setValueAtTime(0.15, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.15);
                });
            } catch (e) {
                // Silently fail if audio is not supported
            }
        };
    }

    createThinkingMusic() {
        return () => {
            this.playThinkingMusic();
        };
    }

    playThinkingMusic() {
        if (this.thinkingMusicPlaying) return;
        
        try {
            this.thinkingMusicPlaying = true;
            
            // Reset audio to beginning and play
            this.thinkingMusicAudio.currentTime = 0;
            
            // Modern browsers require user interaction before playing audio
            const playPromise = this.thinkingMusicAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn('Could not play thinking music:', e);
                    this.thinkingMusicPlaying = false;
                });
            }
            
        } catch (e) {
            this.thinkingMusicPlaying = false;
            console.warn('Error playing thinking music:', e);
        }
    }

    stopThinkingMusic() {
        this.thinkingMusicPlaying = false;
        
        try {
            // Pause the audio and reset to beginning
            this.thinkingMusicAudio.pause();
            this.thinkingMusicAudio.currentTime = 0;
        } catch (e) {
            console.warn('Error stopping thinking music:', e);
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentQuestion) {
                this.hideQuestionModal();
            }
        });
    }

    async initializeGame() {
        if (this.isLoading) return;
        
        this.setLoading(true);
        this.showLoadingMessage('Initializing game...');

        try {
            const response = await fetch('/api/game/start', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.categories = data.categories;
            this.score = data.score;
            this.answeredQuestions = new Set(data.answered_questions || []);
            
            // Update multiplayer data
            if (data.players) {
                this.players = data.players;
                this.currentPlayer = data.current_player;
                this.isMultiplayer = data.is_multiplayer;
            }
            
            this.calculateTotalQuestions();
            this.updatePlayersDisplay();
            this.renderBoard();
            this.checkGameCompletion();
        } catch (error) {
            console.error('Error initializing game:', error);
            this.showError('Failed to initialize game. Please refresh and try again.');
        } finally {
            this.setLoading(false);
            this.hideLoadingMessage();
        }
    }

    calculateTotalQuestions() {
        this.totalQuestions = this.categories.length * 5; // 5 questions per category
    }

    setLoading(loading) {
        this.isLoading = loading;
        const gameBoard = document.getElementById('gameBoard');
        if (loading) {
            gameBoard.classList.add('loading');
        } else {
            gameBoard.classList.remove('loading');
        }
    }

    showLoadingMessage(message) {
        const existingMessage = document.querySelector('.loading-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-message alert alert-info text-center';
        loadingDiv.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            ${message}
        `;
        
        document.querySelector('.container').appendChild(loadingDiv);
    }

    hideLoadingMessage() {
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    showError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message alert alert-danger text-center';
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close ms-3" onclick="this.parentElement.remove()"></button>
        `;
        
        document.querySelector('.container').appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    async selectQuestion(category, value) {
        if (this.isLoading) return;
        
        const questionKey = `${category}_${value}`;
        if (this.answeredQuestions.has(questionKey)) {
            return;
        }

        // Play select sound
        this.sounds.select();

        // Find and animate the clicked cell
        const cells = document.querySelectorAll('.question-cell');
        const clickedCell = Array.from(cells).find(cell => 
            cell.textContent === `$${value}` && 
            cell.previousElementSibling?.textContent === category.toUpperCase()
        );

        if (clickedCell) {
            clickedCell.classList.add('pressed');
            setTimeout(() => {
                clickedCell.classList.remove('pressed');
            }, 200);
        }

        this.setLoading(true);

        try {
            const response = await fetch('/api/game/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ category, value })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.error) {
                this.showError(data.error);
                return;
            }
            
            this.currentQuestion = data;
            this.currentQuestion.category = category;
            this.currentQuestion.value = value;
            
            // Update current player if provided
            if (data.current_player) {
                this.currentPlayer = data.current_player;
            }
            
            // Update timer settings if provided
            if (data.timer_seconds) {
                this.timerSeconds = data.timer_seconds;
            }
            
            this.showQuestionModal();
        } catch (error) {
            console.error('Error selecting question:', error);
            this.showError('Failed to load question. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async submitAnswer(answer, isTimeout = false) {
        if (this.isLoading || (!answer.trim() && !isTimeout)) return;

        // Stop the timer and voice recognition
        this.stopTimer();
        this.stopVoiceRecognition();

        this.setLoading(true);
        const submitBtn = document.getElementById('submitAnswer');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = isTimeout ? 'Time Up!' : 'Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/game/answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answer: answer.trim() || (isTimeout ? '' : answer.trim()) })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Play sound based on result
            if (data.correct) {
                this.sounds.correct();
            } else {
                this.sounds.incorrect();
            }
            
            // Show result feedback
            this.showAnswerFeedback(data.correct, answer, isTimeout);
            
            // Update game state
            this.score = data.score;
            
            // Update multiplayer data
            if (data.players) {
                this.players = data.players;
                this.currentPlayer = data.current_player;
            }
            
            this.updatePlayersDisplay();
            
            // Add question to answered set
            const questionKey = `${this.currentQuestion.category}_${this.currentQuestion.value}`;
            this.answeredQuestions.add(questionKey);
            
            // Delay hiding modal to show feedback
            setTimeout(() => {
                this.hideQuestionModal();
                this.renderBoard();
                this.checkGameCompletion();
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting answer:', error);
            this.showError('Failed to submit answer. Please try again.');
        } finally {
            this.setLoading(false);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    showAnswerFeedback(isCorrect, userAnswer, isTimeout = false) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = `answer-feedback alert ${isCorrect ? 'alert-success' : 'alert-danger'} mt-3`;
        
        let feedbackTitle = '';
        let feedbackContent = '';
        
        if (isTimeout) {
            feedbackTitle = 'Time Up!';
            feedbackContent = `
                <div class="small">
                    Time ran out before you could answer.<br>
                    Correct answer: "${this.currentQuestion.answer}"
                </div>
            `;
        } else {
            feedbackTitle = isCorrect ? 'Correct!' : 'Incorrect!';
            feedbackContent = `
                <div class="small">
                    Your answer: "${userAnswer}"
                    ${!isCorrect ? `<br>Correct answer: "${this.currentQuestion.answer}"` : ''}
                </div>
            `;
        }
        
        feedbackDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${isTimeout ? 'fa-clock' : (isCorrect ? 'fa-check-circle' : 'fa-times-circle')} me-2"></i>
                <div>
                    <strong>${feedbackTitle}</strong>
                    ${feedbackContent}
                </div>
            </div>
        `;
        
        const modalBody = document.querySelector('.modal-body');
        const existingFeedback = modalBody.querySelector('.answer-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        modalBody.appendChild(feedbackDiv);
        
        // Disable the input and submit button
        document.getElementById('answerInput').disabled = true;
        document.getElementById('submitAnswer').disabled = true;
    }

    updateScore() {
        const scoreElement = document.getElementById('score');
        const newScore = this.score;
        
        // Animate score change
        scoreElement.style.transform = 'scale(1.2)';
        scoreElement.style.color = newScore >= 0 ? '#FFD700' : '#FF6B6B';
        
        setTimeout(() => {
            scoreElement.textContent = newScore;
            scoreElement.style.transform = 'scale(1)';
            scoreElement.style.color = '';
        }, 200);
    }

    checkGameCompletion() {
        if (this.answeredQuestions.size >= this.totalQuestions && !this.gameCompleted) {
            this.gameCompleted = true;
            setTimeout(() => {
                this.showGameCompletion();
            }, 1000);
        }
    }

    showGameCompletion() {
        const completionDiv = document.createElement('div');
        completionDiv.className = 'game-complete';
        
        let message = '';
        let performance = '';
        let finalScore = this.score;
        
        // For multiplayer, determine winner
        if (this.isMultiplayer) {
            const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
            const winner = sortedPlayers[0];
            const isTie = sortedPlayers.filter(p => p.score === winner.score).length > 1;
            
            if (isTie) {
                const tiedPlayers = sortedPlayers.filter(p => p.score === winner.score);
                message = `It's a tie! ${tiedPlayers.map(p => p.name).join(' and ')} tied with $${winner.score}! 🏆`;
                performance = 'What an exciting finish!';
            } else {
                message = `${winner.name} wins with $${winner.score}! 🏆`;
                performance = 'Congratulations to our Jeopardy champion!';
            }
            finalScore = winner.score;
        } else {
            if (finalScore >= this.totalQuestions * 200) {
                message = 'Outstanding! You\'re a Jeopardy champion! 🏆';
                performance = 'Perfect or near-perfect performance!';
            } else if (finalScore >= this.totalQuestions * 100) {
                message = 'Excellent work! You really know your stuff! 🌟';
                performance = 'Great job on most questions!';
            } else if (finalScore >= 0) {
                message = 'Good effort! Keep studying and try again! 📚';
                performance = 'Room for improvement, but you did well!';
            } else {
                message = 'Don\'t give up! Every expert was once a beginner! 💪';
                performance = 'Better luck next time!';
            }
        }
        
        let scoresDisplay = '';
        if (this.isMultiplayer) {
            const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
            scoresDisplay = `
                <div class="final-scores mt-4">
                    <h4>Final Scores:</h4>
                    ${sortedPlayers.map((player, index) => `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>${index + 1}. ${player.name}</span>
                            <span class="text-warning">$${player.score}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        completionDiv.innerHTML = `
            <h2>Game Complete!</h2>
            <div class="completion-message">
                <p class="lead">${message}</p>
                <p>${performance}</p>
                ${scoresDisplay}
                <div class="final-score mt-4">
                    <p>Questions Answered: ${this.answeredQuestions.size}/${this.totalQuestions}</p>
                </div>
                <button class="btn btn-primary btn-lg mt-3" id="playAgainBtn">
                    <i class="fas fa-redo me-2"></i>Play Again
                </button>
            </div>
        `;
        
        document.querySelector('.container').appendChild(completionDiv);
        
        // Add event listener to play again button
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.showPlayerSetupModal();
            completionDiv.remove();
            this.gameCompleted = false;
        });
        
        // Scroll to completion message
        completionDiv.scrollIntoView({ behavior: 'smooth' });
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';

        // Render categories
        this.categories.forEach(category => {
            const categoryCell = document.createElement('div');
            categoryCell.className = 'category';
            categoryCell.textContent = category.toUpperCase();
            gameBoard.appendChild(categoryCell);
        });

        // Render question cells
        const values = [100, 200, 300, 400, 500];
        values.forEach(value => {
            this.categories.forEach(category => {
                const cell = document.createElement('div');
                const questionKey = `${category}_${value}`;
                cell.className = 'question-cell';
                cell.setAttribute('tabindex', '0');
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `${category} for $${value}`);
                
                if (this.answeredQuestions.has(questionKey)) {
                    cell.classList.add('answered');
                    cell.textContent = '';
                    cell.setAttribute('aria-label', `${category} for $${value} - Already answered`);
                } else {
                    cell.textContent = `$${value}`;
                    cell.onclick = () => this.selectQuestion(category, value);
                    
                    // Add keyboard support
                    cell.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.selectQuestion(category, value);
                        }
                    };
                    
                    // Add hover sound effect
                    cell.onmouseenter = () => {
                        if (!this.isLoading) {
                            this.sounds.hover();
                        }
                    };
                }
                
                gameBoard.appendChild(cell);
            });
        });
    }

    showQuestionModal() {
        const modal = new bootstrap.Modal(document.getElementById('questionModal'));
        const questionText = document.getElementById('questionText');
        const answerInput = document.getElementById('answerInput');
        const submitBtn = document.getElementById('submitAnswer');
        
        // Reset modal state
        const existingFeedback = document.querySelector('.answer-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Clean up voice elements
        this.cleanupVoiceElements();
        
        answerInput.disabled = false;
        submitBtn.disabled = false;
        answerInput.value = '';
        
        // Update current player indicator
        this.updateCurrentPlayerIndicator();
        
        // Set question text with animation
        questionText.style.opacity = '0';
        setTimeout(() => {
            questionText.textContent = this.currentQuestion.question;
            questionText.style.opacity = '1';
        }, 100);
        
        modal.show();
        
        // Focus on input after modal is shown and start timer
        setTimeout(() => {
            answerInput.focus();
            // Play buzzer sound, start timer, and start thinking music
            this.sounds.buzzer();
            this.startTimer();
            this.sounds.thinkingMusic();
            
            // Set up voice button if available
            this.setupVoiceButton();
        }, 300);
    }

    hideQuestionModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('questionModal'));
        if (modal) {
            modal.hide();
        }
        this.stopTimer();
        this.stopThinkingMusic();
        this.cleanupVoiceElements();
        this.currentQuestion = null;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new JeopardyGame();
    
    const submitAnswer = () => {
        const answer = document.getElementById('answerInput').value;
        if (answer.trim()) {
            game.submitAnswer(answer);
        }
    };

    document.getElementById('submitAnswer').addEventListener('click', submitAnswer);
    
    // Enhanced enter key functionality
    document.getElementById('answerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitAnswer();
        }
    });
    
    // Add real-time input validation
    document.getElementById('answerInput').addEventListener('input', (e) => {
        const submitBtn = document.getElementById('submitAnswer');
        const hasText = e.target.value.trim().length > 0;
        submitBtn.disabled = !hasText || game.isLoading;
    });
    
    // Add modal event listeners
    document.getElementById('questionModal').addEventListener('hidden.bs.modal', () => {
        game.currentQuestion = null;
    });
}); 