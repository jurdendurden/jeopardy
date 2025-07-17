import json
import random

class GameState:
    def __init__(self):
        self.categories = []
        self.questions = {}
        self.current_question = None
        self.score = 0
        self.answered_questions = set()  # Track answered questions
        self.load_questions()

    def load_questions(self):
        # Sample questions - in a real app, these would come from a database
        self.categories = ["History", "Science", "Literature", "Movies", "Sports"]
        self.questions = {
            "History": {
                100: {"question": "Who was the first President of the United States?", "answer": "George Washington"},
                200: {"question": "In what year did World War II end?", "answer": "1945"},
                300: {"question": "What ancient civilization built the pyramids?", "answer": "Egyptians"}
            },
            "Science": {
                100: {"question": "What is the chemical symbol for gold?", "answer": "Au"},
                200: {"question": "What planet is known as the Red Planet?", "answer": "Mars"},
                300: {"question": "What is the largest organ in the human body?", "answer": "Skin"}
            },
            "Literature": {
                100: {"question": "Who wrote 'Romeo and Juliet'?", "answer": "William Shakespeare"},
                200: {"question": "What is the name of the wizard school in Harry Potter?", "answer": "Hogwarts"},
                300: {"question": "Who wrote 'The Great Gatsby'?", "answer": "F. Scott Fitzgerald"}
            }
        }

    def initialize_game(self):
        self.score = 0
        self.current_question = None
        self.answered_questions = set()
        return {
            "categories": self.categories,
            "score": self.score
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
                "value": value
            }
        return {"error": "Question not found"}

    def check_answer(self, answer):
        if not self.current_question:
            return {"error": "No question selected"}
        
        is_correct = answer.lower().strip() == self.current_question["answer"].lower().strip()
        if is_correct:
            self.score += self.current_question["value"]
        else:
            self.score -= self.current_question["value"]
        
        # Mark question as answered
        question_key = f"{self.current_question['category']}_{self.current_question['value']}"
        self.answered_questions.add(question_key)
        
        self.current_question = None
        return {
            "correct": is_correct,
            "score": self.score
        }

    def get_game_state(self):
        return {
            "categories": self.categories,
            "score": self.score,
            "current_question": self.current_question,
            "answered_questions": list(self.answered_questions)
        } 