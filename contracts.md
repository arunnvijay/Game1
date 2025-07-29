# Add Nivin Add! - Backend Integration Contracts

## API Endpoints

### 1. Game Session Management
- **POST /api/games** - Start new game session
- **GET /api/games/{session_id}** - Get current game state
- **PUT /api/games/{session_id}** - Update game progress

### 2. Score Tracking
- **POST /api/games/{session_id}/rounds** - Submit round result
- **GET /api/players/{player_id}/stats** - Get player statistics

### 3. Player Management
- **POST /api/players** - Create/register player
- **GET /api/players/{player_id}** - Get player profile

## Data Models

### Game Session
```python
{
    "session_id": str,
    "player_id": str,
    "current_round": int (1-10),
    "score": int,
    "started_at": datetime,
    "completed_at": datetime (optional),
    "is_completed": bool,
    "rounds_data": [
        {
            "round_number": int,
            "question": str,
            "correct_answer": int,
            "player_answer": int,
            "is_correct": bool,
            "time_taken": float,
            "operation": str
        }
    ]
}
```

### Player Profile
```python
{
    "player_id": str,
    "name": str,
    "games_played": int,
    "total_score": int,
    "best_score": int,
    "boss_levels_completed": int,
    "perfect_games": int,
    "created_at": datetime,
    "last_played": datetime
}
```

### Round Result
```python
{
    "round_number": int,
    "question": str,
    "operation": str,
    "correct_answer": int,
    "player_answer": int,
    "is_correct": bool,
    "time_taken": float
}
```

## Frontend Mock Data Replacement

### Current Mock Implementation:
- Question generation happens in `MathGame.js`
- Score tracking is local state
- No persistence between sessions
- Round progression is client-side only

### Backend Integration Plan:
1. **Game Initialization**: Create game session on component mount
2. **Question Generation**: Move to backend with proper difficulty scaling
3. **Answer Submission**: Send player answers to backend for validation
4. **Progress Tracking**: Sync round progression with backend
5. **Score Persistence**: Store and retrieve player statistics

## Integration Steps:

### Phase 1: Basic Backend
- Set up MongoDB models for Game and Player
- Create API endpoints for game session management
- Implement question generation logic on backend

### Phase 2: Frontend Integration
- Replace local question generation with API calls
- Add API calls for answer submission
- Implement session management (create/resume games)

### Phase 3: Enhanced Features
- Add player profiles and statistics
- Implement leaderboards
- Add game history tracking

## Error Handling:
- Network connectivity issues
- Invalid session handling
- Question generation failures
- Score submission errors

## Security Considerations:
- Validate all answers on server side
- Prevent score manipulation
- Rate limiting for API calls