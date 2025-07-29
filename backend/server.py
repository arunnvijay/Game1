from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime
from models import (
    GameSession, Player, StartGameRequest, SubmitAnswerRequest,
    GameResponse, AnswerResponse, PlayerStats, RoundData
)
from game_logic import generate_question, calculate_player_stats


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "Add Nivin Add! Game API is running"}


# Start new game session
@api_router.post("/games", response_model=GameResponse)
async def start_game(request: StartGameRequest):
    try:
        # Check if player exists, if not create new player
        player = await db.players.find_one({"name": request.player_name})
        
        if not player:
            new_player = Player(name=request.player_name)
            await db.players.insert_one(new_player.dict())
            player_id = new_player.player_id
        else:
            player_id = player["player_id"]
        
        # Create new game session
        game_session = GameSession(player_id=player_id)
        
        # Generate first question
        question, correct_answer, options, operation = generate_question(1)
        
        # Add first round data
        round_data = RoundData(
            round_number=1,
            question=question,
            operation=operation,
            correct_answer=correct_answer
        )
        game_session.rounds_data = [round_data]
        
        # Save game session
        await db.game_sessions.insert_one(game_session.dict())
        
        return GameResponse(
            session_id=game_session.session_id,
            current_round=1,
            score=0,
            question=question,
            options=options,
            correct_answer=correct_answer,
            is_boss_level=False,
            is_completed=False
        )
        
    except Exception as e:
        logging.error(f"Error starting game: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start game")


# Submit answer for current round
@api_router.post("/games/{session_id}/answer", response_model=AnswerResponse)
async def submit_answer(session_id: str, request: SubmitAnswerRequest):
    try:
        # Get game session
        game_session = await db.game_sessions.find_one({"session_id": session_id})
        if not game_session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        if game_session["is_completed"]:
            raise HTTPException(status_code=400, detail="Game already completed")
        
        current_round = game_session["current_round"]
        current_round_data = game_session["rounds_data"][current_round - 1]
        
        # Check if answer is correct
        is_correct = request.player_answer == current_round_data["correct_answer"]
        score = game_session["score"] + (1 if is_correct else 0)
        
        # Update round data
        current_round_data["player_answer"] = request.player_answer
        current_round_data["is_correct"] = is_correct
        current_round_data["time_taken"] = request.time_taken
        
        # Check if game is completed
        is_game_completed = current_round >= 10
        next_round = current_round + 1 if not is_game_completed else current_round
        
        # Prepare next question if not completed
        next_question = None
        next_options = None
        next_correct_answer = None
        
        if not is_game_completed:
            next_question, next_correct_answer, next_options, next_operation = generate_question(next_round)
            next_round_data = RoundData(
                round_number=next_round,
                question=next_question,
                operation=next_operation,
                correct_answer=next_correct_answer
            )
            game_session["rounds_data"].append(next_round_data)
        
        # Update game session
        update_data = {
            "current_round": next_round,
            "score": score,
            "rounds_data": game_session["rounds_data"],
            "is_completed": is_game_completed
        }
        
        if is_game_completed:
            update_data["completed_at"] = datetime.utcnow()
            
            # Update player statistics
            player = await db.players.find_one({"player_id": game_session["player_id"]})
            if player:
                player_updates = {
                    "games_played": player.get("games_played", 0) + 1,
                    "total_score": player.get("total_score", 0) + score,
                    "last_played": datetime.utcnow()
                }
                
                if score > player.get("best_score", 0):
                    player_updates["best_score"] = score
                
                if score == 10:  # Perfect game
                    player_updates["perfect_games"] = player.get("perfect_games", 0) + 1
                
                if score >= 9:  # Completed boss level successfully
                    player_updates["boss_levels_completed"] = player.get("boss_levels_completed", 0) + 1
                
                await db.players.update_one(
                    {"player_id": game_session["player_id"]},
                    {"$set": player_updates}
                )
        
        await db.game_sessions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        response = AnswerResponse(
            is_correct=is_correct,
            correct_answer=current_round_data["correct_answer"],
            current_round=next_round if not is_game_completed else current_round,
            score=score,
            is_game_completed=is_game_completed,
            is_boss_level=current_round == 10
        )
        
        # Add next question data if game continues
        if not is_game_completed:
            response.next_question = next_question
            response.next_options = next_options
            response.next_correct_answer = next_correct_answer
            response.next_is_boss_level = next_round == 10
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error submitting answer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit answer")


# Get game session status
@api_router.get("/games/{session_id}", response_model=GameResponse)
async def get_game_session(session_id: str):
    try:
        game_session = await db.game_sessions.find_one({"session_id": session_id})
        if not game_session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        current_round = game_session["current_round"]
        current_round_data = game_session["rounds_data"][current_round - 1]
        
        return GameResponse(
            session_id=session_id,
            current_round=current_round,
            score=game_session["score"],
            question=current_round_data["question"],
            options=[],  # Options will be generated on frontend for now
            correct_answer=current_round_data["correct_answer"],
            is_boss_level=current_round == 10,
            is_completed=game_session["is_completed"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting game session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get game session")


# Get player statistics
@api_router.get("/players/{player_id}/stats", response_model=PlayerStats)
async def get_player_stats(player_id: str):
    try:
        player = await db.players.find_one({"player_id": player_id})
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        stats = calculate_player_stats(player)
        return PlayerStats(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting player stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get player stats")


# Get player by name
@api_router.get("/players/by-name/{player_name}")
async def get_player_by_name(player_name: str):
    try:
        player = await db.players.find_one({"name": player_name})
        if not player:
            return {"exists": False}
        
        return {
            "exists": True,
            "player_id": player["player_id"],
            "name": player["name"],
            "games_played": player.get("games_played", 0),
            "best_score": player.get("best_score", 0)
        }
        
    except Exception as e:
        logging.error(f"Error getting player by name: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get player")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()