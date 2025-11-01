import React, { useState, useEffect } from 'react';

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
      {showInfo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setShowInfo(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInfo(false)}
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: '#f44336',
                border: 'none',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#764ba2' }}>
              📖 راهنمای بازی گرگینه کلمات 🐺
            </h2>

            <div style={{ textAlign: 'right', lineHeight: '1.8' }}>
              <section style={{ marginBottom: '25px', padding: '15px', background: '#f3e5f5', borderRadius: '10px' }}>
                <h3 style={{ color: '#764ba2', marginBottom: '10px' }}>🎯 هدف بازی</h3>
                <p>یک کلمه مخفی وجود دارد که بازیکنان باید آن را پیدا کنند!</p>
              </section>

              <section style={{ marginBottom: '25px', padding: '15px', background: '#fff3e0', borderRadius: '10px' }}>
                <h3 style={{ color: '#f57c00', marginBottom: '15px' }}>👥 نقش‌ها</h3>
                <div style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '8px' }}>
                  <strong>🌙 آلفا گرگینه</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>کلمه را می‌داند. در پایان یکی را به عنوان غیب‌گو اعدام می‌کند.</p>
                </div>
                <div style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '8px' }}>
                  <strong>🐺 گرگینه</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>کلمه را می‌داند و تیم گرگینه‌ها را می‌بیند.</p>
                </div>
                <div style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '8px' }}>
                  <strong>🔮 غیب‌گو</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>کلمه را می‌داند. باید خود را مخفی نگه دارد!</p>
                </div>
                <div style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '8px' }}>
                  <strong>🏘️ شهروند</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>کلمه را نمی‌داند. باید سوال بپرسد و پیدا کند.</p>
                </div>
                <div style={{ padding: '10px', background: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
                  <strong>👑 شهردار</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>نام مشخص است! با ایموجی به هر سوال جواب می‌دهد.</p>
                </div>
              </section>

              <section style={{ marginBottom: '25px', padding: '15px', background: '#e8f5e9', borderRadius: '10px' }}>
                <h3 style={{ color: '#4caf50', marginBottom: '15px' }}>🎮 قوانین</h3>
                <ul style={{ margin: 0, paddingRight: '20px' }}>
                  <li style={{ marginBottom: '8px' }}>⏱️ هر بازیکن ۳ دقیقه دارد و ۱۰ سوال</li>
                  <li style={{ marginBottom: '8px' }}>❓ فقط شهروندان سوال می‌پرسند</li>
                  <li style={{ marginBottom: '8px' }}>👑 شهردار با ایموجی پاسخ می‌دهد</li>
                  <li style={{ marginBottom: '8px' }}>🎯 اگر کلمه پیدا شود، آلفا گرگینه ۶۰ ثانیه وقت دارد</li>
                  <li style={{ marginBottom: '8px' }}>🔪 آلفا باید غیب‌گو را پیدا کند</li>
                  <li style={{ marginBottom: '8px' }}>⏰ بعد از ۳ دقیقه نوبت به رای‌گیری می‌رسد</li>
                  <li>🗳️ شما نمی‌توانید به خودتان رای دهید</li>
                </ul>
              </section>

              <section style={{ marginBottom: '25px', padding: '15px', background: '#e3f2fd', borderRadius: '10px' }}>
                <h3 style={{ color: '#1976d2', marginBottom: '15px' }}>🏆 پیروزی</h3>
                <div style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #f44336' }}>
                  <strong>🐺 گرگینه‌ها برنده می‌شوند اگر:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingRight: '20px', fontSize: '14px' }}>
                    <li>غیب‌گو اعدام شود</li>
                    <li>شهروندی توسط مردم اعدام شود</li>
                  </ul>
                </div>
                <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #4caf50' }}>
                  <strong>🏘️ شهروندان برنده می‌شوند اگر:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingRight: '20px', fontSize: '14px' }}>
                    <li>همه گرگینه‌ها اعدام شوند</li>
                    <li>زمان آلفا گرگینه تمام شود</li>
                    <li>آلفا غیب‌گو را اشتباه شناسایی کند</li>
                  </ul>
                </div>
              </section>

              <section style={{ padding: '15px', background: '#fff9c4', borderRadius: '10px' }}>
                <h3 style={{ color: '#f57f17', marginBottom: '10px' }}>💡 نکات</h3>
                <ul style={{ margin: 0, paddingRight: '20px', fontSize: '14px' }}>
                  <li>🤔 سوالات هوشمندانه بپرسید!</li>
                  <li>👀 رفتار دیگر بازیکنان را زیر نظر بگیرید</li>
                  <li>👑 شهردار معلوم است، از پاسخ‌هایش استفاده کنید</li>
                  <li>🐺 اگر گرگینه هستید، خود را مخفی نگه دارید</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
