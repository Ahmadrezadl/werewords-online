import React, { useState, useEffect, useRef } from 'react';
import GameInfoModal from './GameInfoModal';

/* ─── Design tokens ─── */
const C = {
  bg: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
  surface: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderBright: '1px solid rgba(255,255,255,0.22)',
  text: '#f1f5f9',
  textSub: 'rgba(255,255,255,0.50)',
  textMuted: 'rgba(255,255,255,0.28)',
  accent: '#a78bfa',
  green: '#34d399',
  red: '#f87171',
  orange: '#fb923c',
  yellow: '#fbbf24',
};

const S = {
  page: { minHeight: '100vh', background: C.bg, direction: 'rtl', color: C.text, display: 'flex', flexDirection: 'column' },

  topBar: {
    flexShrink: 0, height: '52px',
    background: 'rgba(10,14,30,0.80)',
    backdropFilter: 'blur(10px)',
    borderBottom: C.border,
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px', gap: '8px',
  },

  /* name area on the start (right in RTL) */
  nameArea: {
    display: 'flex', alignItems: 'center', gap: '6px',
    maxWidth: '42%', overflow: 'hidden',
  },
  nameText: {
    color: C.text, fontWeight: '600', fontSize: '14px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  nameInput: {
    background: 'rgba(255,255,255,0.12)',
    border: '1.5px solid rgba(255,255,255,0.35)',
    borderRadius: '7px', color: '#fff',
    padding: '4px 8px', fontSize: '13px',
    width: '130px', outline: 'none', direction: 'rtl',
  },
  roomCodeSmall: { color: C.accent, fontWeight: '800', fontSize: '16px', letterSpacing: '3px' },

  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.55)', fontSize: '18px',
    padding: '5px 7px', borderRadius: '7px', lineHeight: 1,
    flexShrink: 0,
  },

  card: { background: C.surface, borderRadius: '14px', border: C.border, padding: '16px' },
  cardAlt: (col) => ({
    background: `${col}14`, borderRadius: '14px',
    border: `1px solid ${col}30`, padding: '16px',
  }),

  btn: (bg) => ({
    background: bg || 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '12px 18px', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', direction: 'rtl', width: '100%',
  }),
  btnOutline: (col) => ({
    background: `${col}18`, border: `1px solid ${col}44`,
    color: col, borderRadius: '10px',
    padding: '10px 16px', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', direction: 'rtl', width: '100%',
  }),
  btnSm: (col) => ({
    background: `${col}18`, border: `1px solid ${col}44`,
    color: col, borderRadius: '8px',
    padding: '5px 10px', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer',
  }),

  input: {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.09)',
    border: '1.5px solid rgba(255,255,255,0.18)',
    borderRadius: '10px', color: '#fff',
    fontSize: '15px', outline: 'none',
    direction: 'rtl', boxSizing: 'border-box',
  },

  playerRow: (self, voted) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', marginBottom: '6px', borderRadius: '10px',
    background: self ? 'rgba(167,139,250,0.14)'
      : voted ? 'rgba(248,113,113,0.10)'
      : 'rgba(255,255,255,0.04)',
    border: self ? '1px solid rgba(167,139,250,0.40)'
      : voted ? '1px solid rgba(248,113,113,0.35)'
      : C.border,
    direction: 'rtl',
  }),

  qItem: (isGuess) => ({
    background: isGuess ? 'rgba(52,211,153,0.10)' : C.surface,
    border: isGuess ? '1px solid rgba(52,211,153,0.30)' : C.border,
    borderRight: isGuess ? `3px solid ${C.green}` : `3px solid rgba(167,139,250,0.5)`,
    borderRadius: '10px', padding: '10px 14px', marginBottom: '8px',
  }),

  timerBar: (urgent) => ({
    background: urgent ? 'rgba(248,113,113,0.14)' : 'rgba(167,139,250,0.12)',
    border: urgent ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(167,139,250,0.30)',
    borderRadius: '10px', padding: '9px 14px',
    display: 'flex', alignItems: 'center', gap: '8px',
    color: urgent ? C.red : C.accent,
    fontWeight: '700', fontSize: '15px', flexShrink: 0,
  }),

  voteBarTrack: { background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '5px', overflow: 'hidden', marginTop: '5px' },
  voteFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#f87171,#ef4444)', borderRadius: '6px', transition: 'width .3s' }),
};

const ROLE_NAME  = { seer: 'غیب‌گو', werewolf: 'گرگینه', 'alpha-werewolf': 'آلفا گرگینه', citizen: 'روستایی' };
const ROLE_EMOJI = { seer: '🔮', werewolf: '🐺', 'alpha-werewolf': '🐺', citizen: '👤' };
const ROLE_COLOR = { seer: C.green, werewolf: C.red, 'alpha-werewolf': C.orange, citizen: C.accent };
const roleEmoji  = (role, isShahrdar) => isShahrdar ? '🏛️' : (ROLE_EMOJI[role] || '👤');
const roleName   = (role, isShahrdar) => (ROLE_NAME[role] || role) + (isShahrdar ? ' + شهردار' : '');
const roleColor  = (role) => ROLE_COLOR[role] || C.accent;
function formatTime(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2,'0')}`; }
function formatWins(w) { if (!w) return null; return w <= 10 ? '🏆'.repeat(w) : `🏆 (${w})`; }
const isWerewolfRole = r => r === 'werewolf' || r === 'alpha-werewolf';

/* ══════════════════════════════════════════════════════════════ */
function GameRoom({ socket, roomCode, playerId, playerName, setPlayerName, isPlaying = false, setCurrentView }) {
  const [players, setPlayers]           = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [questions, setQuestions]       = useState([]);
  const [timeLeft, setTimeLeft]         = useState(600);
  const [questionInput, setQuestionInput] = useState('');
  const [copied, setCopied]             = useState(false);
  const [creatorId, setCreatorId]       = useState(null);
  const [secretWord, setSecretWord]     = useState(null);
  const [wordLength, setWordLength]     = useState(4);
  const [wordGuessed, setWordGuessed]   = useState(false);
  const [votes, setVotes]               = useState({});
  const [myVote, setMyVote]             = useState(null);
  const [gameResult, setGameResult]     = useState(null);
  const [playerQuestionsAsked, setPlayerQuestionsAsked] = useState({});
  const [alphaTimer, setAlphaTimer]     = useState(60);
  const [showInfo, setShowInfo]         = useState(false);
  const [roomSettings, setRoomSettings] = useState({ showWordLength: true, questionsPerPlayer: 20, maxPlayers: 24 });

  /* name editing */
  const [editingName, setEditingName]   = useState(false);
  const [tempName, setTempName]         = useState(playerName);
  const nameInputRef                    = useRef(null);

  const intervalRef   = useRef(null);
  const alphaTimerRef = useRef(null);

  /* focus name input when editing starts */
  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  const commitName = () => {
    const n = tempName.trim();
    if (n && setPlayerName) {
      setPlayerName(n);
      localStorage.setItem('playerName', n);
      socket.emit('update-name', { name: n });
    }
    setEditingName(false);
  };

  /* ── Socket events ── */
  useEffect(() => {
    if (!socket) return;

    socket.on('room-updated', ({ players: rp, creatorId: cid, settings }) => {
      setPlayers(rp);
      setCreatorId(cid);
      setCurrentPlayer(rp.find(p => p.id === playerId));
      if (settings) setRoomSettings(settings);
    });

    socket.on('game-started', ({ players: gp, wordLength: wl, remainingTime }) => {
      setPlayers(gp);
      const me = gp.find(p => p.id === playerId);
      setCurrentPlayer(me);
      if (wl) setWordLength(wl);
      setTimeLeft(typeof remainingTime === 'number' ? remainingTime : 600);
      setGameResult(null);
      setPlayerQuestionsAsked({});
      setWordGuessed(false);
      setAlphaTimer(60);
      const shouldSeeWord = me && (me.role === 'seer' || me.role === 'werewolf' || me.role === 'alpha-werewolf' || me.isShahrdar);
      if (!shouldSeeWord) setSecretWord(null);
      setQuestions([]);
      setVotes({});
      setMyVote(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
      // Transition view to active game (handles case where App.js listener was removed by cleanup)
      if (setCurrentView) setCurrentView('game');
    });

    socket.on('secret-word-revealed', ({ secretWord: w }) => { setSecretWord(w); setWordLength(w.length); });
    socket.on('werewolf-teammates', () => {});

    socket.on('questions-sync', ({ questions: q }) => { if (Array.isArray(q)) setQuestions(q); });

    socket.on('word-guessed', ({ secretWord: w }) => {
      setWordGuessed(true);
      setSecretWord(w);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) { clearInterval(alphaTimerRef.current); alphaTimerRef.current = null; }
    });

    socket.on('alpha-timer-update', ({ remaining }) => {
      if (alphaTimerRef.current) { clearInterval(alphaTimerRef.current); alphaTimerRef.current = null; }
      setAlphaTimer(remaining);
      if (remaining > 0) {
        alphaTimerRef.current = setInterval(() => {
          setAlphaTimer(prev => {
            if (prev <= 1) { clearInterval(alphaTimerRef.current); alphaTimerRef.current = null; return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    });

    socket.on('game-reset', () => {
      setGameResult(null); setSecretWord(null); setWordGuessed(false);
      setQuestions([]); setPlayerQuestionsAsked({}); setVotes({}); setMyVote(null);
      setTimeLeft(600); setAlphaTimer(60);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
    });

    socket.on('alpha-last-chance-opportunity', ({ message }) => alert(message));

    socket.on('game-ended', ({ winner, reason, roles, secretWord: sw, killedBy, killedPlayer }) => {
      setSecretWord(null); setWordGuessed(false); setQuestions([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
      setGameResult({ winner, reason, roles, secretWord: sw, killedBy, killedPlayer });
    });

    socket.on('word-guess-wrong', () => {});

    socket.on('question-asked', ({ playerName: pn, question, isGuess }) => {
      setQuestions(prev => {
        if (prev.some((q, i) => i === 0 && q.playerName === pn && q.question === question)) return prev;
        return [{ playerName: pn, question, reaction: null, isGuess }, ...prev];
      });
      if (!isGuess) setPlayerQuestionsAsked(prev => ({ ...prev, [pn]: (prev[pn] || 0) + 1 }));
    });

    socket.on('shahrdar-reacted', ({ questionIndex, emoji }) => {
      setQuestions(prev => {
        const next = [...prev];
        if (next[questionIndex]) next[questionIndex] = { ...next[questionIndex], reaction: emoji };
        return next;
      });
    });

    socket.on('vote-updated', ({ votes: vm }) => setVotes(vm));

    socket.on('player-killed', ({ playerName: pn, isWerewolf: iw }) =>
      alert(iw ? `گرگینه کشته شد: ${pn}!` : `شهروند کشته شد: ${pn}!`)
    );

    socket.on('room-closed', ({ message }) => {
      alert(message);
      if (setCurrentView) setCurrentView('lobby');
    });

    return () => {
      ['room-updated','game-started','question-asked','shahrdar-reacted','secret-word-revealed',
       'werewolf-teammates','word-guessed','word-guess-wrong','alpha-last-chance-opportunity',
       'game-ended','vote-updated','player-killed','room-closed','game-reset',
       'alpha-timer-update','questions-sync'].forEach(e => socket.off(e));
    };
  }, [socket, playerId, setCurrentView]);

  /* ── Main timer ── */
  useEffect(() => {
    if (isPlaying && !wordGuessed) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => { if (prev <= 0) { clearInterval(intervalRef.current); return 0; } return prev - 1; });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
    };
  }, [isPlaying, wordGuessed]);

  /* ── Alpha expiry ── */
  useEffect(() => {
    if (wordGuessed && alphaTimer <= 0 && currentPlayer?.role === 'alpha-werewolf') {
      if (alphaTimerRef.current) clearInterval(alphaTimerRef.current);
      socket.emit('alpha-timer-expired', { roomCode });
    }
  }, [alphaTimer, wordGuessed, currentPlayer, socket, roomCode]);

  /* ── Handlers ── */
  const handleStartGame = () => socket.emit('start-game', { roomCode });

  const handleLeaveRoom = () => {
    if (!window.confirm('آیا می‌خواهید از اتاق خارج شوید؟')) return;
    socket.emit('leave-room');
    localStorage.removeItem('lastRoomCode');
    if (setCurrentView) setCurrentView('lobby');
  };

  const handleAskQuestion = () => {
    const q = questionInput.trim();
    if (!q) return;
    socket.emit('ask-question', { roomCode, question: q });
    setQuestionInput('');
  };

  const handleVote = (targetId) => {
    if (myVote === targetId) {
      socket.emit('vote-execute', { roomCode, targetPlayerId: null });
      setMyVote(null);
    } else {
      socket.emit('vote-execute', { roomCode, targetPlayerId: targetId });
      setMyVote(targetId);
    }
  };

  const handleSelectPlayer = (id) => {
    if (!currentPlayer) return;
    const isAlpha = currentPlayer.role === 'alpha-werewolf' || (currentPlayer.role === 'werewolf' && currentPlayer.isShahrdar);
    if (!isAlpha) return;
    socket.emit(wordGuessed ? 'alpha-last-chance' : 'alpha-kill-seer',
      wordGuessed ? { roomCode, targetPlayerId: id } : { roomCode, seerId: id });
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomCode}`;
    (navigator.clipboard?.writeText(link) || Promise.reject())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = link; el.style.position = 'fixed'; el.style.left = '-9999px';
        document.body.appendChild(el); el.select();
        try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
        document.body.removeChild(el);
      });
  };

  /* ── Shared top bar (inline JSX, not a sub-component, to avoid stale-closure bugs) ── */
  /* Name area: editable in waiting room, read-only in game */
  const nameAreaJSX = (
    <div style={S.nameArea}>
      {editingName && !isPlaying ? (
        <>
          <input
            ref={nameInputRef}
            style={S.nameInput}
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
            maxLength={24}
          />
          <button style={{ ...S.iconBtn, color: C.green, fontSize: '16px' }} onClick={commitName}>✓</button>
          <button style={{ ...S.iconBtn, color: C.red, fontSize: '16px' }} onClick={() => setEditingName(false)}>✕</button>
        </>
      ) : (
        <>
          <span style={S.nameText}>{playerName}</span>
          {!isPlaying && (
            <button
              style={S.iconBtn}
              onClick={() => { setTempName(playerName); setEditingName(true); }}
              title="ویرایش نام"
            >✏️</button>
          )}
        </>
      )}
    </div>
  );

  const topBarJSX = (
    <div style={S.topBar}>
      {/* RIGHT side (first child in RTL): player name */}
      {nameAreaJSX}

      {/* CENTER: room code */}
      <span style={S.roomCodeSmall}>{roomCode}</span>

      {/* LEFT side (last child in RTL): actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <button style={S.iconBtn} onClick={() => setShowInfo(true)} title="راهنما">ℹ️</button>
        <button style={{ ...S.iconBtn, color: 'rgba(248,113,113,0.7)' }} onClick={handleLeaveRoom} title="خروج از اتاق">🚪</button>
      </div>
    </div>
  );

  /* ═══════════════ GAME RESULT ═══════════════ */
  if (gameResult) {
    const werewolvesWon = gameResult.winner === 'werewolves';
    return (
      <div style={{ ...S.page, overflowY: 'auto' }}>
        {topBarJSX}
        <div style={{ maxWidth: '540px', margin: '0 auto', padding: '20px 16px 40px', width: '100%' }}>

          <div style={{ ...S.card, textAlign: 'center', marginBottom: '14px', padding: '26px 20px' }}>
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>{werewolvesWon ? '🐺' : '🏘️'}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: werewolvesWon ? C.red : C.green, marginBottom: '6px' }}>
              {werewolvesWon ? 'گرگینه‌ها برنده شدند!' : 'شهروندان برنده شدند!'}
            </div>
            <div style={{ color: C.textSub }}>{gameResult.reason}</div>
          </div>

          {gameResult.secretWord && (
            <div style={{ ...S.cardAlt(C.green), textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ color: C.textSub, fontSize: '12px', marginBottom: '4px' }}>کلمه مخفی</div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: C.green }}>{gameResult.secretWord}</div>
            </div>
          )}

          {gameResult.killedBy && gameResult.killedPlayer && (
            <div style={{ ...S.cardAlt(C.red), textAlign: 'center', marginBottom: '14px' }}>
              <span style={{ color: C.textSub, fontSize: '14px' }}>
                <strong style={{ color: C.text }}>{gameResult.killedBy}</strong> بازیکن{' '}
                <strong style={{ color: C.text }}>{gameResult.killedPlayer}</strong> را انتخاب کرد
              </span>
            </div>
          )}

          <div style={{ ...S.card, marginBottom: '18px' }}>
            <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px' }}>نقش‌های بازیکنان</div>
            {gameResult.roles.map((p, i) => {
              const rc = roleColor(p.role);
              const wins = formatWins(p.wins);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', marginBottom: '6px', borderRadius: '10px',
                  background: p.isWinner ? `${rc}16` : 'rgba(255,255,255,0.04)',
                  border: p.isWinner ? `1px solid ${rc}40` : C.border,
                  direction: 'rtl',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{roleEmoji(p.role, p.isShahrdar)}</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: rc }}>{roleName(p.role, p.isShahrdar)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {p.isWinner && <span style={{ fontSize: '12px', color: C.green, fontWeight: '700' }}>✓ برنده</span>}
                    {wins && <span style={{ fontSize: '13px', color: C.yellow }}>{wins}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {playerId === creatorId && (
            <button
              style={S.btn()}
              onClick={() => { setGameResult(null); socket.emit('restart-game', { roomCode }); }}
            >
              شروع بازی جدید
            </button>
          )}
        </div>
        <GameInfoModal showInfo={showInfo} setShowInfo={setShowInfo} />
      </div>
    );
  }

  /* ═══════════════ WAITING ROOM ═══════════════ */
  if (!isPlaying) {
    return (
      <div style={{ ...S.page, overflowY: 'auto' }}>
        {topBarJSX}

        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '18px 16px 40px', width: '100%' }}>

          {/* Room code + copy link */}
          <div style={{ ...S.card, textAlign: 'center', marginBottom: '14px', padding: '18px' }}>
            <div style={{ color: C.textMuted, fontSize: '12px', marginBottom: '4px' }}>کد اتاق</div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: C.accent, letterSpacing: '6px', marginBottom: '12px' }}>
              {roomCode}
            </div>
            <button
              style={{ ...S.btnOutline(C.accent), width: 'auto', padding: '7px 20px', fontSize: '13px' }}
              onClick={copyRoomLink}
            >
              {copied ? '✅ کپی شد!' : '📋 کپی لینک دعوت'}
            </button>
          </div>

          {/* Player list */}
          <div style={{ ...S.card, marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: C.textSub, fontSize: '13px' }}>در انتظار شروع...</span>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>
                بازیکنان ({players.length}/{roomSettings.maxPlayers || 24})
              </span>
            </div>

            {players.length === 0 && (
              <div style={{ color: C.textMuted, textAlign: 'center', padding: '16px', fontSize: '14px' }}>
                در حال بارگذاری...
              </div>
            )}

            {players.map(p => (
              <div key={p.id} style={S.playerRow(p.id === playerId, false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>
                    {p.id === creatorId ? '👑' : '👤'}
                  </span>
                  <span style={{ fontWeight: p.id === playerId ? '700' : '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                    {p.id === playerId && <span style={{ color: C.textMuted, fontWeight: '400', fontSize: '12px' }}> (شما)</span>}
                  </span>
                </div>
                {playerId === creatorId && p.id !== playerId && (
                  <button
                    style={S.btnSm(C.red)}
                    onClick={() => {
                      if (window.confirm(`اخراج ${p.name}?`))
                        socket.emit('kick-player', { roomCode, targetPlayerId: p.id });
                    }}
                  >🚫</button>
                )}
              </div>
            ))}
          </div>

          {/* Waiting message */}
          {players.length < 3 && (
            <div style={{ textAlign: 'center', color: C.textSub, fontSize: '14px', marginBottom: '14px' }}>
              در انتظار بازیکنان بیشتر... (حداقل ۳ نفر)
            </div>
          )}

          {/* Start button — only creator sees it */}
          {players.length >= 3 && playerId === creatorId && (
            <button style={S.btn()} onClick={handleStartGame}>
              ▶ شروع بازی
            </button>
          )}

          {/* Leave room — small link at bottom */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.55)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
              onClick={handleLeaveRoom}
            >
              خروج از اتاق
            </button>
          </div>
        </div>

        <GameInfoModal showInfo={showInfo} setShowInfo={setShowInfo} />
      </div>
    );
  }

  /* ═══════════════ ACTIVE GAME ═══════════════ */
  const qLimit = roomSettings.questionsPerPlayer || 20;
  const totalPlayers = players.length;
  const canAlpha = currentPlayer && (
    currentPlayer.role === 'alpha-werewolf' ||
    (currentPlayer.role === 'werewolf' && currentPlayer.isShahrdar)
  );

  if (!currentPlayer) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
        {topBarJSX}
        <div style={{ color: C.textSub, marginTop: '40px' }}>در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div style={{ ...S.page, height: '100vh', overflow: 'hidden' }}>
      {topBarJSX}

      <div className="game-layout" style={{ flex: 1, padding: '8px 10px', minHeight: 0 }}>

        {/* ── MAIN: timers + word + input + questions ── */}
        <div className="game-main" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0, overflow: 'hidden' }}>

          {/* Main timer */}
          <div style={S.timerBar(timeLeft < 60)}>
            <span>⏱️</span>
            <span>زمان: {formatTime(timeLeft)}</span>
            {timeLeft < 120 && timeLeft > 0 && <span style={{ fontSize: '12px', opacity: 0.7 }}>عجله کنید!</span>}
          </div>

          {/* Alpha timer */}
          {wordGuessed && (
            <div style={{ ...S.timerBar(alphaTimer <= 10), background: alphaTimer <= 10 ? 'rgba(248,113,113,0.16)' : 'rgba(251,146,60,0.14)', color: alphaTimer <= 10 ? C.red : C.orange, border: `1px solid ${alphaTimer <= 10 ? C.red : C.orange}40` }}>
              <span>🔴</span>
              <span>زمان آلفا: {formatTime(alphaTimer)}</span>
              {alphaTimer <= 10 && alphaTimer > 0 && <span style={{ fontSize: '12px' }}>آخرین فرصت!</span>}
            </div>
          )}

          {/* Role badge */}
          <div style={{ ...S.card, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '22px' }}>{roleEmoji(currentPlayer.role, currentPlayer.isShahrdar)}</span>
            <span style={{ fontWeight: '700', color: roleColor(currentPlayer.role), fontSize: '14px' }}>
              {roleName(currentPlayer.role, currentPlayer.isShahrdar)}
            </span>
          </div>

          {/* Word display */}
          <div style={{ ...S.card, textAlign: 'center', padding: '12px', flexShrink: 0 }}>
            <div style={{ color: C.textMuted, fontSize: '11px', marginBottom: '4px' }}>کلمه</div>
            {secretWord ? (
              <div style={{ fontSize: '28px', fontWeight: '800', color: C.green }}>{secretWord}</div>
            ) : roomSettings.showWordLength && wordLength > 0 ? (
              <div style={{ fontSize: '24px', letterSpacing: '8px', color: C.textSub }}>{'–'.repeat(wordLength)}</div>
            ) : (
              <div style={{ color: C.textMuted, fontSize: '13px', fontStyle: 'italic' }}>کلمه پنهان است</div>
            )}
          </div>

          {/* Input */}
          {!currentPlayer.isShahrdar ? (
            <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="سوال بپرسید یا کلمه حدس بزنید..."
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                onKeyPress={e => { if (e.key === 'Enter') handleAskQuestion(); }}
              />
              <button style={{ ...S.btn(), width: 'auto', padding: '11px 14px', flexShrink: 0 }} onClick={handleAskQuestion}>
                ارسال
              </button>
            </div>
          ) : (
            <div style={{ ...S.card, padding: '9px 12px', flexShrink: 0, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)' }}>
              <span style={{ color: C.accent, fontWeight: '600', fontSize: '13px' }}>🏛️ شما شهردار هستید — با ایموجی پاسخ دهید</span>
            </div>
          )}

          {/* Questions */}
          <div className="question-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {questions.length === 0 ? (
              <div style={{ color: C.textMuted, textAlign: 'center', padding: '20px', fontStyle: 'italic', fontSize: '14px' }}>
                هنوز سوالی پرسیده نشده
              </div>
            ) : questions.map((q, idx) => (
              <div key={idx} style={S.qItem(q.isGuess)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: (q.reaction || currentPlayer.isShahrdar || !q.isGuess) ? '6px' : '0' }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', flexShrink: 0 }}>{q.playerName}</div>
                  <div style={{ color: q.isGuess ? C.green : C.text, fontSize: '13px', textAlign: 'right', flex: 1 }}>{q.question}</div>
                </div>
                {q.reaction ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '20px' }}>{q.reaction}</span>
                    {currentPlayer.isShahrdar && (
                      <button style={S.btnSm(C.red)} onClick={() => socket.emit('shahrdar-react', { roomCode, emoji: '', questionIndex: idx })}>🗑️</button>
                    )}
                  </div>
                ) : currentPlayer.isShahrdar ? (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {['👍🏻', '👎🏻', '❓', '😂', '👏🏻'].map(em => (
                      <button key={em}
                        style={{ background: 'rgba(255,255,255,0.07)', border: C.border, borderRadius: '7px', padding: '4px 8px', fontSize: '16px', cursor: 'pointer' }}
                        onClick={() => socket.emit('shahrdar-react', { roomCode, emoji: em, questionIndex: idx })}>
                        {em}
                      </button>
                    ))}
                  </div>
                ) : !q.isGuess ? (
                  <div style={{ color: C.textMuted, fontSize: '11px' }}>در انتظار پاسخ شهردار...</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* ── SIDE: players ── */}
        <div className="game-side" style={{ display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: C.textSub, marginBottom: '8px', flexShrink: 0 }}>
            بازیکنان ({totalPlayers})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {[...players].sort((a, b) => {
              if (a.isShahrdar && !b.isShahrdar) return -1;
              if (!a.isShahrdar && b.isShahrdar) return 1;
              return 0;
            }).map(p => {
              const isSelf = p.id === playerId;
              const pIsWerewolf = isWerewolfRole(p.role);
              const canSeeWolf = isWerewolfRole(currentPlayer.role);
              const showWolfBadge = canSeeWolf && pIsWerewolf;
              const voteCount = votes[p.id] || 0;
              const qAsked = playerQuestionsAsked[p.name] || 0;
              const showVote = timeLeft < 480 && !wordGuessed && !isSelf;

              return (
                <div key={p.id} style={{
                  background: isSelf ? 'rgba(167,139,250,0.14)'
                    : myVote === p.id ? 'rgba(248,113,113,0.10)'
                    : 'rgba(255,255,255,0.04)',
                  border: isSelf ? '1px solid rgba(167,139,250,0.40)'
                    : myVote === p.id ? '1px solid rgba(248,113,113,0.35)'
                    : C.border,
                  borderRadius: '10px', padding: '10px 12px', marginBottom: '7px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '15px', flexShrink: 0 }}>
                        {p.isShahrdar ? '🏛️' : (showWolfBadge ? '🐺' : (p.id === creatorId ? '👑' : '👤'))}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: isSelf ? '700' : '500', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}{isSelf && <span style={{ color: C.textMuted, fontWeight: '400' }}> (شما)</span>}
                        </div>
                        {(p.isShahrdar || showWolfBadge) && (
                          <div style={{ fontSize: '10px', color: p.isShahrdar ? C.orange : C.red }}>
                            {p.isShahrdar ? 'شهردار' : 'گرگینه'}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ color: C.textMuted, fontSize: '11px', flexShrink: 0 }}>{qAsked}/{qLimit}</span>
                  </div>

                  {voteCount > 0 && (
                    <div style={{ marginTop: '5px' }}>
                      <div style={S.voteBarTrack}><div style={S.voteFill((voteCount / totalPlayers) * 100)} /></div>
                      <div style={{ fontSize: '10px', color: C.red, textAlign: 'center', marginTop: '2px' }}>{voteCount} رای</div>
                    </div>
                  )}

                  {showVote && (
                    <button
                      style={{ ...S.btnSm(myVote === p.id ? C.green : C.red), width: '100%', marginTop: '7px', padding: '5px', textAlign: 'center', display: 'block' }}
                      onClick={() => handleVote(p.id)}
                    >
                      {myVote === p.id ? '✓ رای داده شد' : 'رای برای اعدام'}
                    </button>
                  )}

                  {canAlpha && !pIsWerewolf && !isSelf && !wordGuessed && (
                    <button
                      style={{ ...S.btnSm(C.red), width: '100%', marginTop: '7px', padding: '5px', textAlign: 'center', display: 'block' }}
                      onClick={() => handleSelectPlayer(p.id)}
                    >
                      🔪 کشتن (غیب‌گو؟)
                    </button>
                  )}
                  {canAlpha && !pIsWerewolf && !isSelf && wordGuessed && (
                    <button
                      style={{ ...S.btnSm(C.orange), width: '100%', marginTop: '7px', padding: '5px', textAlign: 'center', display: 'block' }}
                      onClick={() => handleSelectPlayer(p.id)}
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

      <GameInfoModal showInfo={showInfo} setShowInfo={setShowInfo} />
    </div>
  );
}

export default GameRoom;
