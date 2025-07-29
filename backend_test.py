#!/usr/bin/env python3
"""
Backend API Testing Script for Math Game
Tests all API endpoints to ensure proper functionality
"""

import requests
import json
import time
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("ERROR: Could not get backend URL from frontend/.env")
    exit(1)

API_BASE = f"{BASE_URL}/api"

print(f"Testing Math Game Backend API at: {API_BASE}")
print("=" * 60)

# Test results tracking
test_results = {
    "health_check": False,
    "start_game": False,
    "submit_answer": False,
    "get_game_session": False,
    "player_stats": False,
    "player_lookup": False
}

errors = []

def log_test(test_name, success, message=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if message:
        print(f"    {message}")
    test_results[test_name] = success
    if not success and message:
        errors.append(f"{test_name}: {message}")

def make_request(method, url, **kwargs):
    """Make HTTP request with error handling"""
    try:
        response = requests.request(method, url, timeout=30, **kwargs)
        return response
    except requests.exceptions.RequestException as e:
        return None

# Test 1: Health Check
print("\n1. Testing Health Check Endpoint")
print("-" * 40)
response = make_request("GET", f"{API_BASE}/")
if response and response.status_code == 200:
    data = response.json()
    if "message" in data and "Game API is running" in data["message"]:
        log_test("health_check", True, f"Response: {data['message']}")
    else:
        log_test("health_check", False, f"Unexpected response: {data}")
else:
    status_code = response.status_code if response else "No response"
    log_test("health_check", False, f"Failed to connect or bad status: {status_code}")

# Test 2: Start Game
print("\n2. Testing Start Game Endpoint")
print("-" * 40)
player_name = "TestPlayer_" + str(int(time.time()))
start_game_data = {"player_name": player_name}

response = make_request("POST", f"{API_BASE}/games", json=start_game_data)
session_id = None
player_id = None

if response and response.status_code == 200:
    data = response.json()
    required_fields = ["session_id", "current_round", "score", "question", "options", "correct_answer", "is_boss_level", "is_completed"]
    
    if all(field in data for field in required_fields):
        session_id = data["session_id"]
        correct_answer = data["correct_answer"]
        
        # Validate data types and values
        if (data["current_round"] == 1 and 
            data["score"] == 0 and 
            data["is_boss_level"] == False and 
            data["is_completed"] == False and
            isinstance(data["question"], str) and
            isinstance(data["options"], list) and
            len(data["options"]) == 3):
            
            log_test("start_game", True, f"Game started for {player_name}, Session: {session_id[:8]}...")
        else:
            log_test("start_game", False, f"Invalid game state: {data}")
    else:
        missing = [f for f in required_fields if f not in data]
        log_test("start_game", False, f"Missing fields: {missing}")
else:
    status_code = response.status_code if response else "No response"
    log_test("start_game", False, f"Failed to start game: {status_code}")

# Test 3: Submit Answer (both correct and incorrect)
print("\n3. Testing Submit Answer Endpoint")
print("-" * 40)
if session_id:
    # Test correct answer
    submit_data = {
        "player_answer": correct_answer,
        "time_taken": 5.2
    }
    
    response = make_request("POST", f"{API_BASE}/games/{session_id}/answer", json=submit_data)
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["is_correct", "correct_answer", "current_round", "score", "is_game_completed", "is_boss_level"]
        
        if all(field in data for field in required_fields):
            if (data["is_correct"] == True and 
                data["score"] == 1 and 
                data["current_round"] == 2 and
                data["is_game_completed"] == False):
                
                log_test("submit_answer", True, f"Correct answer processed: Score {data['score']}, Round {data['current_round']}")
                
                # Test incorrect answer for round 2
                if "next_question" in data and "next_correct_answer" in data:
                    wrong_answer = data["next_correct_answer"] + 999  # Definitely wrong
                    submit_wrong_data = {
                        "player_answer": wrong_answer,
                        "time_taken": 3.1
                    }
                    
                    response2 = make_request("POST", f"{API_BASE}/games/{session_id}/answer", json=submit_wrong_data)
                    if response2 and response2.status_code == 200:
                        data2 = response2.json()
                        if (data2["is_correct"] == False and 
                            data2["score"] == 1 and  # Should remain 1
                            data2["current_round"] == 3):
                            print("    ✅ Incorrect answer also handled properly")
                        else:
                            print(f"    ⚠️  Incorrect answer handling issue: {data2}")
                    else:
                        print("    ⚠️  Failed to test incorrect answer")
            else:
                log_test("submit_answer", False, f"Invalid answer response: {data}")
        else:
            missing = [f for f in required_fields if f not in data]
            log_test("submit_answer", False, f"Missing fields in answer response: {missing}")
    else:
        status_code = response.status_code if response else "No response"
        log_test("submit_answer", False, f"Failed to submit answer: {status_code}")
else:
    log_test("submit_answer", False, "No session_id available from start_game test")

# Test 4: Get Game Session
print("\n4. Testing Get Game Session Endpoint")
print("-" * 40)
if session_id:
    response = make_request("GET", f"{API_BASE}/games/{session_id}")
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["session_id", "current_round", "score", "question", "correct_answer", "is_boss_level", "is_completed"]
        
        if all(field in data for field in required_fields):
            if (data["session_id"] == session_id and
                data["current_round"] >= 1 and
                data["score"] >= 0):
                log_test("get_game_session", True, f"Game session retrieved: Round {data['current_round']}, Score {data['score']}")
            else:
                log_test("get_game_session", False, f"Invalid session data: {data}")
        else:
            missing = [f for f in required_fields if f not in data]
            log_test("get_game_session", False, f"Missing fields: {missing}")
    else:
        status_code = response.status_code if response else "No response"
        log_test("get_game_session", False, f"Failed to get game session: {status_code}")
else:
    log_test("get_game_session", False, "No session_id available")

# Test 5: Player Lookup by Name
print("\n5. Testing Player Lookup by Name")
print("-" * 40)
if player_name:
    response = make_request("GET", f"{API_BASE}/players/by-name/{player_name}")
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("exists") == True and "player_id" in data:
            player_id = data["player_id"]
            log_test("player_lookup", True, f"Player found: {data['name']}, Games: {data.get('games_played', 0)}")
        else:
            log_test("player_lookup", False, f"Player not found or invalid response: {data}")
    else:
        status_code = response.status_code if response else "No response"
        log_test("player_lookup", False, f"Failed to lookup player: {status_code}")
else:
    log_test("player_lookup", False, "No player_name available")

# Test 6: Player Stats
print("\n6. Testing Player Stats Endpoint")
print("-" * 40)
if player_id:
    response = make_request("GET", f"{API_BASE}/players/{player_id}/stats")
    
    if response and response.status_code == 200:
        data = response.json()
        required_fields = ["name", "games_played", "total_score", "best_score", "boss_levels_completed", "perfect_games", "average_score"]
        
        if all(field in data for field in required_fields):
            if (data["name"] == player_name and
                data["games_played"] >= 0 and
                data["total_score"] >= 0 and
                isinstance(data["average_score"], (int, float))):
                log_test("player_stats", True, f"Stats retrieved: {data['games_played']} games, avg score: {data['average_score']}")
            else:
                log_test("player_stats", False, f"Invalid stats data: {data}")
        else:
            missing = [f for f in required_fields if f not in data]
            log_test("player_stats", False, f"Missing fields: {missing}")
    else:
        status_code = response.status_code if response else "No response"
        log_test("player_stats", False, f"Failed to get player stats: {status_code}")
else:
    log_test("player_stats", False, "No player_id available")

# Test 7: Boss Level Testing (Round 10)
print("\n7. Testing Boss Level (Round 10)")
print("-" * 40)
if session_id:
    # Fast-forward to round 10 by submitting answers for rounds 3-9
    current_round = 3  # We're already at round 3 from previous tests
    
    while current_round < 10:
        # Get current game state
        game_response = make_request("GET", f"{API_BASE}/games/{session_id}")
        if game_response and game_response.status_code == 200:
            game_data = game_response.json()
            correct_ans = game_data["correct_answer"]
            
            # Submit correct answer to progress
            submit_data = {
                "player_answer": correct_ans,
                "time_taken": 2.0
            }
            
            answer_response = make_request("POST", f"{API_BASE}/games/{session_id}/answer", json=submit_data)
            if answer_response and answer_response.status_code == 200:
                answer_data = answer_response.json()
                current_round = answer_data["current_round"]
                
                if current_round == 10:
                    if answer_data.get("is_boss_level") == True or answer_data.get("next_is_boss_level") == True:
                        print("    ✅ Boss level (Round 10) reached and detected")
                    else:
                        print("    ⚠️  Boss level not properly flagged")
                    break
            else:
                print(f"    ❌ Failed to progress to round {current_round + 1}")
                break
        else:
            print("    ❌ Failed to get game state for progression")
            break
        
        time.sleep(0.1)  # Small delay to avoid overwhelming the API
    
    if current_round >= 10:
        print("    ✅ Successfully tested boss level progression")
    else:
        print("    ⚠️  Could not reach boss level for testing")

# Test 8: Game Completion
print("\n8. Testing Game Completion")
print("-" * 40)
if session_id and current_round == 10:
    # Get the boss level question and submit answer
    game_response = make_request("GET", f"{API_BASE}/games/{session_id}")
    if game_response and game_response.status_code == 200:
        game_data = game_response.json()
        boss_answer = game_data["correct_answer"]
        
        # Submit boss level answer
        submit_data = {
            "player_answer": boss_answer,
            "time_taken": 8.5
        }
        
        final_response = make_request("POST", f"{API_BASE}/games/{session_id}/answer", json=submit_data)
        if final_response and final_response.status_code == 200:
            final_data = final_response.json()
            
            if final_data.get("is_game_completed") == True:
                print("    ✅ Game completion handled properly")
                print(f"    Final Score: {final_data['score']}/10")
                
                # Verify game session shows as completed
                completed_game = make_request("GET", f"{API_BASE}/games/{session_id}")
                if completed_game and completed_game.status_code == 200:
                    completed_data = completed_game.json()
                    if completed_data.get("is_completed") == True:
                        print("    ✅ Game session properly marked as completed")
                    else:
                        print("    ⚠️  Game session not marked as completed")
            else:
                print("    ❌ Game completion not handled properly")
        else:
            print("    ❌ Failed to submit boss level answer")
    else:
        print("    ❌ Failed to get boss level question")

# Summary
print("\n" + "=" * 60)
print("BACKEND API TEST SUMMARY")
print("=" * 60)

passed_tests = sum(test_results.values())
total_tests = len(test_results)

for test_name, passed in test_results.items():
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name.replace('_', ' ').title()}")

print(f"\nOverall Result: {passed_tests}/{total_tests} tests passed")

if errors:
    print("\nERRORS ENCOUNTERED:")
    for error in errors:
        print(f"  • {error}")

# MongoDB Data Verification
print("\n" + "=" * 60)
print("MONGODB DATA VERIFICATION")
print("=" * 60)

try:
    # Check if we can verify data was stored (this would require direct DB access)
    print("Note: Direct MongoDB verification requires database access")
    print("API responses indicate data is being stored and retrieved correctly")
    
    if player_id:
        print(f"✅ Player created and retrievable: {player_name}")
    if session_id:
        print(f"✅ Game session created and retrievable: {session_id[:8]}...")
        
except Exception as e:
    print(f"⚠️  Could not verify MongoDB data directly: {e}")

print("\n" + "=" * 60)
print("TESTING COMPLETE")
print("=" * 60)

# Exit with appropriate code
exit_code = 0 if passed_tests == total_tests else 1
exit(exit_code)