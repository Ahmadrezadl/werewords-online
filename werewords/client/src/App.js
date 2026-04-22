import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

const RANDOM_ADJECTIVES = [
  'خوشحال', 'شاد', 'غمگین', 'خواب‌آلود', 'گرسنه', 'کنجکاو', 'شجاع', 'ترسو',
  'زیرک', 'مهربان', 'شیطان', 'آرام', 'پر انرژی', 'خجالتی', 'خلاق', 'باهوش',
  'تنبل', 'تیزبین', 'خندان', 'جادویی', 'رنگارنگ', 'عجیب', 'ناز', 'بامزه',
];

const RANDOM_NOUNS = [
  'بالن', 'اژدها', 'خرس', 'روباه', 'اردک', 'ببر', 'خرگوش', 'موش',
  'گرگ', 'عقاب', 'فیل', 'گربه', 'ماهی', 'پروانه', 'کوسه', 'شیر',
  'پنگوئن', 'کاکتوس', 'ستاره', 'ابر', 'آتشفشان', 'رنگین‌کمان', 'کوه', 'دریا',
];

function randomDefaultName() {
  const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
  const noun = RANDOM_NOUNS[Math.floor(Math.random() * RANDOM_NOUNS.length)];
  return `${noun} ${adj}`;
}

function App() {
  const [socket, setSocket] = useState(null);
  const [currentView, setCurrentView] = useState('lobby');
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('playerName') || randomDefaultName();
  });
  const [playerUUID, setPlayerUUID] = useState(
    localStorage.getItem('playerUUID') || ''
  );

  useEffect(() => {
    // Ensure persistent UUID
    let uuid = localStorage.getItem('playerUUID');
    if (!uuid) {
      uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('playerUUID', uuid);
    }
    setPlayerUUID(uuid);

    // In development with proxy, use relative path. In production, connect to same server
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : `http://localhost:${process.env.REACT_APP_PORT || 3005}`;
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('room-created', ({ roomCode, playerId }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      setCurrentView('waiting-room');
      localStorage.setItem('lastRoomCode', roomCode);
    });

    newSocket.on('room-joined', ({ roomCode, playerId, gameState, isPlaying }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      // If game is already playing, go to game view, otherwise waiting room
      setCurrentView(isPlaying ? 'game' : 'waiting-room');
      localStorage.setItem('lastRoomCode', roomCode);
    });

    newSocket.on('game-ended', () => {
      // Don't change view - GameRoom component will handle showing end screen
    });

    newSocket.on('navigate-to-waiting-room', () => {
      // When host restarts game, navigate all players back to waiting room
      setCurrentView('waiting-room');
    });

    newSocket.on('player-kicked', ({ message }) => {
      alert(message);
      setCurrentView('lobby');
      setRoomCode(null);
      setPlayerId(null);
      localStorage.removeItem('lastRoomCode');
    });

    newSocket.on('error', ({ message }) => {
      alert(message);
    });

    // Attempt resume on (re)connect
    newSocket.on('connect', () => {
      const savedRoom = localStorage.getItem('lastRoomCode');
      const savedName = localStorage.getItem('playerName') || playerName;
      const savedUUID = localStorage.getItem('playerUUID');
      if (savedRoom && savedUUID && savedName) {
        newSocket.emit('resume-session', { roomCode: savedRoom, playerName: savedName, uuid: savedUUID });
      }
    });

    return () => {
      newSocket.off('room-created');
      newSocket.off('room-joined');
      newSocket.off('game-ended');
      newSocket.off('navigate-to-waiting-room');
      newSocket.off('player-kicked');
      newSocket.off('error');
      newSocket.off('connect');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  // Persist the initial random name on first load
  useEffect(() => {
    if (playerName && !localStorage.getItem('playerName')) {
      localStorage.setItem('playerName', playerName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!socket) return <div>در حال اتصال...</div>;

  if (currentView === 'lobby') {
    return (
      <Lobby
        socket={socket}
        playerName={playerName}
        setPlayerName={setPlayerName}
        playerUUID={playerUUID}
      />
    );
  }

  if (currentView === 'waiting-room') {
    return (
      <GameRoom
        socket={socket}
        roomCode={roomCode}
        playerId={playerId}
        playerName={playerName}
        setPlayerName={setPlayerName}
        setCurrentView={setCurrentView}
      />
    );
  }

  if (currentView === 'game') {
    return (
      <GameRoom
        socket={socket}
        roomCode={roomCode}
        playerId={playerId}
        playerName={playerName}
        setPlayerName={setPlayerName}
        isPlaying={true}
        setCurrentView={setCurrentView}
      />
    );
  }

  return null;
}

export default App;
