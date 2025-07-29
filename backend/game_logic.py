import random
from typing import Tuple, List


def generate_question(round_number: int) -> Tuple[str, int, List[int], str]:
    """
    Generate a math question based on the round number
    Returns: (question_string, correct_answer, answer_options, operation)
    """
    operations = ['+', '-', '×', '÷']
    
    # Increase difficulty with rounds
    max_number = min(5 + round_number, 12)
    
    # Boss level (round 10) - more challenging
    if round_number == 10:
        operation = operations[random.randint(0, 3)]
        if operation == '×':
            num1 = random.randint(5, 12)
            num2 = random.randint(5, 12)
        elif operation == '÷':
            correct_answer = random.randint(2, 10)
            num2 = random.randint(2, 9)
            num1 = correct_answer * num2
        else:
            num1 = random.randint(10, 25)
            num2 = random.randint(10, 25)
    else:
        # Progressive difficulty for rounds 1-9
        operation = operations[random.randint(0, 3)]
        
        if operation == '×':
            num1 = random.randint(1, min(round_number + 2, 10))
            num2 = random.randint(1, min(round_number + 2, 10))
        elif operation == '÷':
            correct_answer = random.randint(1, max_number)
            num2 = random.randint(1, min(round_number + 1, 8))
            num1 = correct_answer * num2
        else:
            num1 = random.randint(1, max_number)
            num2 = random.randint(1, max_number)
    
    # Calculate correct answer
    if operation == '+':
        correct_answer = num1 + num2
    elif operation == '-':
        # Ensure positive result
        if num1 < num2:
            num1, num2 = num2, num1
        correct_answer = num1 - num2
    elif operation == '×':
        correct_answer = num1 * num2
    elif operation == '÷':
        # Already calculated above
        pass
    
    # Generate wrong answers
    wrong_answers = []
    attempts = 0
    while len(wrong_answers) < 2 and attempts < 20:
        if operation == '×':
            wrong = correct_answer + random.randint(-20, 20)
        elif operation == '÷':
            wrong = correct_answer + random.randint(-8, 8)
        else:
            wrong = correct_answer + random.randint(-10, 10)
        
        if wrong != correct_answer and wrong > 0 and wrong not in wrong_answers:
            wrong_answers.append(wrong)
        attempts += 1
    
    # If we couldn't generate enough wrong answers, add some defaults
    while len(wrong_answers) < 2:
        wrong = correct_answer + len(wrong_answers) + 1
        if wrong not in wrong_answers:
            wrong_answers.append(wrong)
    
    # Shuffle all answers
    all_answers = [correct_answer] + wrong_answers
    random.shuffle(all_answers)
    
    question = f"{num1} {operation} {num2}"
    
    return question, correct_answer, all_answers, operation


def calculate_player_stats(player_data: dict) -> dict:
    """Calculate comprehensive player statistics"""
    games_played = player_data.get('games_played', 0)
    total_score = player_data.get('total_score', 0)
    
    average_score = round(total_score / games_played, 2) if games_played > 0 else 0.0
    
    return {
        'name': player_data.get('name', ''),
        'games_played': games_played,
        'total_score': total_score,
        'best_score': player_data.get('best_score', 0),
        'boss_levels_completed': player_data.get('boss_levels_completed', 0),
        'perfect_games': player_data.get('perfect_games', 0),
        'average_score': average_score
    }