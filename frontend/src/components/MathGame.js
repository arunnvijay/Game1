import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Star, Trophy, RotateCcw } from 'lucide-react';

const MathGame = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [score, setScore] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [ballDropped, setBallDropped] = useState(false);

  // Generate random addition question
  const generateQuestion = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const correctAnswer = num1 + num2;
    
    // Generate wrong answers
    const wrongAnswers = [];
    while (wrongAnswers.length < 2) {
      const wrong = correctAnswer + Math.floor(Math.random() * 10) - 5;
      if (wrong !== correctAnswer && wrong > 0 && !wrongAnswers.includes(wrong)) {
        wrongAnswers.push(wrong);
      }
    }
    
    // Shuffle all answers
    const allAnswers = [correctAnswer, ...wrongAnswers];
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);
    
    return {
      question: `${num1} + ${num2}`,
      correctAnswer,
      options: shuffledAnswers,
      correctIndex: shuffledAnswers.indexOf(correctAnswer)
    };
  };

  // Initialize game
  useEffect(() => {
    setCurrentQuestion(generateQuestion());
    setBallPosition({ x: 0, y: 0 });
    setBallDropped(false);
  }, []);

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
  const handleCupDrop = (cupIndex) => {
    if (gameState !== 'playing' || !isDragging) return;
    
    setBallDropped(true);
    setIsDragging(false);
    
    setTimeout(() => {
      if (cupIndex === currentQuestion.correctIndex) {
        setGameState('won');
        setScore(score + 1);
      } else {
        setGameState('lost');
      }
    }, 500);
  };

  // Restart game
  const restartGame = () => {
    setCurrentQuestion(generateQuestion());
    setGameState('playing');
    setBallPosition({ x: 0, y: 0 });
    setBallDropped(false);
    setIsDragging(false);
  };

  if (!currentQuestion) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="text-yellow-500" size={32} />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Math Drop Game
            </h1>
            <Star className="text-yellow-500" size={32} />
          </div>
          <div className="flex items-center justify-center gap-2 text-lg">
            <Trophy className="text-amber-600" size={24} />
            <span className="font-semibold text-gray-700">Score: {score}</span>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 min-h-96">
          {/* Question */}
          <div className="text-center mb-8">
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
              className={`absolute w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg cursor-grab transform transition-transform duration-300 ${
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
                  <div className="w-20 h-16 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-full relative shadow-lg transform transition-transform duration-200 group-hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-600/50 to-transparent rounded-t-full" />
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-3 bg-blue-400 rounded-full" />
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-2xl font-bold text-white bg-blue-600 px-3 py-1 rounded-full shadow-md">
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
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-3xl font-bold mb-4">You Won!</h3>
                    <p className="text-lg mb-6">Great job! You got it right!</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <div className="text-6xl mb-4">😅</div>
                    <h3 className="text-3xl font-bold mb-4">Wrong!</h3>
                    <p className="text-lg mb-6">Try again! You can do it!</p>
                  </div>
                )}
                <Button
                  onClick={restartGame}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-full transform transition-all duration-200 hover:scale-105"
                >
                  <RotateCcw size={20} className="mr-2" />
                  Next Question
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
              <p>2. Drag the red ball to the cup with the correct answer</p>
              <p>3. Watch the ball drop into the cup!</p>
              <p>4. Click "Next Question" to continue playing</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MathGame;