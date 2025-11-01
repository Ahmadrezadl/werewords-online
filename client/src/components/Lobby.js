import React, { useState, useEffect } from 'react';
import GameInfoModal from './GameInfoModal';

function Lobby({ socket, playerName, setPlayerName, playerUUID }) {
  const [roomCode, setRoomCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setShowJoin(true);
    }
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('لطفاً نام خود را وارد کنید');
      return;
    }
    const uuid = playerUUID || localStorage.getItem('playerUUID');
    socket.emit('create-room', { playerName, uuid });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('لطفاً نام خود را وارد کنید');
      return;
    }
    if (!roomCode.trim()) {
      alert('لطفاً کد اتاق را وارد کنید');
      return;
    }
    const uuid = playerUUID || localStorage.getItem('playerUUID');
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName, uuid });
  };

  return (
    <div className="App">
      <div className="card">
        <h1>🐺 گرگینه کلمات 🐺</h1>

        <div className="input-group">
          <input
            type="text"
            placeholder="نام شما"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>

        {!showJoin ? (
          <>
            <button className="btn" onClick={handleCreateRoom}>
              ایجاد اتاق
            </button>
            <button
              className="btn"
              onClick={() => setShowJoin(true)}
              style={{ background: '#666' }}
            >
              پیوستن به اتاق
            </button>
          </>
        ) : (
          <>
            <div className="input-group">
              <input
                type="text"
                placeholder="کد اتاق"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength="6"
              />
            </div>
            <button className="btn" onClick={handleJoinRoom}>
              پیوستن
            </button>
            <button
              className="btn"
              onClick={() => setShowJoin(false)}
              style={{ background: '#666' }}
            >
              بازگشت
            </button>
          </>
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

export default Lobby;
