import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Star, Trophy, RotateCcw, Crown, User } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MathGame = () => {
  // Game state
  const [gameSession, setGameSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'won', 'lost', 'completed'
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [ballDropped, setBallDropped] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Start a new game
  const startGame = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name to start playing!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/games`, {
        player_name: playerName.trim()
      });

      setGameSession(response.data);
      setCurrentQuestion({
        question: response.data.question,
        correctAnswer: response.data.correct_answer,
        options: response.data.options,
        correctIndex: response.data.options.indexOf(response.data.correct_answer),
        isBossLevel: response.data.is_boss_level
      });
      setGameState('playing');
      setBallPosition({ x: 0, y: 0 });
      setBallDropped(false);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ball drag
  const handleBallDrag = (e) => {
    if (!isDragging || gameState !== 'playing') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setBallPosition({
      x: e.clientX - rect.left - 25,
      y: e.clientY - rect.top - 25
    });
  };

  // Handle ball drop on cup
  const handleCupDrop = async (cupIndex) => {
    if (gameState !== 'playing' || !isDragging || !gameSession) return;
    
    setBallDropped(true);
    setIsDragging(false);
    
    // Calculate time taken
    const timeTaken = startTime ? (Date.now() - startTime) / 1000 : 0;
    
    setTimeout(async () => {
      try {
        const response = await axios.post(`${API}/games/${gameSession.session_id}/answer`, {
          player_answer: currentQuestion.options[cupIndex],
          time_taken: timeTaken
        });

        if (response.data.is_correct) {
          setGameState('won');
        } else {
          setGameState('lost');
        }

        // Update game session with new data
        setGameSession(prev => ({
          ...prev,
          score: response.data.score,
          current_round: response.data.current_round,
          is_completed: response.data.is_game_completed
        }));

        // If game is completed, set state accordingly
        if (response.data.is_game_completed) {
          setTimeout(() => {
            setGameState('completed');
          }, 2000);
        }

      } catch (error) {
        console.error('Failed to submit answer:', error);
        setGameState('lost');
      }
    }, 500);
  };

  // Move to next round or restart game
  const nextRound = async () => {
    if (gameState === 'lost') {
      // Wrong answer - restart game completely
      setGameSession(null);
      setCurrentQuestion(null);
      setGameState('setup');
      setBallPosition({ x: 0, y: 0 });
      setBallDropped(false);
      setIsDragging(false);
      return;
    }

    if (!gameSession || gameSession.is_completed) {
      // Game completed, restart
      setGameSession(null);
      setCurrentQuestion(null);
      setGameState('setup');
      setBallPosition({ x: 0, y: 0 });
      setBallDropped(false);
      setIsDragging(false);
      setPlayerName('');
      return;
    }

    try {
      // Generate new question for next round
      const newQuestion = generateClientQuestion(gameSession.current_round);
      
      setCurrentQuestion(newQuestion);
      setGameState('playing');
      setBallPosition({ x: 0, y: 0 });
      setBallDropped(false);
      setIsDragging(false);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to get next round:', error);
      // Fallback to client-side generation
      const newQuestion = generateClientQuestion(gameSession.current_round);
      setCurrentQuestion(newQuestion);
      setGameState('playing');
      setBallPosition({ x: 0, y: 0 });
      setBallDropped(false);
      setIsDragging(false);
      setStartTime(Date.now());
    }
  };

  // Temporary client-side question generation (fallback)
  const generateClientQuestion = (round) => {
    const operations = ['+', '-', '×', '÷'];
    let num1, num2, operation, correctAnswer;
    
    const maxNumber = Math.min(5 + Math.floor(round * 1.5), 12);
    
    if (round === 10) {
      operation = operations[Math.floor(Math.random() * 4)];
      if (operation === '×') {
        num1 = Math.floor(Math.random() * 8) + 5;
        num2 = Math.floor(Math.random() * 8) + 5;
      } else if (operation === '÷') {
        correctAnswer = Math.floor(Math.random() * 9) + 2;
        num2 = Math.floor(Math.random() * 8) + 2;
        num1 = correctAnswer * num2;
      } else {
        num1 = Math.floor(Math.random() * 15) + 10;
        num2 = Math.floor(Math.random() * 15) + 10;
      }
    } else {
      operation = operations[Math.floor(Math.random() * 4)];
      
      if (operation === '×') {
        num1 = Math.floor(Math.random() * Math.min(round + 2, 10)) + 1;
        num2 = Math.floor(Math.random() * Math.min(round + 2, 10)) + 1;
      } else if (operation === '÷') {
        correctAnswer = Math.floor(Math.random() * maxNumber) + 1;
        num2 = Math.floor(Math.random() * Math.min(round + 1, 8)) + 1;
        num1 = correctAnswer * num2;
      } else {
        num1 = Math.floor(Math.random() * maxNumber) + 1;
        num2 = Math.floor(Math.random() * maxNumber) + 1;
      }
    }
    
    switch (operation) {
      case '+':
        correctAnswer = num1 + num2;
        break;
      case '-':
        if (num1 < num2) [num1, num2] = [num2, num1];
        correctAnswer = num1 - num2;
        break;
      case '×':
        correctAnswer = num1 * num2;
        break;
      case '÷':
        break;
      default:
        correctAnswer = num1 + num2;
    }
    
    const wrongAnswers = [];
    while (wrongAnswers.length < 2) {
      let wrong;
      if (operation === '×') {
        wrong = correctAnswer + Math.floor(Math.random() * 20) - 10;
      } else if (operation === '÷') {
        wrong = correctAnswer + Math.floor(Math.random() * 8) - 4;
      } else {
        wrong = correctAnswer + Math.floor(Math.random() * 10) - 5;
      }
      
      if (wrong !== correctAnswer && wrong > 0 && !wrongAnswers.includes(wrong)) {
        wrongAnswers.push(wrong);
      }
    }
    
    const allAnswers = [correctAnswer, ...wrongAnswers];
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);
    
    return {
      question: `${num1} ${operation} ${num2}`,
      correctAnswer,
      options: shuffledAnswers,
      correctIndex: shuffledAnswers.indexOf(correctAnswer),
      isBossLevel: round === 10
    };
  };

  // Setup screen
  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Star className="text-yellow-500" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              🎉 Add Nivin Add! 🎉
            </h1>
            <Star className="text-yellow-500" size={32} />
          </div>
          <p className="text-xl text-gray-600 font-medium mb-8">Tap. Drop. Win!</p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User size={20} className="text-gray-600" />
              <Input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && startGame()}
                className="flex-1"
              />
            </div>
            
            <Button
              onClick={startGame}
              disabled={isLoading || !playerName.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-105"
            >
              {isLoading ? 'Starting Game...' : 'Start Game!'}
            </Button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">How to Play:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Solve 10 math questions</p>
              <p>• Drag the ball to the correct answer</p>
              <p>• Face the BOSS LEVEL in round 10!</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Game completed screen
  if (gameState === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {gameSession?.score === 10 ? '🏆' : '🎉'}
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">
            {gameSession?.score === 10 ? 'Perfect Game!' : 'Game Complete!'}
          </h2>
          <p className="text-xl mb-6 text-gray-600">
            Final Score: {gameSession?.score}/10
          </p>
          
          {gameSession?.score === 10 && (
            <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
              <p className="text-yellow-800 font-semibold">
                🌟 Incredible! You got every question right!
              </p>
            </div>
          )}
          
          <Button
            onClick={nextRound}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-105"
          >
            <RotateCcw size={20} className="mr-2" />
            Play Again
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentQuestion || !gameSession) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="text-yellow-500" size={32} />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              🎉 Add Nivin Add! 🎉
            </h1>
            <Star className="text-yellow-500" size={32} />
          </div>
          <p className="text-xl text-gray-600 font-medium mb-4">Tap. Drop. Win!</p>
          
          <div className="flex items-center justify-center gap-6 text-lg">
            <div className="flex items-center gap-2">
              <User className="text-blue-600" size={20} />
              <span className="font-semibold text-gray-700">{playerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-600" size={24} />
              <span className="font-semibold text-gray-700">Score: {gameSession.score}/10</span>
            </div>
            <div className="flex items-center gap-2">
              {currentQuestion.isBossLevel ? (
                <>
                  <Crown className="text-purple-600" size={24} />
                  <span className="font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                    BOSS LEVEL!!!
                  </span>
                </>
              ) : (
                <span className="font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                  Round {gameSession.current_round}/10
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 min-h-96">
          {/* Question */}
          <div className="text-center mb-8">
            {currentQuestion.isBossLevel && (
              <div className="mb-4 animate-pulse">
                <div className="text-2xl font-bold text-purple-600 mb-2">👑 BOSS CHALLENGE 👑</div>
                <p className="text-sm text-gray-600">This is the final challenge!</p>
              </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              What is {currentQuestion.question}?
            </h2>
          </div>

          {/* Game Container */}
          <div 
            className="relative h-64 bg-gradient-to-b from-sky-100 to-sky-200 rounded-xl overflow-hidden"
            onMouseMove={handleBallDrag}
            onMouseUp={() => setIsDragging(false)}
          >
            {/* Ball */}
            <div
              className={`absolute w-12 h-12 rounded-full shadow-lg cursor-grab transform transition-transform duration-300 ${
                currentQuestion.isBossLevel 
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                  : 'bg-gradient-to-br from-red-400 to-red-600'
              } ${
                isDragging ? 'scale-110' : 'scale-100'
              } ${ballDropped ? 'animate-bounce' : ''}`}
              style={{
                left: `${ballPosition.x}px`,
                top: `${ballPosition.y}px`,
                transform: ballDropped ? 'translateY(200px)' : 'translateY(0)',
                transition: ballDropped ? 'transform 0.5s ease-in' : 'none'
              }}
              onMouseDown={() => {
                if (gameState === 'playing') {
                  setIsDragging(true);
                }
              }}
            >
              <div className="w-full h-full bg-gradient-to-tr from-white/30 to-transparent rounded-full" />
            </div>

            {/* Cups */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end p-4">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className="relative group"
                  onMouseEnter={() => {
                    if (isDragging) {
                      handleCupDrop(index);
                    }
                  }}
                >
                  <div className={`w-20 h-16 rounded-t-full relative shadow-lg transform transition-transform duration-200 group-hover:scale-105 ${
                    currentQuestion.isBossLevel 
                      ? 'bg-gradient-to-t from-purple-500 to-purple-400' 
                      : 'bg-gradient-to-t from-blue-500 to-blue-400'
                  }`}>
                    <div className={`absolute inset-0 rounded-t-full ${
                      currentQuestion.isBossLevel 
                        ? 'bg-gradient-to-t from-purple-600/50 to-transparent' 
                        : 'bg-gradient-to-t from-blue-600/50 to-transparent'
                    }`} />
                    <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-3 rounded-full ${
                      currentQuestion.isBossLevel ? 'bg-purple-400' : 'bg-blue-400'
                    }`} />
                  </div>
                  <div className="text-center mt-2">
                    <span className={`text-2xl font-bold text-white px-3 py-1 rounded-full shadow-md ${
                      currentQuestion.isBossLevel ? 'bg-purple-600' : 'bg-blue-600'
                    }`}>
                      {option}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game State Messages */}
          {gameState !== 'playing' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <Card className="p-8 text-center max-w-md mx-auto transform animate-pulse">
                {gameState === 'won' ? (
                  <div className="text-green-600">
                    <div className="text-6xl mb-4">
                      {currentQuestion.isBossLevel ? '👑' : '🎉'}
                    </div>
                    <h3 className="text-3xl font-bold mb-4">
                      {currentQuestion.isBossLevel ? 'BOSS DEFEATED!' : 'You Won!'}
                    </h3>
                    <p className="text-lg mb-6">
                      {currentQuestion.isBossLevel 
                        ? 'Incredible! You conquered the boss level!' 
                        : 'Great job! You got it right!'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <div className="text-6xl mb-4">😅</div>
                    <h3 className="text-3xl font-bold mb-4">Wrong!</h3>
                    <p className="text-lg mb-6">Try again! You can do it!</p>
                  </div>
                )}
                
                <Button
                  onClick={nextRound}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-full transform transition-all duration-200 hover:scale-105"
                >
                  <RotateCcw size={20} className="mr-2" />
                  {gameSession?.current_round >= 10 ? 'Next Round' : 'Next Round'}
                </Button>
              </Card>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <Card className="p-6 bg-white/80 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">How to Play:</h3>
            <div className="text-gray-600 space-y-2">
              <p>1. Look at the math question above</p>
              <p>2. Drag the ball to the cup with the correct answer</p>
              <p>3. Watch the ball drop into the cup!</p>
              <p>4. Complete all 10 rounds to face the BOSS LEVEL!</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MathGame;