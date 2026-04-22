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
  'خاک', 'آتش', 'یخ', 'برق', 'شن', 'سنگ', 'گیاه',
  'پروانه', 'مورچه', 'زنبور', 'مگس', 'پشه', 'کرم', 'مار', 'عنکبوت',
  'فیل', 'ببر', 'خرس', 'گرگ', 'روباه', 'خرگوش', 'سنجاب', 'گربه',
  'قناری', 'عقاب', 'پلیکان', 'قو', 'اردک', 'مرغ', 'خروس', 'ماهی',
  'اسب', 'گاو', 'گوسفند', 'بز', 'خوک', 'سگ', 'موش', 'لاک‌پشت',
  'سیب', 'موز', 'پرتقال', 'نارنگی', 'لیمو', 'انار', 'هویج', 'خیار',
  'گوجه', 'پیاز', 'فلفل', 'نان', 'برنج', 'پاستا', 'سوپ', 'پیتزا',
  'چای', 'قهوه', 'شیر', 'آب‌میوه', 'قاشق', 'چنگال', 'چاقو',
  'بشقاب', 'لیوان', 'صندلی', 'میز', 'تخت', 'مبل', 'کمد', 'چراغ',
  'تلویزیون', 'رادیو', 'موبایل', 'دوربین', 'کیف', 'کفش', 'کت', 'شلوار',
  'کراوات', 'کمربند', 'ساعت', 'عینک', 'کلاه', 'دستکش', 'جوراب', 'دمپایی',
  'سبزی', 'فلفل', 'نان', 'برنج', 'پاستا', 'سوپ', 'پیتزا',
  'ماشین', 'دوچرخه', 'هواپیما', 'قطار', 'کشتی', 'اتوبوس', 'موتور', 'هلیکوپتر',
  'رستوران', 'فروشگاه', 'بیمارستان', 'مدرسه', 'مسجد', 'کتابخانه', 'سینما', 'تئاتر',
  'ورزش', 'فوتبال', 'بسکتبال', 'والیبال', 'تنیس', 'شنا', 'دو', 'کوهنوردی',
  'موسیقی', 'آهنگ', 'خواننده', 'نوازنده', 'ساز', 'پیانو', 'گیتار', 'ویولن',
  'رنگ', 'قرمز', 'آبی', 'سبز', 'زرد', 'نارنجی', 'بنفش', 'صورتی',
  'فصل', 'بهار', 'تابستان', 'پاییز', 'زمستان', 'گرما', 'سرما', 'باران',
  'شغل', 'دکتر', 'مهندس', 'معلم', 'آشپز', 'راننده', 'خلبان', 'نقاش',
  'احساس', 'خوشحالی', 'غم', 'عصبانیت', 'ترس', 'تعجب', 'عشق', 'دوستی',
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

// Map to hold server-side game timer handles (roomCode -> timeoutId)
const gameTimers = new Map();

io.on('connection', (socket) => {
  socket.on('create-room', ({ playerName, uuid, settings }) => {
    if (rooms.size >= 100) {
      socket.emit('error', { message: 'سرور پر است. لطفاً بعداً دوباره امتحان کنید.' });
      return;
    }

    const roomCode = generateRoomCode();
    const playerId = socket.id;

    const roomSettings = {
      isPublic: settings?.isPublic === true,
      password: settings?.password ? String(settings.password).slice(0, 32) : null,
      maxPlayers: Math.min(Math.max(parseInt(settings?.maxPlayers) || 24, 3), 50),
      showWordLength: settings?.showWordLength !== false,
      questionsPerPlayer: Math.min(Math.max(parseInt(settings?.questionsPerPlayer) || 20, 1), 50),
    };

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
      alphaTimerStartTime: null,
      questions: [],
      ...roomSettings,
    });
    
    players.set(playerId, {
      id: playerId,
      name: playerName,
      roomCode: roomCode,
      role: null,
      isShahrdar: false,
      questionsAsked: 0,
      uuid: uuid || null,
      connected: true,
      wins: 0
    });
    
    socket.join(roomCode);
    socket.emit('room-created', { roomCode, playerId });

    // Send initial room state to the creator after socket join completes
    setTimeout(() => {
      updateRoomPlayers(roomCode);
    }, 50);
  });

  socket.on('join-room', ({ roomCode, playerName, uuid, password }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'اتاق یافت نشد' });
      return;
    }

    if (room.gameState === 'playing') {
      socket.emit('error', { message: 'بازی در حال انجام است' });
      return;
    }

    // Password check
    if (room.password && room.password !== password) {
      socket.emit('error', { message: 'رمز اتاق اشتباه است' });
      return;
    }

    // Check max players (exclude the UUID owner rejoining, they don't count as new)
    const existingByUuid = uuid ? Array.from(players.values()).find(p => p.roomCode === roomCode && p.uuid === uuid) : null;
    if (!existingByUuid) {
      const currentCount = Array.from(players.values()).filter(p => p.roomCode === roomCode).length;
      if (currentCount >= room.maxPlayers) {
        socket.emit('error', { message: `اتاق پر است (حداکثر ${room.maxPlayers} بازیکن)` });
        return;
      }
    }

    const playerId = socket.id;
    // Try to find existing by uuid in this room
    let existing = existingByUuid || null;
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
        connected: true,
        wins: 0
      });
    }

    socket.join(roomCode);
    socket.emit('room-joined', { roomCode, playerId });

    // Send initial room state to the joining player after socket join completes
    setTimeout(() => {
      updateRoomPlayers(roomCode);
    }, 50);
  });

  // List public rooms
  socket.on('get-public-rooms', () => {
    const publicRooms = Array.from(rooms.values())
      .filter(r => r.isPublic && r.gameState === 'waiting')
      .map(r => {
        const host = players.get(r.creatorId);
        return {
          code: r.code,
          playerCount: Array.from(players.values()).filter(p => p.roomCode === r.code && p.connected).length,
          maxPlayers: r.maxPlayers,
          hasPassword: !!r.password,
          hostName: host ? host.name : '—',
        };
      });
    socket.emit('public-rooms', { rooms: publicRooms });
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

    const isPlaying = room.gameState === 'playing';

    // Send a single room-joined with the correct game state
    socket.emit('room-joined', {
      roomCode,
      playerId: existing.id,
      gameState: room.gameState,
      isPlaying,
    });

    if (isPlaying && room.secretWord) {
      // ── Active game: restore full game state ──
      // Delay all game-state events so the client has time to mount GameRoom
      // after receiving room-joined (room-joined and game-started may arrive in the
      // same TCP packet otherwise, causing game-started to fire before GameRoom mounts).
      setTimeout(() => {
        const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
        const elapsedMain = room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : 0;
        const remainingMain = Math.max(0, 600 - elapsedMain);

        const isWerewolf = existing.role === 'werewolf' || existing.role === 'alpha-werewolf';
        const visiblePlayers = roomPlayers.map(p => {
          const showRole = p.id === existing.id ||
                          (isWerewolf && (p.role === 'werewolf' || p.role === 'alpha-werewolf'));
          return { id: p.id, name: p.name, role: showRole ? p.role : null, isShahrdar: p.isShahrdar };
        });

        socket.emit('game-started', {
          players: visiblePlayers,
          wordLength: room.showWordLength ? room.secretWord.length : 0,
          remainingTime: remainingMain,
        });

        const shouldSeeWord = existing.role === 'seer' ||
                             existing.role === 'werewolf' ||
                             existing.role === 'alpha-werewolf' ||
                             existing.isShahrdar;
        if (shouldSeeWord) {
          setTimeout(() => {
            socket.emit('secret-word-revealed', { secretWord: room.secretWord, role: existing.role });
          }, 100);
        }

        if (room.wordGuessed && room.alphaTimerStartTime) {
          const elapsed = Math.floor((Date.now() - room.alphaTimerStartTime) / 1000);
          const remaining = Math.max(0, 60 - elapsed);
          socket.emit('word-guessed', { guesserName: '', secretWord: room.secretWord });
          setTimeout(() => {
            socket.emit('alpha-timer-update', { remaining });
          }, 150);
        }

        socket.emit('questions-sync', { questions: room.questions || [] });

        if (existing.role === 'werewolf' || existing.role === 'alpha-werewolf') {
          const werewolves = roomPlayers.filter(p => p.role === 'werewolf' || p.role === 'alpha-werewolf');
          const teammates = werewolves.filter(w => w.id !== existing.id);
          socket.emit('werewolf-teammates', { teammates: teammates.map(t => ({ id: t.id, name: t.name })) });
        }

        updateRoomPlayers(roomCode);
      }, 200);

    } else {
      // ── Waiting room (before or after game) ──

      // If a game result exists, delay sending it so the client can fully mount after room-joined
      if (existing.lastGameResult) {
        setTimeout(() => {
          socket.emit('game-ended', existing.lastGameResult);
        }, 250);
      }

      setTimeout(() => { updateRoomPlayers(roomCode); }, 50);
    }
  });

  socket.on('update-name', ({ name }) => {
    const player = players.get(socket.id);
    if (!player || !name || !name.trim()) return;
    player.name = name.trim();
    if (player.roomCode) updateRoomPlayers(player.roomCode);
  });

  socket.on('start-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    // Guard: prevent double-starting a game already in progress
    if (room.gameState === 'playing') return;

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
    room.questions = [];
    room.startTime = Date.now();
    room.votes = {};

    // Server-side 10-minute game timer – ends game if no one finishes it first
    if (gameTimers.has(roomCode)) clearTimeout(gameTimers.get(roomCode));
    gameTimers.set(roomCode, setTimeout(() => {
      const r = rooms.get(roomCode);
      if (r && r.gameState === 'playing') {
        const rPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
        endGame(roomCode, {
          winner: 'werewolves',
          reason: 'زمان بازی تمام شد',
          roles: rPlayers.map(p => ({ name: p.name, role: p.role, isShahrdar: p.isShahrdar })),
          secretWord: r.secretWord,
        });
      }
    }, 600 * 1000));

    // Refresh roomPlayers after roles are assigned to ensure we have latest data
    const updatedRoomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);

    const werewolves = updatedRoomPlayers.filter(p => p.role === 'werewolf' || p.role === 'alpha-werewolf');

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
        const showRole = p.id === player.id ||
                        (isWerewolf && (p.role === 'werewolf' || p.role === 'alpha-werewolf'));
        return { id: p.id, name: p.name, role: showRole ? p.role : null, isShahrdar: p.isShahrdar };
      });

      io.to(player.id).emit('game-started', {
        players: visiblePlayers,
        wordLength: room.showWordLength ? room.secretWord.length : 0,
      });

      const shouldSeeWord = player.role === 'seer' ||
                           player.role === 'werewolf' ||
                           player.role === 'alpha-werewolf' ||
                           player.isShahrdar;
      if (shouldSeeWord) {
        setTimeout(() => {
          io.to(player.id).emit('secret-word-revealed', { secretWord: room.secretWord, role: player.role });
        }, 100);
      }

      io.to(player.id).emit('questions-sync', { questions: [] });
    });
  });

  socket.on('ask-question', ({ roomCode, question }) => {
    const player = players.get(socket.id);
    const room = rooms.get(roomCode);
    if (!player || !room || room.gameState !== 'playing') return;

    const limit = room.questionsPerPlayer || 20;
    if (player.questionsAsked >= limit) {
      socket.emit('error', { message: 'شما نمی‌توانید سوال بیشتری بپرسید' });
      return;
    }

    // Prevent guessing if word already guessed
    if (room.wordGuessed) return;

    const isCorrect = normalizePersian(question) === normalizePersian(room.secretWord);

    if (isCorrect) {
      // Correct guess
      const guessedMsg = { playerName: player.name, question: `کلمه را پیدا کرد: ${question} ✅`, reaction: null, isGuess: true };
      room.questions = [guessedMsg, ...(room.questions || [])];
      io.to(roomCode).emit('question-asked', {
        playerName: player.name,
        question: guessedMsg.question,
        questionsLeft: 0,
        isGuess: true
      });

      io.to(roomCode).emit('word-guessed', {
        guesserName: player.name,
        secretWord: room.secretWord
      });

      // Mark word as guessed and start alpha timer (game stays 'playing' until alpha acts)
      room.wordGuessed = true;
      room.alphaTimerStartTime = Date.now();

      // Cancel main game server timer – alpha timer is now in charge
      if (gameTimers.has(roomCode)) {
        clearTimeout(gameTimers.get(roomCode));
        gameTimers.delete(roomCode);
      }

      // Send timer update to all werewolves
      const werewolves = Array.from(players.values()).filter(p =>
        p.roomCode === roomCode && (p.role === 'alpha-werewolf' || p.role === 'werewolf')
      );
      werewolves.forEach(werewolf => {
        io.to(werewolf.id).emit('alpha-timer-update', { remaining: 60 });
        if (werewolf.role === 'alpha-werewolf') {
          io.to(werewolf.id).emit('alpha-last-chance-opportunity', {
            message: 'شما یک فرصت آخر برای پیدا کردن غیب‌گو دارید!'
          });
        }
      });
    } else {
      player.questionsAsked++;
      const qMsg = { playerName: player.name, question: `پرسید: ${question}`, reaction: null, isGuess: false };
      room.questions = [qMsg, ...(room.questions || [])];
      io.to(roomCode).emit('question-asked', {
        playerName: player.name,
        question: qMsg.question,
        questionsLeft: limit - player.questionsAsked,
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
    
    // Update stored question reaction if available
    if (room && room.questions && room.questions[questionIndex]) {
      room.questions[questionIndex] = {
        ...room.questions[questionIndex],
        reaction: emoji || null
      };
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

    if (!player || !room || room.gameState !== 'playing') return;
    if (room.wordGuessed) return;

    if (normalizePersian(guess) === normalizePersian(room.secretWord)) {
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

      // Mark word as guessed (game still 'playing' until alpha acts)
      room.wordGuessed = true;
      room.alphaTimerStartTime = Date.now();

      // Cancel main game timer
      if (gameTimers.has(roomCode)) {
        clearTimeout(gameTimers.get(roomCode));
        gameTimers.delete(roomCode);
      }

      const werewolves = Array.from(players.values()).filter(p =>
        p.roomCode === roomCode && (p.role === 'alpha-werewolf' || p.role === 'werewolf')
      );
      werewolves.forEach(werewolf => {
        io.to(werewolf.id).emit('alpha-timer-update', { remaining: 60 });
        if (werewolf.role === 'alpha-werewolf') {
          io.to(werewolf.id).emit('alpha-last-chance-opportunity', {
            message: 'شما یک فرصت آخر برای پیدا کردن غیب‌گو دارید!'
          });
        }
      });
    } else {
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
          // Any werewolf killed - citizens win immediately
          const roomPlayersFull = Array.from(players.values()).filter(p => p.roomCode === roomCode);
          endGame(roomCode, {
            winner: 'citizens',
            reason: 'گرگینه کشته شد',
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
    
    // Cancel any running server timer
    if (gameTimers.has(roomCode)) {
      clearTimeout(gameTimers.get(roomCode));
      gameTimers.delete(roomCode);
    }

    // Reset game state
    room.gameState = 'waiting';
    room.secretWord = null;
    room.votes = {};
    room.wordGuessed = false;
    room.alphaTimerStartTime = null;
    room.startTime = null;
    room.questions = [];
    
    // Reset all players
    const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);
    roomPlayers.forEach(p => {
      p.role = null;
      p.isShahrdar = false;
      p.questionsAsked = 0;
      p.lastGameResult = null; // Clear game result
    });
    
    // Notify all clients to clear game result and navigate back to waiting room
    io.to(roomCode).emit('game-reset');
    io.to(roomCode).emit('navigate-to-waiting-room');
    
    // Update room players after a small delay to ensure all clients are ready
    setTimeout(() => {
      updateRoomPlayers(roomCode);
    }, 100);
  });

  socket.on('kick-player', ({ roomCode, targetPlayerId }) => {
    const room = rooms.get(roomCode);
    const player = players.get(socket.id);
    
    if (!room || !player) return;
    
    // Only room creator can kick players (check by UUID or socket.id)
    const isCreator = room.creatorId === socket.id || (player.uuid && room.creatorUUID === player.uuid);
    if (!isCreator) {
      socket.emit('error', { message: 'فقط سازنده اتاق می‌تواند بازیکنان را اخراج کند' });
      return;
    }
    
    // Don't allow kicking the creator
    if (targetPlayerId === room.creatorId) {
      socket.emit('error', { message: 'نمی‌توانید خودتان را اخراج کنید' });
      return;
    }
    
    const targetPlayer = players.get(targetPlayerId);
    if (!targetPlayer || targetPlayer.roomCode !== roomCode) {
      socket.emit('error', { message: 'بازیکن یافت نشد' });
      return;
    }
    
    // Notify the kicked player
    io.to(targetPlayerId).emit('player-kicked', { message: 'شما از اتاق اخراج شدید' });
    
    // Remove the player from the socket room
    const targetSocket = io.sockets.sockets.get(targetPlayerId);
    if (targetSocket) {
      targetSocket.leave(roomCode);
    }
    
    // Remove the player
    players.delete(targetPlayerId);
    
    // Update room players
    updateRoomPlayers(roomCode);
  });

  socket.on('leave-room', () => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const room = rooms.get(player.roomCode);
    if (!room) return;
    
    // If creator leaves, close the room
    if (room.creatorId === socket.id) {
      // Cancel any running game timer
      if (gameTimers.has(player.roomCode)) {
        clearTimeout(gameTimers.get(player.roomCode));
        gameTimers.delete(player.roomCode);
      }
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
      // Do not broadcast immediately on disconnect to prevent spam during refresh
      // Actual roster updates will occur on leave-room or after restart-game
    }
  });
});

// Helper function to emit game-ended and store result for players
function endGame(roomCode, gameResult) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Guard: don't end a game that already ended (prevents double endGame calls)
  if (room.gameState !== 'playing') return;

  // Cancel server-side game timer if running
  if (gameTimers.has(roomCode)) {
    clearTimeout(gameTimers.get(roomCode));
    gameTimers.delete(roomCode);
  }

  room.gameState = 'waiting';
  room.startTime = null;
  room.wordGuessed = false;
  room.alphaTimerStartTime = null;

  const roomPlayers = Array.from(players.values()).filter(p => p.roomCode === roomCode);

  const isWerewolfWin = gameResult.winner === 'werewolves';

  roomPlayers.forEach(p => {
    const isWinner = isWerewolfWin
      ? (p.role === 'werewolf' || p.role === 'alpha-werewolf')
      : (p.role !== 'werewolf' && p.role !== 'alpha-werewolf');
    if (isWinner) p.wins = (p.wins || 0) + 1;
  });

  const rolesWithWins = roomPlayers.map(p => {
    const isWinner = isWerewolfWin
      ? (p.role === 'werewolf' || p.role === 'alpha-werewolf')
      : (p.role !== 'werewolf' && p.role !== 'alpha-werewolf');
    return { name: p.name, role: p.role, isShahrdar: p.isShahrdar, wins: p.wins || 0, isWinner };
  });

  gameResult.roles = rolesWithWins;

  // Store game result per player for session resume
  roomPlayers.forEach(p => { p.lastGameResult = gameResult; });

  io.to(roomCode).emit('game-ended', gameResult);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomCode;
  let attempts = 0;
  do {
    roomCode = '';
    for (let i = 0; i < 5; i++) {
      roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (rooms.has(roomCode) && attempts < 1000);
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
          (isWerewolf && (p.role === 'werewolf' || p.role === 'alpha-werewolf')) // Werewolves see werewolves
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
      creatorId: room.creatorId,
      settings: {
        showWordLength: room.showWordLength !== false,
        questionsPerPlayer: room.questionsPerPlayer || 20,
        maxPlayers: room.maxPlayers || 24,
        isPublic: room.isPublic || false,
        hasPassword: !!room.password,
      },
    });
  });
}

// Cleanup old rooms (older than 4 hours)
function cleanupOldRooms() {
  const now = Date.now();
  const fourHoursAgo = now - (4 * 60 * 60 * 1000);
  
  for (const [roomCode, room] of rooms.entries()) {
    if (room.createdAt < fourHoursAgo) {
      // Cancel any running game timer
      if (gameTimers.has(roomCode)) {
        clearTimeout(gameTimers.get(roomCode));
        gameTimers.delete(roomCode);
      }
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
