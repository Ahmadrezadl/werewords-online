import React, { useState, useEffect, useRef } from 'react';
import GameInfoModal from './GameInfoModal';

/* ─── Inline styles shared across views ─── */
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    direction: 'rtl',
    fontFamily: 'inherit',
  },
  topBar: {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    height: '54px',
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 100,
  },
  nameArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '55%',
  },
  nameText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: '15px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '160px',
  },
  nameInput: {
    background: 'rgba(255,255,255,0.15)',
    border: '1.5px solid rgba(255,255,255,0.4)',
    borderRadius: '8px',
    color: '#fff',
    padding: '5px 10px',
    fontSize: '14px',
    width: '160px',
    outline: 'none',
    direction: 'rtl',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '6px',
    fontSize: '16px',
    lineHeight: 1,
    color: 'rgba(255,255,255,0.7)',
    transition: 'background 0.15s',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '70px 16px 90px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '520px',
    margin: '0 auto',
    width: '100%',
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    marginBottom: '6px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    direction: 'rtl',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btn: (color) => ({
    width: '100%',
    padding: '13px',
    borderRadius: '10px',
    border: 'none',
    background: color || 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s, transform 0.15s',
    direction: 'rtl',
  }),
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    right: 0,
    left: 0,
    height: '64px',
    background: 'rgba(15,20,40,0.95)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 100,
  },
  navBtn: (active) => ({
    flex: 1,
    background: 'none',
    border: 'none',
    color: active ? '#a78bfa' : 'rgba(255,255,255,0.45)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    fontSize: '11px',
    fontWeight: active ? '700' : '400',
    borderTop: active ? '2px solid #a78bfa' : '2px solid transparent',
    transition: 'color 0.2s',
    padding: '6px 0',
  }),
  navIcon: { fontSize: '22px', lineHeight: 1 },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  sectionSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '13px',
    marginBottom: '16px',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 0',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  settingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
  },
  toggle: (on) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: on ? '#a78bfa' : 'rgba(255,255,255,0.2)',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
  }),
  toggleThumb: (on) => ({
    position: 'absolute',
    top: '3px',
    right: on ? '3px' : '19px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'right 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  }),
  numInput: {
    width: '72px',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1.5px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '14px',
    textAlign: 'center',
    outline: 'none',
  },
  roomCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '8px',
  },
};

function Toggle({ on, onToggle }) {
  return (
    <button style={S.toggle(on)} onClick={onToggle} aria-label="toggle">
      <div style={S.toggleThumb(on)} />
    </button>
  );
}

function NumInput({ value, onChange, min, max }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={S.numInput}
    />
  );
}

/* ─── Main component ─── */
function Lobby({ socket, playerName, setPlayerName, playerUUID }) {
  const [tab, setTab] = useState('public'); // 'public' | 'join' | 'create'
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const nameInputRef = useRef(null);

  const [roomCode, setRoomCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [settings, setSettings] = useState({
    isPublic: false,
    password: '',
    maxPlayers: 24,
    showWordLength: true,
    questionsPerPlayer: 20,
  });

  // Auto-fill code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setTab('join');
    }
  }, []);

  // Fetch public rooms when tab switches to 'public'
  useEffect(() => {
    if (tab === 'public' && socket) {
      setLoadingRooms(true);
      socket.emit('get-public-rooms');
    }
  }, [tab, socket]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ rooms }) => {
      setPublicRooms(rooms);
      setLoadingRooms(false);
    };
    socket.on('public-rooms', handler);
    return () => socket.off('public-rooms', handler);
  }, [socket]);

  // Focus name input when editing starts
  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  const commitName = () => {
    const n = tempName.trim();
    if (n) {
      setPlayerName(n);
      localStorage.setItem('playerName', n);
    }
    setEditingName(false);
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) { alert('لطفاً نام خود را وارد کنید'); return; }
    const uuid = playerUUID || localStorage.getItem('playerUUID');
    socket.emit('create-room', {
      playerName,
      uuid,
      settings: {
        isPublic: settings.isPublic,
        password: settings.password || null,
        maxPlayers: parseInt(settings.maxPlayers) || 24,
        showWordLength: settings.showWordLength,
        questionsPerPlayer: parseInt(settings.questionsPerPlayer) || 20,
      },
    });
  };

  const handleJoinRoom = (code, pwd) => {
    if (!playerName.trim()) { alert('لطفاً نام خود را وارد کنید'); return; }
    const target = (code || roomCode).trim().toUpperCase();
    if (!target) { alert('لطفاً کد اتاق را وارد کنید'); return; }
    const uuid = playerUUID || localStorage.getItem('playerUUID');
    socket.emit('join-room', { roomCode: target, playerName, uuid, password: pwd ?? joinPassword ?? undefined });
  };

  const handleJoinPublic = (room) => {
    if (room.hasPassword) {
      const pwd = prompt('رمز اتاق را وارد کنید:');
      if (pwd !== null) handleJoinRoom(room.code, pwd);
    } else {
      handleJoinRoom(room.code, '');
    }
  };

  /* ── Render ── */
  return (
    <div style={S.page}>

      {/* ── Top bar: player name ── */}
      <div style={S.topBar}>
        <div style={S.nameArea}>
          {editingName ? (
            <>
              <input
                ref={nameInputRef}
                style={S.nameInput}
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
                maxLength={24}
              />
              <button style={S.iconBtn} onClick={commitName} title="ذخیره">✓</button>
              <button style={S.iconBtn} onClick={() => setEditingName(false)} title="لغو">✕</button>
            </>
          ) : (
            <>
              <span style={S.nameText}>{playerName}</span>
              <button
                style={S.iconBtn}
                onClick={() => { setTempName(playerName); setEditingName(true); }}
                title="ویرایش نام"
              >✏️</button>
            </>
          )}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '20px', letterSpacing: '2px' }}>🐺</div>
        <button
          onClick={() => setShowInfo(true)}
          style={{ ...S.iconBtn, fontSize: '20px' }}
          title="راهنما"
        >ℹ️</button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={S.scrollArea}>

        {/* ════ PUBLIC ROOMS TAB ════ */}
        {tab === 'public' && (
          <>
            <div>
              <div style={S.sectionTitle}>اتاق‌های باز</div>
              <div style={S.sectionSub}>اتاق‌های عمومی در انتظار بازیکن</div>
            </div>

            <button
              style={{ ...S.btn('#334155'), width: 'auto', padding: '8px 16px', marginTop: 0 }}
              onClick={() => { setLoadingRooms(true); socket.emit('get-public-rooms'); }}
            >🔄 بروزرسانی</button>

            {loadingRooms && (
              <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>در حال بارگذاری...</div>
            )}

            {!loadingRooms && publicRooms.length === 0 && (
              <div style={{ ...S.card, textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '30px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏜️</div>
                هیچ اتاق عمومی در دسترس نیست
              </div>
            )}

            {publicRooms.map(room => (
              <div key={room.code} style={S.roomCard}>
                <button
                  onClick={() => handleJoinPublic(room)}
                  style={{ ...S.btn('#4f46e5'), width: 'auto', padding: '8px 18px', marginTop: 0, fontSize: '13px' }}
                >ورود</button>
                <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                  <div style={{ color: '#a78bfa', fontWeight: '700', fontSize: '18px', letterSpacing: '3px' }}>{room.code}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '2px' }}>
                    {room.hostName}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '1px' }}>
                    {room.hasPassword ? '🔒 ' : '🔓 '}{room.playerCount}/{room.maxPlayers} نفر
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ════ JOIN WITH CODE TAB ════ */}
        {tab === 'join' && (
          <>
            <div>
              <div style={S.sectionTitle}>ورود با کد</div>
              <div style={S.sectionSub}>کد اتاق را از دوستت بگیر</div>
            </div>

            <div style={S.card}>
              <label style={S.label}>کد اتاق</label>
              <input
                style={{ ...S.input, letterSpacing: '4px', textAlign: 'center', fontSize: '20px', fontWeight: '700' }}
                placeholder="XXXXX"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                maxLength={10}
                autoCapitalize="characters"
              />

              <label style={{ ...S.label, marginTop: '14px' }}>رمز اتاق (اگر دارد)</label>
              <input
                style={S.input}
                placeholder="بدون رمز"
                value={joinPassword}
                onChange={e => setJoinPassword(e.target.value)}
              />

              <button style={S.btn()} onClick={() => handleJoinRoom()}>
                ورود به اتاق
              </button>
            </div>
          </>
        )}

        {/* ════ CREATE ROOM TAB ════ */}
        {tab === 'create' && (
          <>
            <div>
              <div style={S.sectionTitle}>ایجاد اتاق</div>
              <div style={S.sectionSub}>اتاقت را بساز و دوستانت را دعوت کن</div>
            </div>

            <div style={S.card}>
              <h3 style={{ color: '#e2e8f0', margin: '0 0 14px 0', fontSize: '15px' }}>تنظیمات اتاق</h3>

              {/* Public toggle */}
              <div style={S.settingRow}>
                <span style={S.settingLabel}>اتاق عمومی</span>
                <Toggle
                  on={settings.isPublic}
                  onToggle={() => setSettings(s => ({ ...s, isPublic: !s.isPublic }))}
                />
              </div>

              {/* Password */}
              <div style={{ ...S.settingRow, flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                <span style={S.settingLabel}>رمز اتاق <span style={{ opacity: 0.5 }}>(اختیاری)</span></span>
                <input
                  style={{ ...S.input, padding: '9px 12px', fontSize: '14px' }}
                  placeholder="بدون رمز"
                  value={settings.password}
                  onChange={e => setSettings(s => ({ ...s, password: e.target.value }))}
                  maxLength={32}
                />
              </div>

              {/* Max players */}
              <div style={S.settingRow}>
                <span style={S.settingLabel}>حداکثر بازیکنان</span>
                <NumInput
                  value={settings.maxPlayers}
                  onChange={v => setSettings(s => ({ ...s, maxPlayers: v }))}
                  min={3}
                  max={50}
                />
              </div>

              {/* Show word length */}
              <div style={S.settingRow}>
                <span style={S.settingLabel}>نمایش تعداد حروف کلمه</span>
                <Toggle
                  on={settings.showWordLength}
                  onToggle={() => setSettings(s => ({ ...s, showWordLength: !s.showWordLength }))}
                />
              </div>

              {/* Questions per player */}
              <div style={{ ...S.settingRow, borderBottom: 'none' }}>
                <span style={S.settingLabel}>سوال هر بازیکن</span>
                <NumInput
                  value={settings.questionsPerPlayer}
                  onChange={v => setSettings(s => ({ ...s, questionsPerPlayer: v }))}
                  min={1}
                  max={50}
                />
              </div>

              <button style={S.btn('linear-gradient(135deg,#6366f1,#8b5cf6)')} onClick={handleCreateRoom}>
                ساختن اتاق
              </button>
            </div>
          </>
        )}

      </div>

      {/* ── Bottom navigation ── */}
      <nav style={S.bottomNav}>
        <button style={S.navBtn(tab === 'public')} onClick={() => setTab('public')}>
          <span style={S.navIcon}>🌐</span>
          اتاق‌های باز
        </button>
        <button style={S.navBtn(tab === 'join')} onClick={() => setTab('join')}>
          <span style={S.navIcon}>🔑</span>
          ورود با کد
        </button>
        <button style={S.navBtn(tab === 'create')} onClick={() => setTab('create')}>
          <span style={S.navIcon}>➕</span>
          ایجاد اتاق
        </button>
      </nav>

      <GameInfoModal showInfo={showInfo} setShowInfo={setShowInfo} />
    </div>
  );
}

export default Lobby;
