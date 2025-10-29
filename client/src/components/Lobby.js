import React, { useState, useEffect } from 'react';

function Lobby({ socket, playerName, setPlayerName, playerUUID }) {
  const [roomCode, setRoomCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

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
    </div>
  );
}

export default Lobby;
