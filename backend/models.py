from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class RoundData(BaseModel):
    round_number: int
    question: str
    operation: str
    correct_answer: int
    player_answer: Optional[int] = None
    is_correct: Optional[bool] = None
    time_taken: Optional[float] = None


class GameSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    current_round: int = 1
    score: int = 0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    rounds_data: List[RoundData] = []


class Player(BaseModel):
    player_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    games_played: int = 0
    total_score: int = 0
    best_score: int = 0
    boss_levels_completed: int = 0
    perfect_games: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_played: Optional[datetime] = None


class StartGameRequest(BaseModel):
    player_name: str


class SubmitAnswerRequest(BaseModel):
    player_answer: int
    time_taken: float = 0.0


class GameResponse(BaseModel):
    session_id: str
    current_round: int
    score: int
    total_rounds: int = 10
    question: str
    options: List[int]
    correct_answer: int
    is_boss_level: bool
    is_completed: bool


class AnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: int
    current_round: int
    score: int
    is_game_completed: bool
    is_boss_level: bool


class PlayerStats(BaseModel):
    name: str
    games_played: int
    total_score: int
    best_score: int
    boss_levels_completed: int
    perfect_games: int
    average_score: float