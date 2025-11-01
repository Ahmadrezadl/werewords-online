import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

function App() {
  const [socket, setSocket] = useState(null);
  const [currentView, setCurrentView] = useState('lobby');
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState(
    localStorage.getItem('playerName') || ''
  );
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

    newSocket.on('room-joined', ({ roomCode, playerId }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      setCurrentView('waiting-room');
      localStorage.setItem('lastRoomCode', roomCode);
    });

    newSocket.on('game-started', () => {
      setCurrentView('game');
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

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

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
        isPlaying={true}
        setCurrentView={setCurrentView}
      />
    );
  }

  return null;
}

export default App;
