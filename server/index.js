const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

const rooms = new Map();
const players = new Map();
const GAME_WORDS = [
  'کتاب', 'موسیقی', 'درخت', 'آسمان', 'اسباب‌بازی', 'کامپیوتر', 'گل', 'دریا',
  'کوه', 'خانه', 'دانشگاه', 'پارک', 'شیر', 'طوطی', 'دست', 'پا', 'چشم',
  'بینایی', 'رنگ', 'نور', 'فامیل', 'دوست', 'آموزش', 'آشپزی',
  'خورشید', 'ماه', 'ستاره', 'ابر', 'باران', 'برف', 'باد', 'طوفان',
  'خاک', 'آب', 'آتش', 'یخ', 'برق', 'شن', 'سنگ', 'گیاه',
  'پروانه', 'مورچه', 'زنبور', 'مگس', 'پشه', 'کرم', 'مار', 'عنکبوت',
  'فیل', 'ببر', 'خرس', 'گرگ', 'روباه', 'خرگوش', 'سنجاب', 'گربه',
  'قناری', 'عقاب', 'پلیکان', 'قو', 'اردک', 'مرغ', 'خروس', 'ماهی',
  'اسب', 'گاو', 'گوسفند', 'بز', 'خوک', 'سگ', 'موش', 'لاک‌پشت',
  'سیب', 'موز', 'پرتقال', 'نارنگی', 'لیمو', 'انار', 'هویج', 'خیار',
  'گوجه', 'پیاز', 'فلفل', 'نان', 'برنج', 'پاستا', 'سوپ', 'پیتزا',
  'آب', 'چای', 'قهوه', 'شیر', 'آب‌میوه', 'قاشق', 'چنگال', 'چاقو',
  'بشقاب', 'لیوان', 'صندلی', 'میز', 'تخت', 'مبل', 'کمد', 'چراغ',
  'تلویزیون', 'رادیو', 'موبایل', 'دوربین', 'کیف', 'کفش', 'کت', 'شلوار',
  'کراوات', 'کمربند', 'ساعت', 'عینک', 'کلاه', 'دستکش', 'جوراب', 'دمپایی',
  'سبزی', 'فلفل', 'نان', 'برنج', 'پاستا', 'سوپ', 'پیتزا',
];

// Normalize Persian text for robust equality checks
// 1) remove whitespace 2) آ -> ا 3) Arabic letters to Persian (ي->ی, ك->ک, ى->ی)
// 4) keep only Persian letters (آ..ی)
function normalizePersian(input) {
  if (typeof input !== 'string') return '';
  let s = input
    .trim()
    .replace(/\s+/g, '')
    .replace(/آ/g, 'ا')
    .replace(/ي/g, 'ی')
    .replace(/ى/g, 'ی')
    .replace(/ك/g, 'ک');
  // keep only Persian letters
  s = s.replace(/[^آ-ی]/g, '');
  return s;
}

io.on('connection', (socket) => {
  socket.on('create-room', ({ playerName, uuid }) => {
    const roomCode = generateRoomCode();
    const playerId = socket.id;
    
    rooms.set(roomCode, {
      code: roomCode,
      players: [],
      gameState: 'waiting',
      secretWord: null,
      rounds: 0,
      createdAt: Date.now(),
      creatorId: playerId,
      creatorUUID: uuid || null,
      wordGuessed: false,
      alphaTimerStartTime: null
    });
    
    players.set(playerId, {
      id: playerId,
      name: playerName,
      roomCode: roomCode,
      role: null,
      isShahrdar: false,
      questionsAsked: 0,
      uuid: uuid || null,
      connected: true
    });
    
    socket.join(roomCode);
    socket.emit('room-created', { roomCode, playerId });
  });

  socket.on('join-room', ({ roomCode, playerName, uuid }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'اتاق یافت نشد' });
      return;
    }
    
    if (room.gameState === 'playing') {
      socket.emit('error', { message: 'بازی در حال انجام است' });
      return;
    }
    
    const playerId = socket.id;
    // Try to find existing by uuid in this room
    let existing = null;
    if (uuid) {
      existing = Array.from(players.values()).find(p => p.roomCode === roomCode && p.uuid === uuid);
    }
    if (existing) {
      // Re-associate socket id and update name
      players.delete(existing.id);
      existing.id = playerId;
      existing.name = playerName;
      existing.connected = true;
      players.set(playerId, existing);
      // If this player is the creator (by UUID), restore creatorId
      if (room.creatorUUID === uuid) {
        room.creatorId = playerId;
      }
    } else {
      players.set(playerId, {
        id: playerId,
        name: playerName,
        roomCode: roomCode,
        role: null,
        isShahrdar: false,
        questionsAsked: 0,
        uuid: uuid || null,
        connected: true
      });
    }
    
    socket.join(roomCode);
    socket.emit('room-joined', { roomCode, playerId });
    
    updateRoomPlayers(roomCode);
  });

  // Resume session using UUID
  socket.on('resume-session', ({ roomCode, playerName, uuid }) => {
    const room = rooms.get(roomCode);
    if (!room || !uuid) return;
    const existing = Array.from(players.values()).find(p => p.roomCode === roomCode && p.uuid === uuid);
    if (!existing) return;
    // Update socket id and optionally name
    players.delete(existing.id);
    existing.id = socket.id;
    if (playerName) existing.name = playerName;
    existing.connected = true;
    players.set(existing.id, existing);
    // If this player is the creator (by UUID), restore creatorId
    if (room.creatorUUID === uuid) {
      room.creatorId = socket.id;
    }
    socket.join(roomCode);
    
    // Send response with game state info
    socket.emit('room-joined', { 
      roomCode, 
      playerId: existing.id,
      gameState: room.gameState,
      isPlaying: room.gameState === 'playing'
    });
    
    // If game ended, send game-ended event to restore end screen
    if (room.gameState === 'waiting' && existing.lastGameResult) {
      socket.emit('game-ended', existing.lastGameResult);
      return; // Don't proceed to game state restore
    }
    
    // If game is playing, send full game state
    if (room.gameState === 'playing' && room.secretWord) {
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
      
      // Determine what this player should see
      const isWerewolf = existing.role === 'werewolf' || existing.role === 'alpha-werewolf';
      
      const visiblePlayers = roomPlayers.map(p => {
        const showRole = p.id === existing.id || // Everyone sees their own role
                        (isWerewolf && (p.role === 'werewolf' || p.role === 'alpha-werewolf')) || // Werewolves see werewolves
                        p.isShahrdar; // Everyone sees shahrdar
        
        return {
          id: p.id,
          name: p.name,
          role: showRole ? p.role : null,
          isShahrdar: p.isShahrdar
        };
      });
      
      // Send game-started event to put client in game view
      socket.emit('game-started', {
        players: visiblePlayers,
        wordLength: room.secretWord.length
      });
      
      // Send secret word if player should see it (after a small delay)
      const shouldSeeWord = existing.role === 'seer' || 
                           existing.role === 'werewolf' || 
                           existing.role === 'alpha-werewolf' || 
                           existing.isShahrdar;
      if (shouldSeeWord) {
        setTimeout(() => {
          console.log(`Resume: Sending secret word to ${existing.name} (${existing.role}, shahrdar: ${existing.isShahrdar}): ${room.secretWord}`);
          socket.emit('secret-word-revealed', {
            secretWord: room.secretWord,
            role: existing.role
          });
        }, 100);
      }
      
      // Check if word was already guessed and restore timer state
      if (room.wordGuessed && room.alphaTimerStartTime) {
        // Calculate remaining time
        const elapsed = Math.floor((Date.now() - room.alphaTimerStartTime) / 1000);
        const remaining = Math.max(0, 60 - elapsed);
        
        // Send word-guessed event to restore state
        socket.emit('word-guessed', {
          guesserName: '',
          secretWord: room.secretWord
        });
        
        // Set timer to remaining time
        setTimeout(() => {
          socket.emit('alpha-timer-update', { remaining });
        }, 150);
      }
      
      // Send werewolf teammates if player is a werewolf
      if (existing.role === 'werewolf' || existing.role === 'alpha-werewolf') {
        const werewolves = roomPlayers.filter(p => p.role === 'werewolf' || p.role === 'alpha-werewolf');
        const teammates = werewolves.filter(w => w.id !== existing.id);
        socket.emit('werewolf-teammates', {
          teammates: teammates.map(t => ({ id: t.id, name: t.name }))
        });
      }
    } else if (room.gameState === 'waiting') {
      // If game ended, make sure client knows game is not playing
      socket.emit('room-joined', { 
        roomCode, 
        playerId: existing.id,
        gameState: room.gameState,
        isPlaying: false
      });
    }
    
    updateRoomPlayers(roomCode);
  });

  socket.on('start-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
    
    if (roomPlayers.length < 3) {
      socket.emit('error', { message: 'حداقل ۳ بازیکن نیاز است' });
      return;
    }
    
    assignRoles(roomCode, roomPlayers);
    room.gameState = 'playing';
    room.secretWord = GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)];
    room.rounds = 0;
    room.wordGuessed = false;
    room.alphaTimerStartTime = null;
    
    // Refresh roomPlayers after roles are assigned to ensure we have latest data
    const updatedRoomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
    
    // Send secret word to seer, werewolves, and shahrdar
    const seers = updatedRoomPlayers.filter(p => p.role === 'seer');
    const werewolves = updatedRoomPlayers.filter(p => p.role === 'werewolf' || p.role === 'alpha-werewolf');
    const shahrdars = updatedRoomPlayers.filter(p => p.isShahrdar);
    
    // Send secret word to players who should see it
    [...seers, ...werewolves, ...shahrdars].forEach(player => {
      // Emit directly to the socket by its ID
      console.log(`Sending secret word to ${player.name} (${player.role}, shahrdar: ${player.isShahrdar}, socketId: ${player.id}): ${room.secretWord}`);
      io.to(player.id).emit('secret-word-revealed', {
        secretWord: room.secretWord,
        role: player.role
      });
    });
    
    // Send werewolf teammates to each werewolf
    werewolves.forEach(werewolf => {
      const teammates = werewolves.filter(w => w.id !== werewolf.id);
      io.to(werewolf.id).emit('werewolf-teammates', {
        teammates: teammates.map(t => ({ id: t.id, name: t.name }))
      });
    });
    
    // Send personalized game-started to each player with filtered role visibility
    updatedRoomPlayers.forEach(player => {
      const isWerewolf = player.role === 'werewolf' || player.role === 'alpha-werewolf';
      
      const visiblePlayers = updatedRoomPlayers.map(p => {
        const showRole = p.id === player.id || // Everyone sees their own role
                        (isWerewolf && (p.role === 'werewolf' || p.role === 'alpha-werewolf')) || // Werewolves see werewolves
                        p.isShahrdar; // Everyone sees shahrdar
        
        return {
          id: p.id,
          name: p.name,
          role: showRole ? p.role : null,
          isShahrdar: p.isShahrdar
        };
      });
      
      // Send game-started first
      io.to(player.id).emit('game-started', {
        players: visiblePlayers,
        wordLength: room.secretWord.length
      });
      
      // Then send secret word if player should see it (after a small delay to ensure game-started is processed)
      const shouldSeeWord = player.role === 'seer' || 
                           player.role === 'werewolf' || 
                           player.role === 'alpha-werewolf' || 
                           player.isShahrdar;
      if (shouldSeeWord) {
        setTimeout(() => {
          io.to(player.id).emit('secret-word-revealed', {
            secretWord: room.secretWord,
            role: player.role
          });
        }, 100);
      }
    });
  });

  socket.on('ask-question', ({ roomCode, question }) => {
    const player = players.get(socket.id);
    if (!player || player.questionsAsked >= 20) {
      socket.emit('error', { message: 'شما نمی‌توانید سوال بیشتری بپرسید' });
      return;
    }
    
    const room = rooms.get(roomCode);
    const isCorrect = normalizePersian(question) === normalizePersian(room.secretWord);
    
    if (isCorrect) {
      // Correct guess - only send one message
      io.to(roomCode).emit('question-asked', {
        playerName: player.name,
        question: `کلمه را پیدا کرد: ${question} ✅`,
        questionsLeft: 0,
        isGuess: true
      });
      
      io.to(roomCode).emit('word-guessed', {
        guesserName: player.name,
        secretWord: room.secretWord
      });
      
      // Mark word as guessed and start alpha timer
      room.wordGuessed = true;
      room.alphaTimerStartTime = Date.now();
      
      const alphaWerewolf = Array.from(players.values()).find(p => p.roomCode === roomCode && p.role === 'alpha-werewolf');
      if (alphaWerewolf) {
        io.to(alphaWerewolf.id).emit('alpha-last-chance-opportunity', {
          message: 'شما یک فرصت آخر برای پیدا کردن غیب‌گو دارید!'
        });
      }
      
      room.gameState = 'waiting';
    } else {
      // Wrong guess - don't send word-guess-wrong, just let ask-question handle it
      // io.to(roomCode).emit('word-guess-wrong', {
      //   guesserName: player.name,
      //   guess: question
      // });
      
      // Also send as regular question
      player.questionsAsked++;
      io.to(roomCode).emit('question-asked', {
        playerName: player.name,
        question: `پرسید: ${question}`,
        questionsLeft: 20 - player.questionsAsked,
        isGuess: false
      });
    }
  });

  socket.on('shahrdar-react', ({ roomCode, emoji, questionIndex }) => {
    const room = rooms.get(roomCode);
    const player = players.get(socket.id);
    
    if (!player || !player.isShahrdar) {
      socket.emit('error', { message: 'شما شهردار نیستید' });
      return;
    }
    
    io.to(roomCode).emit('shahrdar-reacted', {
      playerName: player.name,
      emoji: emoji || null,
      questionIndex: questionIndex
    });
  });

  socket.on('guess-word', ({ roomCode, guess }) => {
    const room = rooms.get(roomCode);
    const player = players.get(socket.id);
    
    if (!player || !room) return;
    
    if (normalizePersian(guess) === normalizePersian(room.secretWord)) {
      // Add correct guess message (only once)
      io.to(roomCode).emit('question-asked', {
        playerName: player.name,
        question: `کلمه را پیدا کرد: ${guess} ✅`,
        questionsLeft: 0,
        isGuess: true
      });
      
      io.to(roomCode).emit('word-guessed', {
        guesserName: player.name,
        secretWord: room.secretWord
      });
      
      // Give alpha werewolf a chance to identify seer
      const alphaWerewolf = Array.from(players.values()).find(p => p.roomCode === roomCode && p.role === 'alpha-werewolf');
      if (alphaWerewolf) {
        io.to(alphaWerewolf.id).emit('alpha-last-chance-opportunity', {
          message: 'شما یک فرصت آخر برای پیدا کردن غیب‌گو دارید!'
        });
      }
      
      room.gameState = 'waiting';
    } else {
      // Wrong guess
      io.to(roomCode).emit('word-guess-wrong', {
        guesserName: player.name,
        guess: guess
      });
    }
  });

  socket.on('vote-execute', ({ roomCode, targetPlayerId }) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const room = rooms.get(roomCode);
    if (!room) return;
    
    if (!room.votes) {
      room.votes = {};
    }
    
    if (targetPlayerId === null) {
      // Remove vote
      delete room.votes[player.id];
    } else {
      room.votes[player.id] = targetPlayerId;
    }
    
    // Count votes for each player
    const voteCounts = {};
    Object.values(room.votes).forEach(targetId => {
      if (targetId) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
      }
    });
    
    io.to(roomCode).emit('vote-updated', { votes: voteCounts });
    
    // Check if majority voted for someone (more than half)
    const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
    const majority = Math.floor(roomPlayers.length / 2) + 1;
    
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    if (maxVotes >= majority) {
      const killedPlayerId = Object.keys(voteCounts).find(k => voteCounts[k] === maxVotes);
      const killedPlayer = Array.from(players.values()).find(p => p.id === killedPlayerId);
      
      if (killedPlayer) {
        const isWerewolf = killedPlayer.role === 'werewolf' || killedPlayer.role === 'alpha-werewolf';
        
        io.to(roomCode).emit('player-killed', {
          playerName: killedPlayer.name,
          isWerewolf: isWerewolf
        });
        
        if (!isWerewolf) {
          // Citizens killed a citizen - werewolves win
          const roomPlayersFull = Array.from(players.values()).filter(p => p.roomCode === roomCode);
          endGame(roomCode, {
            winner: 'werewolves',
            reason: 'شهروندی توسط مردم کشته شد',
            roles: roomPlayersFull.map(p => ({
              name: p.name,
              role: p.role,
              isShahrdar: p.isShahrdar
            })),
            secretWord: room.secretWord
          });
        } else {
          // Check if all werewolves are killed
          const remainingWerewolves = roomPlayers.filter(p => {
            const fullPlayer = players.get(p.id);
            return fullPlayer && (fullPlayer.role === 'werewolf' || fullPlayer.role === 'alpha-werewolf');
          });
          
          if (remainingWerewolves.length === 0) {
            const roomPlayersFull = Array.from(players.values()).filter(p => p.roomCode === roomCode);
            endGame(roomCode, {
              winner: 'citizens',
              reason: 'تمام گرگینه‌ها کشته شدند',
              roles: roomPlayersFull.map(p => ({
                name: p.name,
                role: p.role,
                isShahrdar: p.isShahrdar
              })),
              secretWord: room.secretWord
            });
          }
        }
      }
    }
  });

  socket.on('alpha-kill-seer', ({ roomCode, seerId }) => {
    const player = players.get(socket.id);
    const room = rooms.get(roomCode);
    
    // Allow alpha werewolf OR werewolf+shahrdar
    const isAlpha = player && player.role === 'alpha-werewolf';
    const isWerewolfShahrdar = player && player.role === 'werewolf' && player.isShahrdar;
    
    if (!player || (!isAlpha && !isWerewolfShahrdar)) {
      socket.emit('error', { message: 'شما آلفا گرگینه نیستید' });
      return;
    }
    
    const target = Array.from(players.values()).find(p => p.id === seerId);
    if (target && target.role === 'seer') {
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
      endGame(roomCode, {
        winner: 'werewolves',
        reason: 'آلفا گرگینه غیب‌گو را کشت',
        roles: roomPlayers.map(p => ({
          name: p.name,
          role: p.role,
          isShahrdar: p.isShahrdar
        })),
        secretWord: room.secretWord,
        killedBy: player.name,
        killedPlayer: target.name
      });
    } else if (target) {
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
      endGame(roomCode, {
        winner: 'citizens',
        reason: 'آلفا گرگینه اشتباه کرد',
        roles: roomPlayers.map(p => ({
          name: p.name,
          role: p.role,
          isShahrdar: p.isShahrdar
        })),
        secretWord: room.secretWord,
        killedBy: player.name,
        killedPlayer: target.name
      });
    }
  });

  socket.on('alpha-last-chance', ({ roomCode, targetPlayerId }) => {
    const player = players.get(socket.id);
    const room = rooms.get(roomCode);
    
    const isAlpha = player && player.role === 'alpha-werewolf';
    const isWerewolfShahrdar = player && player.role === 'werewolf' && player.isShahrdar;
    
    if (!player || (!isAlpha && !isWerewolfShahrdar)) {
      socket.emit('error', { message: 'شما آلفا گرگینه نیستید' });
      return;
    }
    
    const target = Array.from(players.values()).find(p => p.id === targetPlayerId);
    if (target && target.role === 'seer') {
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
      endGame(roomCode, {
        winner: 'werewolves',
        reason: 'آلفا گرگینه غیب‌گو را پیدا کرد',
        roles: roomPlayers.map(p => ({
          name: p.name,
          role: p.role,
          isShahrdar: p.isShahrdar
        })),
        secretWord: room.secretWord,
        killedBy: player.name,
        killedPlayer: target.name
      });
    } else if (target) {
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
      endGame(roomCode, {
        winner: 'citizens',
        reason: 'آلفا گرگینه اشتباه کرد',
        roles: roomPlayers.map(p => ({
          name: p.name,
          role: p.role,
          isShahrdar: p.isShahrdar
        })),
        secretWord: room.secretWord,
        killedBy: player.name,
        killedPlayer: target.name
      });
    }
  });

  socket.on('alpha-timer-expired', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    const player = players.get(socket.id);
    
    if (!room || !player) return;
    
    // Only alpha werewolf can trigger this
    if (player.role !== 'alpha-werewolf') return;
    
    // Alpha werewolf ran out of time - citizens win
    const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
    endGame(roomCode, {
      winner: 'citizens',
      reason: 'زمان آلفا گرگینه تمام شد',
      roles: roomPlayers.map(p => ({
        name: p.name,
        role: p.role,
        isShahrdar: p.isShahrdar
      })),
      secretWord: room.secretWord
    });
  });

  socket.on('restart-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    const player = players.get(socket.id);
    
    if (!room || !player) return;
    
    // Only room creator can restart (check by UUID or socket.id)
    const isCreator = room.creatorId === socket.id || (player.uuid && room.creatorUUID === player.uuid);
    if (!isCreator) {
      socket.emit('error', { message: 'فقط سازنده اتاق می‌تواند بازی را شروع کند' });
      return;
    }
    
    // Reset game state
    room.gameState = 'waiting';
    room.secretWord = null;
    room.votes = {};
    room.wordGuessed = false;
    room.alphaTimerStartTime = null;
    
    // Reset all players
    const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
    roomPlayers.forEach(p => {
      p.role = null;
      p.isShahrdar = false;
      p.questionsAsked = 0;
      p.lastGameResult = null; // Clear game result
    });
    
    // Notify all clients to clear game result
    io.to(roomCode).emit('game-reset');
    
    updateRoomPlayers(roomCode);
  });

  socket.on('leave-room', () => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const room = rooms.get(player.roomCode);
    if (!room) return;
    
    // If creator leaves, close the room
    if (room.creatorId === socket.id) {
      // Notify all players
      io.to(player.roomCode).emit('room-closed', { message: 'سازنده اتاق خارج شد' });
      // Remove all players from this room
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === player.roomCode);
      roomPlayers.forEach(p => players.delete(p.id));
      // Delete the room
      rooms.delete(player.roomCode);
    } else {
      // Regular player leaves
      players.delete(socket.id);
      updateRoomPlayers(room.code);
    }
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      player.connected = false;
      // keep the player to allow resume; re-store under same id
      players.set(socket.id, player);
      const room = rooms.get(player.roomCode);
      if (room) {
        updateRoomPlayers(room.code);
      }
    }
  });
});

// Helper function to emit game-ended and store result for players
function endGame(roomCode, gameResult) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
  
  // Store game result for each player (for resume after refresh)
  roomPlayers.forEach(p => {
    p.lastGameResult = gameResult;
  });
  
  // Emit to all players in room
  io.to(roomCode).emit('game-ended', gameResult);
  
  // Set room state to waiting
  room.gameState = 'waiting';
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let length = 1;
  let roomCode;
  
  // Try codes starting from 1 character, increasing length if duplicate found
  do {
    roomCode = '';
    for (let i = 0; i < length; i++) {
      roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    length++;
  } while (rooms.has(roomCode) && length <= 10); // Max 10 characters to prevent infinite loop
  
  return roomCode;
}

function assignRoles(roomCode, roomPlayersArray) {
  const werewolvesCount = Math.floor(roomPlayersArray.length / 3);
  const indexes = Array.from({ length: roomPlayersArray.length }, (_, i) => i);
  
  // Reset all roles and shahrdar flags first
  roomPlayersArray.forEach(p => {
    p.role = null;
    p.isShahrdar = false;
    p.questionsAsked = 0;
  });
  
  // Shuffle and assign roles
  shuffleArray(indexes);
  
  let idx = 0;
  
  // Alpha werewolf
  roomPlayersArray[indexes[idx++]].role = 'alpha-werewolf';
  
  // Other werewolves
  for (let i = 1; i < werewolvesCount && idx < indexes.length; i++) {
    roomPlayersArray[indexes[idx++]].role = 'werewolf';
  }
  
  // Seer
  roomPlayersArray[indexes[idx++]].role = 'seer';
  
  // Rest are citizens
  while (idx < indexes.length) {
    roomPlayersArray[indexes[idx++]].role = 'citizen';
  }
  
  // Assign Shahrdar (random) - only one!
  const shahrdarIndex = Math.floor(Math.random() * roomPlayersArray.length);
  roomPlayersArray[shahrdarIndex].isShahrdar = true;
  
  // Update the global players Map
  roomPlayersArray.forEach(p => {
    players.set(p.id, p);
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updateRoomPlayers(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
  
  // Send personalized player lists to each client based on their role
  roomPlayers.forEach(player => {
    const isWerewolf = player.role === 'werewolf' || player.role === 'alpha-werewolf';
    
    // Filter players based on visibility rules:
    // - Everyone sees their own role
    // - Werewolves see other werewolves' roles
    // - Everyone sees shahrdar
    // - Others see null for roles
    const visiblePlayers = roomPlayers.map(p => {
      const showRole = room.gameState === 'playing' && (
        p.id === player.id || // Everyone sees their own role
        (isWerewolf && (p.role === 'werewolf' || p.role === 'alpha-werewolf')) || // Werewolves see werewolves
        p.isShahrdar // Everyone sees shahrdar
      );
      
      return {
        id: p.id,
        name: p.name,
        role: showRole ? p.role : (room.gameState === 'playing' ? null : null),
        isShahrdar: room.gameState === 'playing' ? p.isShahrdar : false
      };
    });
    
    io.to(player.id).emit('room-updated', {
      players: visiblePlayers,
      creatorId: room.creatorId
    });
  });
}

// Cleanup old rooms (older than 4 hours)
function cleanupOldRooms() {
  const now = Date.now();
  const fourHoursAgo = now - (4 * 60 * 60 * 1000);
  
  for (const [roomCode, room] of rooms.entries()) {
    if (room.createdAt < fourHoursAgo) {
      // Remove all players in this room
      const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
      roomPlayers.forEach(p => players.delete(p.id));
      // Delete the room
      rooms.delete(roomCode);
      console.log(`Deleted old room: ${roomCode}`);
    }
  }
}

// Run cleanup every 1 minute
setInterval(cleanupOldRooms, 60 * 1000);

// Serve React app for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
