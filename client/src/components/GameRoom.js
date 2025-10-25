import React, { useState, useEffect, useRef } from 'react';

function GameRoom({ socket, roomCode, playerId, playerName, isPlaying = false }) {
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [questionInput, setQuestionInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [creatorId, setCreatorId] = useState(null);
  const [secretWord, setSecretWord] = useState(null);
  const [wordLength, setWordLength] = useState(4);
  const [wordGuessed, setWordGuessed] = useState(false);
  const [werewolfTeammates, setWerewolfTeammates] = useState([]);
  const [votes, setVotes] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [playerQuestionsAsked, setPlayerQuestionsAsked] = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-updated', ({ players: roomPlayers, creatorId }) => {
      setPlayers(roomPlayers);
      setCreatorId(creatorId);
      const me = roomPlayers.find(p => p.id === playerId);
      setCurrentPlayer(me);
    });

    socket.on('game-started', ({ players: gamePlayers, wordLength }) => {
      setPlayers(gamePlayers);
      const me = gamePlayers.find(p => p.id === playerId);
      setCurrentPlayer(me);
      if (wordLength) {
        setWordLength(wordLength);
      }
      setGameResult(null);
      setPlayerQuestionsAsked({});
    });

    socket.on('secret-word-revealed', ({ secretWord, role }) => {
      setSecretWord(secretWord);
      setWordLength(secretWord.length);
    });

    socket.on('werewolf-teammates', ({ teammates }) => {
      setWerewolfTeammates(teammates);
    });

    socket.on('word-guessed', ({ guesserName, secretWord }) => {
      setWordGuessed(true);
      setSecretWord(secretWord);
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    });

    socket.on('alpha-last-chance-opportunity', ({ message }) => {
      alert(message);
    });

    socket.on('game-ended', ({ winner, reason, roles }) => {
      setSecretWord(null);
      setWordGuessed(false);
      setQuestions([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setGameResult({ winner, reason, roles });
    });

    socket.on('word-guess-wrong', ({ guesserName, guess }) => {
      // Don't add duplicate - this is handled by question-asked
      // setQuestions(prev => [{ playerName: guesserName, question: `حدس زد: ${guess}`, reaction: null, isGuess: true }, ...prev]);
    });

    socket.on('question-asked', ({ playerName, question, questionsLeft, isGuess }) => {
      // Only add the question message once - check if this is a duplicate
      setQuestions(prev => {
        // Check if this exact question was already added
        const isDuplicate = prev.some((q, idx) => idx === 0 && q.playerName === playerName && q.question === question);
        if (isDuplicate) return prev;
        return [{ playerName, question, reaction: null }, ...prev];
      });
      
      // Track questions asked
      if (!isGuess) {
        setPlayerQuestionsAsked(prev => ({
          ...prev,
          [playerName]: (prev[playerName] || 0) + 1
        }));
      }
    });

    socket.on('shahrdar-reacted', ({ playerName, emoji, questionIndex }) => {
      setQuestions(prev => {
        const newQuestions = [...prev];
        if (newQuestions[questionIndex]) {
          newQuestions[questionIndex].reaction = emoji;
        }
        return newQuestions;
      });
    });

    socket.on('vote-updated', ({ votes: voteMap }) => {
      setVotes(voteMap);
    });

    socket.on('player-killed', ({ playerName, isWerewolf }) => {
      alert(isWerewolf ? `گرگینه کشته شد: ${playerName}!` : `شهروند کشته شد: ${playerName}!`);
    });

    return () => {
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('question-asked');
      socket.off('shahrdar-reacted');
      socket.off('secret-word-revealed');
      socket.off('werewolf-teammates');
      socket.off('word-guessed');
      socket.off('word-guess-wrong');
      socket.off('alpha-last-chance-opportunity');
      socket.off('game-ended');
      socket.off('vote-updated');
      socket.off('player-killed');
    };
  }, [socket, playerId]);

  useEffect(() => {
    if (isPlaying && !wordGuessed) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, wordGuessed]);

  const handleStartGame = () => {
    socket.emit('start-game', { roomCode });
  };

  const handleAskQuestion = () => {
    if (!questionInput.trim()) return;
    const input = questionInput.trim();
    
    socket.emit('ask-question', { roomCode, question: input });
    
    setQuestionInput('');
  };

  const handleReact = (emoji, questionIndex) => {
    socket.emit('shahrdar-react', { roomCode, emoji, questionIndex });
  };

  const handleSelectPlayer = (playerId) => {
    if (currentPlayer && (currentPlayer.role === 'alpha-werewolf' || (currentPlayer.role === 'werewolf' && currentPlayer.isShahrdar))) {
      if (wordGuessed) {
        socket.emit('alpha-last-chance', { roomCode, targetPlayerId: playerId });
      } else {
        socket.emit('alpha-kill-seer', { roomCode, seerId: playerId });
      }
    }
  };

  const handleVote = (targetPlayerId) => {
    if (myVote === targetPlayerId) {
      // Remove vote
      socket.emit('vote-execute', { roomCode, targetPlayerId: null });
      setMyVote(null);
    } else {
      socket.emit('vote-execute', { roomCode, targetPlayerId });
      setMyVote(targetPlayerId);
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRoleName = (role) => {
    const roles = {
      'seer': 'غیب‌گو',
      'werewolf': 'گرگینه',
      'alpha-werewolf': 'آلفا گرگینه',
      'citizen': 'روستایی'
    };
    return roles[role] || role;
  };

  const isWerewolf = (role) => role === 'werewolf' || role === 'alpha-werewolf';
  const canSeeWerewolves = (role) => isWerewolf(role);

  if (gameResult) {
    return (
      <div className="App">
        <div className="card" style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
            {gameResult.winner === 'werewolves' ? '🐺' : '🏘️'}
          </h1>
          <h2>{gameResult.winner === 'werewolves' ? 'گرگینه‌ها برنده شدند!' : 'شهروندان برنده شدند!'}</h2>
          <p style={{ fontSize: '18px', margin: '20px 0' }}>{gameResult.reason}</p>
          
          <div style={{ marginTop: '30px', textAlign: 'right' }}>
            <h3>نقش‌های بازیکنان:</h3>
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '10px', marginTop: '10px' }}>
              {gameResult.roles.map((p, idx) => (
                <div key={idx} style={{ padding: '8px 0', borderBottom: idx < gameResult.roles.length - 1 ? '1px solid #ddd' : 'none' }}>
                  <strong>{p.name}:</strong> {getRoleName(p.role)}{p.isShahrdar ? ' (شهردار)' : ''}
                </div>
              ))}
            </div>
          </div>

          <button 
            className="btn" 
            onClick={() => setGameResult(null)}
            style={{ marginTop: '30px', padding: '12px 30px', fontSize: '16px' }}
          >
            بازگشت به اتاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="card" style={{ maxWidth: '1400px', margin: '0 auto', height: '95vh', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '10px' }}>اتاق: {roomCode}</h2>
        
        {!isPlaying ? (
          <div style={{ flex: '1', overflowY: 'auto' }}>
            <div className="input-group">
              <button className="btn" onClick={copyRoomLink}>
                📋 کپی لینک اتاق
              </button>
            </div>
            {copied && <p className="copied-message">کپی شد!</p>}
            
            <div className="room-code">{roomCode}</div>
            
            <div className="players-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <h3>بازیکنان ({players.length}/24)</h3>
              {players.map(player => (
                <div key={player.id} className="player-item">
                  <span>{player.name} {player.id === playerId && '(شما)'}</span>
                  {player.isShahrdar && <span className="role-badge role-shahrdar">شهردار</span>}
                </div>
              ))}
            </div>

            {players.length >= 3 && playerId === creatorId && (
              <button className="btn" onClick={handleStartGame}>
                شروع بازی
              </button>
            )}

            {players.length < 3 && (
              <p className="waiting-message">در انتظار بازیکنان بیشتر... (حداقل ۳ نفر)</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', flex: '1', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ flex: '1', minWidth: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="game-timer" style={{ marginBottom: '10px' }}>
                ⏱️ زمان باقی‌مانده: {formatTime(timeLeft)}
              </div>

              {currentPlayer && (
                <>
                  <div style={{ marginBottom: '10px', padding: '10px', background: '#fff9c4', borderRadius: '5px' }}>
                    <p style={{ margin: 0 }}>نقش شما: <strong>{getRoleName(currentPlayer.role)}</strong>
                      {currentPlayer.isShahrdar && ' + شهردار'}
                    </p>
                  </div>
                  
                  {!currentPlayer.isShahrdar && (
                    <div className="input-group" style={{ marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="سوال بپرسید یا کلمه حدس بزنید..."
                        value={questionInput}
                        onChange={(e) => setQuestionInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAskQuestion();
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button className="btn" onClick={handleAskQuestion}>
                        ارسال
                      </button>
                    </div>
                  )}

                  {currentPlayer.isShahrdar && (
                    <div style={{ marginBottom: '10px', padding: '10px', background: '#f3e5f5', borderRadius: '5px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>شما شهردار هستید! برای هر سوال با ایموجی پاسخ دهید:</p>
                    </div>
                  )}

                  <div className="word-display" style={{ marginBottom: '10px', padding: '15px', background: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ marginTop: 0 }}>کلمه:</h3>
                    {secretWord ? (
                      <div style={{fontSize: '32px', fontWeight: 'bold', color: '#4CAF50'}}>
                        {secretWord}
                      </div>
                    ) : (
                      <div style={{fontSize: '28px', letterSpacing: '10px'}}>
                        {secretWord ? secretWord.split('').map((char, i) => char === ' ' ? ' ' : '- ').join('') : '- '.repeat(wordLength)}
                      </div>
                    )}
                  </div>

                  <div className="question-list" style={{ flex: '1', overflowY: 'auto', overflowX: 'hidden' }}>
                    <h3>سوالات و پاسخ‌ها:</h3>
                    {questions.length === 0 ? (
                      <p style={{ color: '#666', fontStyle: 'italic' }}>هنوز سوالی پرسیده نشده است</p>
                    ) : (
                      questions.map((q, idx) => (
                        <div key={idx} className="question-item" style={{ marginBottom: '10px', padding: '10px', background: '#fafafa', borderRadius: '8px' }}>
                          <div className="question-text" style={{fontWeight: q.isGuess ? 'bold' : 'normal', marginBottom: '5px'}}>
                            <strong>{q.playerName}:</strong> {q.question}
                          </div>
                          {q.reaction ? (
                            <div className="reaction" style={{ fontSize: '24px' }}>
                              {q.reaction}
                              {currentPlayer.isShahrdar && (
                                <button className="emoji-btn" onClick={() => handleReact('', idx)} style={{marginLeft: '10px', fontSize: '14px'}}>
                                  🗑️
                                </button>
                              )}
                            </div>
                          ) : currentPlayer.isShahrdar ? (
                            <div className="emoji-picker" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button className="emoji-btn" onClick={() => handleReact('👍🏻', idx)}>👍🏻</button>
                              <button className="emoji-btn" onClick={() => handleReact('👎🏻', idx)}>👎🏻</button>
                              <button className="emoji-btn" onClick={() => handleReact('❓', idx)}>❓</button>
                              <button className="emoji-btn" onClick={() => handleReact('😂', idx)}>😂</button>
                              <button className="emoji-btn" onClick={() => handleReact('👏🏻', idx)}>👏🏻</button>
                            </div>
                          ) : (
                            <div style={{ color: '#999', fontSize: '14px' }}>در انتظار پاسخ شهردار...</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ width: '350px', background: '#f5f5f5', padding: '20px', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h3 style={{ marginTop: 0 }}>وضعیت بازیکنان</h3>
              <div style={{ flex: '1', overflowY: 'auto', overflowX: 'hidden' }}>
              {players.map(player => {
                const isWerewolfRole = isWerewolf(player.role);
                const canSee = canSeeWerewolves(currentPlayer?.role);
                const showWerewolf = canSee && isWerewolfRole;
                const voteCount = votes[player.id] || 0;
                
                return (
                  <div key={player.id} style={{ 
                    padding: '10px', 
                    margin: '5px 0', 
                    background: myVote === player.id ? '#e3f2fd' : 'white',
                    border: myVote === player.id ? '2px solid #2196f3' : '1px solid #ddd',
                    borderRadius: '5px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {player.name}
                        {player.id === playerId && ' (شما)'}
                        {showWerewolf && <span style={{marginLeft: '5px'}}>🐺</span>}
                      </span>
                      {timeLeft < 240 && !wordGuessed && (
                        <button 
                          className="btn" 
                          onClick={() => handleVote(player.id)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          {myVote === player.id ? '✓' : '✓'}{voteCount > 0 && ` ${voteCount}`}
                        </button>
                      )}
                    </div>
                    {canSeeWerewolves && isWerewolfRole && wordGuessed && (
                      <button 
                        className="btn" 
                        onClick={() => handleSelectPlayer(player.id)}
                        style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px' }}
                      >
                        انتخاب به عنوان غیب‌گو
                      </button>
                    )}
                    {currentPlayer && (currentPlayer.role === 'alpha-werewolf' || (currentPlayer.role === 'werewolf' && currentPlayer.isShahrdar)) && !isWerewolfRole && !wordGuessed && player.id !== playerId && (
                      <button 
                        className="btn" 
                        onClick={() => handleSelectPlayer(player.id)}
                        style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px', background: '#d32f2f' }}
                      >
                        🔪 کشتن (غیب‌گو)
                      </button>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameRoom;
