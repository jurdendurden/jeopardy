import json
import random

class GameState:
    def __init__(self):
        self.categories = []
        self.questions = {}
        self.current_question = None
        self.score = 0  # Keep for single-player compatibility
        self.answered_questions = set()  # Track answered questions
        
        # Multiplayer support
        self.players = []  # List of player objects
        self.current_player_index = 0
        self.is_multiplayer = False
        
        # Difficulty and timer support
        self.difficulty = "medium"  # Default difficulty
        self.timer_seconds = 10  # Default timer
        
        self.load_questions()

    def setup_players(self, player_names, difficulty="medium"):
        """Set up players for multiplayer game"""
        # Set difficulty and timer
        self.difficulty = difficulty
        difficulty_times = {
            "easy": 15,
            "medium": 10,
            "hard": 5
        }
        self.timer_seconds = difficulty_times.get(difficulty, 10)
        
        if not player_names or len(player_names) == 0:
            # Single player mode
            self.players = [{"name": "Player", "score": 0}]
            self.is_multiplayer = False
        elif len(player_names) == 1:
            # Single player with custom name
            self.players = [{"name": player_names[0] or "Player", "score": 0}]
            self.is_multiplayer = False
        else:
            # Multiplayer mode (2-4 players)
            self.players = []
            for i, name in enumerate(player_names[:4]):  # Max 4 players
                player_name = name.strip() if name and name.strip() else f"Player {i+1}"
                self.players.append({"name": player_name, "score": 0})
            self.is_multiplayer = True
        
        self.current_player_index = 0
        # Update legacy score for backward compatibility
        self.score = self.players[0]["score"] if self.players else 0

    def get_current_player(self):
        """Get the current player"""
        if not self.players:
            return {"name": "Player", "score": 0}
        return self.players[self.current_player_index]

    def next_turn(self):
        """Move to the next player's turn"""
        if self.is_multiplayer and len(self.players) > 1:
            self.current_player_index = (self.current_player_index + 1) % len(self.players)

    def update_player_score(self, points):
        """Update current player's score"""
        if self.players:
            self.players[self.current_player_index]["score"] += points
            # Update legacy score for backward compatibility
            self.score = self.players[self.current_player_index]["score"]

    def load_questions(self):
        # Sample questions - in a real app, these would come from a database
        self.categories = ["History", "Science", "Literature", "Movies", "Sports"]
        self.questions = {
            "History": {
                100: {"question": "Who was the first President of the United States?", "answer": "George Washington"},
                200: {"question": "In what year did World War II end?", "answer": "1945"},
                300: {"question": "What ancient civilization built the pyramids?", "answer": "Egyptians"},
                400: {"question": "What year did the American Civil War end?", "answer": "1865"},
                500: {"question": "Who was the first person to walk on the moon?", "answer": "Neil Armstrong"}
            },
            "Science": {
                100: {"question": "What is the chemical symbol for gold?", "answer": "Au"},
                200: {"question": "What planet is known as the Red Planet?", "answer": "Mars"},
                300: {"question": "What is the largest organ in the human body?", "answer": "Skin"},
                400: {"question": "What gas do plants absorb from the atmosphere during photosynthesis?", "answer": "Carbon dioxide"},
                500: {"question": "What is the hardest natural substance on Earth?", "answer": "Diamond"}
            },
            "Literature": {
                100: {"question": "Who wrote 'Romeo and Juliet'?", "answer": "William Shakespeare"},
                200: {"question": "What is the name of the wizard school in Harry Potter?", "answer": "Hogwarts"},
                300: {"question": "Who wrote 'The Great Gatsby'?", "answer": "F. Scott Fitzgerald"},
                400: {"question": "What is the first book in the Lord of the Rings trilogy?", "answer": "The Fellowship of the Ring"},
                500: {"question": "Who wrote the novel '1984'?", "answer": "George Orwell"}
            },
            "Movies": {
                100: {"question": "What movie features the line 'May the Force be with you'?", "answer": "Star Wars"},
                200: {"question": "Who directed the movie 'Jaws'?", "answer": "Steven Spielberg"},
                300: {"question": "What movie won the Academy Award for Best Picture in 1994?", "answer": "Forrest Gump"},
                400: {"question": "What actor played the Joker in 'The Dark Knight'?", "answer": "Heath Ledger"},
                500: {"question": "What movie is known for the quote 'Here's looking at you, kid'?", "answer": "Casablanca"}
            },
            "Sports": {
                100: {"question": "How many players are on a basketball team on the court at one time?", "answer": "5"},
                200: {"question": "What sport is played at Wimbledon?", "answer": "Tennis"},
                300: {"question": "How many holes are played in a standard round of golf?", "answer": "18"},
                400: {"question": "What team won the first Super Bowl?", "answer": "Green Bay Packers"},
                500: {"question": "What country has won the most FIFA World Cups?", "answer": "Brazil"}
            }
        }

    def initialize_game(self):
        self.current_question = None
        self.answered_questions = set()
        
        # If no players are set up, default to single player
        if not self.players:
            self.setup_players(["Player"])
        
        # Reset all player scores
        for player in self.players:
            player["score"] = 0
        
        self.current_player_index = 0
        self.score = 0  # Reset legacy score
        
        return {
            "categories": self.categories,
            "score": self.score,
            "players": self.players,
            "current_player": self.get_current_player(),
            "is_multiplayer": self.is_multiplayer
        }

    def select_question(self, category, value):
        question_key = f"{category}_{value}"
        if question_key in self.answered_questions:
            return {"error": "Question already answered"}
            
        if category in self.questions and value in self.questions[category]:
            self.current_question = self.questions[category][value]
            self.current_question["category"] = category
            self.current_question["value"] = value
            return {
                "question": self.current_question["question"],
                "value": value,
                "current_player": self.get_current_player(),
                "timer_seconds": self.timer_seconds,
                "difficulty": self.difficulty
            }
        return {"error": "Question not found"}

    def check_answer(self, answer):
        if not self.current_question:
            return {"error": "No question selected"}
        
        is_correct = answer.lower().strip() == self.current_question["answer"].lower().strip()
        points = self.current_question["value"]
        correct_answer = self.current_question["answer"]  # Store the correct answer before clearing
        
        if is_correct:
            self.update_player_score(points)
        else:
            self.update_player_score(-points)
        
        # Mark question as answered
        question_key = f"{self.current_question['category']}_{self.current_question['value']}"
        self.answered_questions.add(question_key)
        
        # In multiplayer, advance to next player's turn
        if self.is_multiplayer:
            self.next_turn()
        
        result = {
            "correct": is_correct,
            "correct_answer": correct_answer,  # Include the correct answer in the response
            "score": self.score,  # Legacy score for backward compatibility
            "players": self.players,
            "current_player": self.get_current_player(),
            "is_multiplayer": self.is_multiplayer
        }
        
        self.current_question = None
        return result

    def get_game_state(self):
        return {
            "categories": self.categories,
            "score": self.score,  # Legacy score for backward compatibility
            "current_question": self.current_question,
            "answered_questions": list(self.answered_questions),
            "players": self.players,
            "current_player": self.get_current_player(),
            "is_multiplayer": self.is_multiplayer,
            "difficulty": self.difficulty,
            "timer_seconds": self.timer_seconds
        } 