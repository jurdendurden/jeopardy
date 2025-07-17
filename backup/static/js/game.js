class JeopardyGame {
    constructor() {
        this.categories = [];
        this.questions = {};
        this.score = 0;
        this.currentQuestion = null;
        this.answeredQuestions = new Set();
        this.initializeGame();
    }

    async initializeGame() {
        try {
            const response = await fetch('/api/game/start', {
                method: 'POST'
            });
            const data = await response.json();
            this.categories = data.categories;
            this.score = data.score;
            this.answeredQuestions = new Set(data.answered_questions || []);
            this.updateScore();
            this.renderBoard();
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }

    async selectQuestion(category, value) {
        const questionKey = `${category}_${value}`;
        if (this.answeredQuestions.has(questionKey)) {
            return;
        }

        // Find and press the clicked cell
        const cells = document.querySelectorAll('.question-cell');
        const clickedCell = Array.from(cells).find(cell => 
            cell.textContent === `$${value}` && 
            cell.previousElementSibling?.textContent === category
        );

        if (clickedCell) {
            clickedCell.classList.add('pressed');
            setTimeout(() => {
                clickedCell.classList.remove('pressed');
            }, 200);
        }

        try {
            const response = await fetch('/api/game/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ category, value })
            });
            const data = await response.json();
            if (data.error) {
                console.error(data.error);
                return;
            }
            this.currentQuestion = data;
            this.showQuestionModal();
        } catch (error) {
            console.error('Error selecting question:', error);
        }
    }

    async submitAnswer(answer) {
        try {
            const response = await fetch('/api/game/answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answer })
            });
            const data = await response.json();
            this.score = data.score;
            this.updateScore();
            this.hideQuestionModal();
            this.renderBoard();
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';

        // Render categories
        this.categories.forEach(category => {
            const categoryCell = document.createElement('div');
            categoryCell.className = 'category';
            categoryCell.textContent = category;
            gameBoard.appendChild(categoryCell);
        });

        // Render question cells
        const values = [100, 200, 300];
        values.forEach(value => {
            this.categories.forEach(category => {
                const cell = document.createElement('div');
                const questionKey = `${category}_${value}`;
                cell.className = 'question-cell';
                if (this.answeredQuestions.has(questionKey)) {
                    cell.classList.add('answered');
                    cell.textContent = '';
                } else {
                    cell.textContent = `$${value}`;
                    cell.onclick = () => this.selectQuestion(category, value);
                }
                gameBoard.appendChild(cell);
            });
        });
    }

    showQuestionModal() {
        const modal = new bootstrap.Modal(document.getElementById('questionModal'));
        document.getElementById('questionText').textContent = this.currentQuestion.question;
        const answerInput = document.getElementById('answerInput');
        answerInput.value = '';
        answerInput.focus();
        modal.show();
    }

    hideQuestionModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('questionModal'));
        modal.hide();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new JeopardyGame();
    
    const submitAnswer = () => {
        const answer = document.getElementById('answerInput').value;
        game.submitAnswer(answer);
    };

    document.getElementById('submitAnswer').addEventListener('click', submitAnswer);
    
    // Add enter key functionality
    document.getElementById('answerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });
}); 