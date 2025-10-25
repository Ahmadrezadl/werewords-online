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

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('room-created', ({ roomCode, playerId }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      setCurrentView('waiting-room');
    });

    newSocket.on('room-joined', ({ roomCode, playerId }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      setCurrentView('waiting-room');
    });

    newSocket.on('game-started', () => {
      setCurrentView('game');
    });

    newSocket.on('error', ({ message }) => {
      alert(message);
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
      />
    );
  }

  return null;
}

export default App;
