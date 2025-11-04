import React, { useState, useEffect, useRef } from 'react';
import GameInfoModal from './GameInfoModal';

function GameRoom({ socket, roomCode, playerId, playerName, isPlaying = false, setCurrentView }) {
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
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
  const [alphaLastChanceTimer, setAlphaLastChanceTimer] = useState(60);
  const [showInfo, setShowInfo] = useState(false);
  const intervalRef = useRef(null);
  const alphaTimerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-updated', ({ players: roomPlayers, creatorId }) => {
      setPlayers(roomPlayers);
      setCreatorId(creatorId);
      const me = roomPlayers.find(p => p.id === playerId);
      setCurrentPlayer(me);
      // If game is not playing, clear all game-related state
      if (!isPlaying) {
        setGameResult(null);
        setSecretWord(null);
        setWordGuessed(false);
        setQuestions([]);
        setPlayerQuestionsAsked({});
        setVotes({});
        setMyVote(null);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
      }
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
      setWordGuessed(false);
      setAlphaLastChanceTimer(60);
      // Clear secretWord only if player shouldn't see it (secret-word-revealed will set it for those who should)
      // Check if current player should see word based on role
      const shouldSeeWord = me && (me.role === 'seer' || me.role === 'werewolf' || me.role === 'alpha-werewolf' || me.isShahrdar);
      if (!shouldSeeWord) {
        setSecretWord(null);
      }
      setQuestions([]);
      setVotes({});
      setMyVote(null);
      setTimeLeft(600);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (alphaTimerRef.current) {
        clearInterval(alphaTimerRef.current);
      }
    });

    socket.on('secret-word-revealed', ({ secretWord, role }) => {
      console.log(`Received secret-word-revealed: ${secretWord}, role: ${role}`);
      setSecretWord(secretWord);
      setWordLength(secretWord.length);
    });

    socket.on('werewolf-teammates', ({ teammates }) => {
      setWerewolfTeammates(teammates);
    });

    socket.on('questions-sync', ({ questions }) => {
      // Replace local questions with server snapshot on resume/start
      if (Array.isArray(questions)) {
        setQuestions(questions);
      }
    });

    socket.on('word-guessed', ({ guesserName, secretWord }) => {
      setWordGuessed(true);
      setSecretWord(secretWord);
      // Stop main timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clear any existing alpha timer
      if (alphaTimerRef.current) {
        clearInterval(alphaTimerRef.current);
        alphaTimerRef.current = null;
      }
      // Start alpha last chance timer
      setAlphaLastChanceTimer(60);
      // Start the countdown interval
      alphaTimerRef.current = setInterval(() => {
        setAlphaLastChanceTimer(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            if (alphaTimerRef.current) {
              clearInterval(alphaTimerRef.current);
              alphaTimerRef.current = null;
            }
            return 0;
          }
          return newValue;
        });
      }, 1000);
    });

    socket.on('alpha-timer-update', ({ remaining }) => {
      setAlphaLastChanceTimer(remaining);
      // Restart timer if not already running
      if (!alphaTimerRef.current && remaining > 0) {
        alphaTimerRef.current = setInterval(() => {
          setAlphaLastChanceTimer(prev => {
            const newValue = prev - 1;
            if (newValue <= 0) {
              if (alphaTimerRef.current) {
                clearInterval(alphaTimerRef.current);
                alphaTimerRef.current = null;
              }
              return 0;
            }
            return newValue;
          });
        }, 1000);
      }
    });

    socket.on('game-reset', () => {
      setGameResult(null);
      setSecretWord(null);
      setWordGuessed(false);
      setQuestions([]);
      setPlayerQuestionsAsked({});
      setVotes({});
      setMyVote(null);
      setTimeLeft(600);
      setAlphaLastChanceTimer(60);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
    });

    socket.on('alpha-last-chance-opportunity', ({ message }) => {
      alert(message);
    });

    socket.on('game-ended', ({ winner, reason, roles, secretWord, killedBy, killedPlayer }) => {
      setSecretWord(null);
      setWordGuessed(false);
      setQuestions([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
      setGameResult({ winner, reason, roles, secretWord, killedBy, killedPlayer });
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

    socket.on('room-closed', ({ message }) => {
      alert(message);
      if (setCurrentView) {
        setCurrentView('lobby');
      }
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
      socket.off('room-closed');
      socket.off('game-reset');
      socket.off('alpha-timer-update');
    };
  }, [socket, playerId, setCurrentView]);

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
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
    };
  }, [isPlaying, wordGuessed]);

  useEffect(() => {
    // End game if alpha timer runs out and word was guessed
    if (wordGuessed && alphaLastChanceTimer <= 0 && currentPlayer && currentPlayer.role === 'alpha-werewolf') {
      // Alpha werewolf ran out of time - citizens win
      if (alphaTimerRef.current) {
        clearInterval(alphaTimerRef.current);
      }
      // Emit event to server that alpha timer ran out
      socket.emit('alpha-timer-expired', { roomCode });
    }
  }, [alphaLastChanceTimer, wordGuessed, currentPlayer, socket, roomCode]);

  const handleStartGame = () => {
    socket.emit('start-game', { roomCode });
  };

  const handleLeaveRoom = () => {
    if (window.confirm('آیا مطمئن هستید می‌خواهید از اتاق خارج شوید؟')) {
      socket.emit('leave-room');
      localStorage.removeItem('lastRoomCode');
      if (setCurrentView) {
        setCurrentView('lobby');
      }
    }
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
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback to old method
        fallbackCopyTextToClipboard(link);
      });
    } else {
      // Fallback for browsers without clipboard API
      fallbackCopyTextToClipboard(link);
    }
  };
  
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
    
    document.body.removeChild(textArea);
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
          
          {gameResult.secretWord && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '10px' }}>
              <h3 style={{ marginTop: 0 }}>کلمه:</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                {gameResult.secretWord}
              </div>
            </div>
          )}
          
          {gameResult.killedBy && gameResult.killedPlayer && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#ffebee', borderRadius: '10px' }}>
              <p style={{ fontSize: '18px', margin: 0 }}>
                {gameResult.killedBy} بازیکن {gameResult.killedPlayer} را خورد
              </p>
            </div>
          )}
          
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

          {playerId === creatorId ? (
            <button 
              className="btn" 
              onClick={() => {
                setGameResult(null);
                socket.emit('restart-game', { roomCode });
              }}
              style={{ marginTop: '30px', padding: '12px 30px', fontSize: '16px' }}
            >
              شروع بازی جدید
            </button>
          ) : (
            <button 
              className="btn" 
              onClick={() => {
                window.location.reload();
              }}
              style={{ marginTop: '30px', padding: '12px 30px', fontSize: '16px' }}
            >
              خروج از بازی
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="card" style={{ maxWidth: '1400px', margin: '0 auto', height: '95vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>اتاق: {roomCode}</h2>
        </div>
        
        {!isPlaying ? (
          <div style={{ flex: '1', overflowY: 'auto' }}>
            <div className="input-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn" onClick={copyRoomLink}>
                📋 کپی لینک اتاق
              </button>
              <button className="btn" onClick={handleLeaveRoom} style={{ background: '#f44336' }}>
                خروج از اتاق
              </button>
            </div>
            {copied && <p className="copied-message">کپی شد!</p>}
            
            <div className="room-code">{roomCode}</div>
            
            <div className="players-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <h3>بازیکنان ({players.length}/24)</h3>
              {[...players].sort((a, b) => {
                // Shahrdar comes first
                if (a.isShahrdar && !b.isShahrdar) return -1;
                if (!a.isShahrdar && b.isShahrdar) return 1;
                return 0;
              }).map(player => (
                <div key={player.id} className="player-item" style={{
                  background: player.isShahrdar ? '#fff3e0' : '#f9f9f9',
                  border: player.isShahrdar ? '2px solid #ff9800' : 'none'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: player.isShahrdar ? 'bold' : 'normal' }}>
                      {player.name} {player.id === playerId && '(شما)'}
                    </span>
                    {player.isShahrdar && (
                      <span style={{ fontSize: '12px', color: '#ff9800', fontWeight: 'bold', marginTop: '4px' }}>
                        شهردار
                      </span>
                    )}
                  </div>
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

              {wordGuessed && (
                <div className="game-timer" style={{ marginBottom: '10px', background: '#ff9800', color: 'white' }}>
                  🔴 زمان آلفا گرگینه: {formatTime(alphaLastChanceTimer)} {alphaLastChanceTimer <= 10 && alphaLastChanceTimer > 0 && '(عجله کنید!)'}
                </div>
              )}

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
              {[...players].sort((a, b) => {
                // Shahrdar comes first
                if (a.isShahrdar && !b.isShahrdar) return -1;
                if (!a.isShahrdar && b.isShahrdar) return 1;
                return 0;
              }).map(player => {
                const isWerewolfRole = isWerewolf(player.role);
                const canSee = canSeeWerewolves(currentPlayer?.role);
                const showWerewolf = canSee && isWerewolfRole;
                const voteCount = votes[player.id] || 0;
                const totalPlayers = players.length;
                const questionsAsked = playerQuestionsAsked[player.name] || 0;
                
                return (
                  <div key={player.id} style={{ 
                    padding: '12px', 
                    margin: '8px 0', 
                    background: player.isShahrdar 
                      ? (myVote === player.id ? '#ffecb3' : '#fff3e0')
                      : (myVote === player.id ? '#e3f2fd' : 'white'),
                    border: player.isShahrdar 
                      ? (myVote === player.id ? '2px solid #f57c00' : '2px solid #ff9800')
                      : (myVote === player.id ? '2px solid #2196f3' : '1px solid #ddd'),
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontWeight: player.isShahrdar ? 'bold' : 'normal' }}>
                            {player.name}
                            {player.id === playerId && ' (شما)'}
                          </span>
                          {showWerewolf && <span style={{marginLeft: '8px'}}>🐺</span>}
                        </div>
                        {player.isShahrdar && (
                          <span style={{ fontSize: '12px', color: '#ff9800', fontWeight: 'bold', marginTop: '4px' }}>
                            شهردار
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {questionsAsked}/20 سوال
                      </span>
                    </div>
                    
                    {timeLeft < 480 && !wordGuessed && player.id !== playerId && (  // After 2 minutes (8 minutes left)
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <button
                            className="btn"
                            onClick={() => handleVote(player.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: myVote === player.id ? '#4CAF50' : '#2196f3',
                              color: 'white'
                            }}
                          >
                            {myVote === player.id ? '✓ رای دادید' : 'رای برای اعدام'}
                          </button>
                        </div>
                        {voteCount > 0 && (
                          <div style={{ width: '100%' }}>
                            <div style={{
                              background: '#e0e0e0',
                              borderRadius: '10px',
                              height: '8px',
                              position: 'relative'
                            }}>
                              <div style={{
                                background: '#ff5722',
                                width: `${(voteCount / totalPlayers) * 100}%`,
                                height: '100%',
                                borderRadius: '10px',
                                transition: 'width 0.3s'
                              }}></div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', textAlign: 'center' }}>
                              {voteCount} رای ({Math.round((voteCount / totalPlayers) * 100)}%)
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Only alpha werewolf can kill seer during game - show kill button for all non-werewolf players */}
                    {currentPlayer && currentPlayer.role === 'alpha-werewolf' && !isWerewolfRole && !wordGuessed && player.id !== playerId && (
                      <button 
                        className="btn" 
                        onClick={() => handleSelectPlayer(player.id)}
                        style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px', background: '#d32f2f' }}
                      >
                        🔪 کشتن (غیب‌گو)
                      </button>
                    )}
                    {/* Last chance for alpha after word guessed - only show on non-werewolf players */}
                    {currentPlayer && currentPlayer.role === 'alpha-werewolf' && !isWerewolfRole && wordGuessed && player.id !== playerId && (
                      <button 
                        className="btn" 
                        onClick={() => handleSelectPlayer(player.id)}
                        style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px', background: '#ff9800' }}
                      >
                        انتخاب به عنوان غیب‌گو
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

      {/* Info Button */}
      <button
        onClick={() => setShowInfo(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        ℹ️
      </button>

      {/* Info Modal */}
      <GameInfoModal showInfo={showInfo} setShowInfo={setShowInfo} />
    </div>
  );
}

export default GameRoom;
