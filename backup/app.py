from flask import Flask, render_template, jsonify, request
from game_logic import GameState
import json

app = Flask(__name__)
game_state = GameState()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/game/start', methods=['POST'])
def start_game():
    game_state.initialize_game()
    return jsonify(game_state.get_game_state())

@app.route('/api/game/select', methods=['POST'])
def select_question():
    data = request.json
    category = data.get('category')
    value = data.get('value')
    result = game_state.select_question(category, value)
    return jsonify(result)

@app.route('/api/game/answer', methods=['POST'])
def submit_answer():
    data = request.json
    answer = data.get('answer')
    result = game_state.check_answer(answer)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True) 