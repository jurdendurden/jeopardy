from flask import Flask, render_template, jsonify, request
from game_logic import GameState
import json

app = Flask(__name__)
game_state = GameState()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/game/setup', methods=['POST'])
def setup_players():
    """Set up players for the game"""
    data = request.json
    player_names = data.get('players', [])
    difficulty = data.get('difficulty', 'medium')
    
    try:
        game_state.setup_players(player_names, difficulty)
        return jsonify({
            "success": True,
            "players": game_state.players,
            "is_multiplayer": game_state.is_multiplayer,
            "current_player": game_state.get_current_player(),
            "difficulty": game_state.difficulty,
            "timer_seconds": game_state.timer_seconds
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

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

@app.route('/api/game/current_player', methods=['GET'])
def get_current_player():
    """Get current player information"""
    return jsonify({
        "current_player": game_state.get_current_player(),
        "players": game_state.players,
        "is_multiplayer": game_state.is_multiplayer
    })

if __name__ == '__main__':
    app.run(debug=True) 