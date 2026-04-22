import React from 'react';

const C = {
  bg: '#0f1629',
  surface: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  text: '#f1f5f9',
  textSub: 'rgba(255,255,255,0.60)',
  accent: '#a78bfa',
  green: '#34d399',
  red: '#f87171',
  orange: '#fb923c',
  yellow: '#fbbf24',
  blue: '#60a5fa',
};

function Section({ emoji, title, color, children }) {
  return (
    <section style={{
      marginBottom: '18px',
      padding: '16px',
      background: `${color}14`,
      borderRadius: '12px',
      border: `1px solid ${color}30`,
    }}>
      <h3 style={{ color, marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>
        {emoji} {title}
      </h3>
      {children}
    </section>
  );
}

function RoleCard({ emoji, title, desc, color }) {
  return (
    <div style={{
      marginBottom: '8px', padding: '12px',
      background: `${color}12`,
      borderRadius: '10px',
      border: `1px solid ${color}30`,
    }}>
      <div style={{ fontWeight: '700', color, marginBottom: '4px' }}>{emoji} {title}</div>
      <div style={{ fontSize: '13px', color: C.textSub, lineHeight: '1.6' }}>{desc}</div>
    </div>
  );
}

function GameInfoModal({ showInfo, setShowInfo }) {
  if (!showInfo) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '16px',
      }}
      onClick={() => setShowInfo(false)}
    >
      <div
        style={{
          background: C.bg,
          borderRadius: '20px',
          padding: '24px 20px',
          maxWidth: '640px', width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          border: C.border,
          direction: 'rtl',
          color: C.text,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setShowInfo(false)}
          style={{
            position: 'absolute', top: '14px', left: '14px',
            background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: '50%', width: '32px', height: '32px',
            color: C.red, fontSize: '16px', cursor: 'pointer', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: C.accent, fontSize: '18px' }}>
          📖 راهنمای گرگینه کلمات 🐺
        </h2>

        {/* Goal */}
        <Section emoji="🎯" title="هدف بازی" color={C.accent}>
          <p style={{ color: C.textSub, lineHeight: '1.7', margin: 0 }}>
            یک کلمه مخفی وجود دارد. شهروندان باید آن را پیدا کنند — اما گرگینه‌ها مانعشان می‌شوند!
          </p>
        </Section>

        {/* Roles */}
        <Section emoji="👥" title="نقش‌ها" color={C.orange}>
          <RoleCard emoji="🌙" title="آلفا گرگینه" color={C.red}
            desc="کلمه را می‌داند و گرگینه‌های تیمش را می‌شناسد. هدفش پیدا کردن غیب‌گو و کشتن اوست." />
          <RoleCard emoji="🐺" title="گرگینه" color={C.orange}
            desc="کلمه را می‌داند و تیم گرگینه‌ها را می‌بیند. می‌تواند با سوال‌هایش شهروندان را گمراه کند." />
          <RoleCard emoji="🔮" title="غیب‌گو" color={C.green}
            desc="کلمه را می‌داند اما باید خود را مخفی نگه دارد — آلفا دنبالش می‌گردد!" />
          <RoleCard emoji="🏘️" title="شهروند" color={C.blue}
            desc="کلمه را نمی‌داند. باید با سوال‌های هوشمندانه آن را پیدا کند." />
          <RoleCard emoji="🏛️" title="شهردار (اضافه)" color={C.yellow}
            desc="این نقش به یک بازیکن تصادفی اضافه می‌شود. شهردار با ایموجی به سوالات پاسخ می‌دهد." />
        </Section>

        {/* Rules */}
        <Section emoji="🎮" title="قوانین" color={C.green}>
          <ul style={{ margin: 0, paddingRight: '18px', color: C.textSub, lineHeight: '2', fontSize: '14px' }}>
            <li>⏱️ هر بازی ۱۰ دقیقه است — هر بازیکن می‌تواند سوال بپرسد</li>
            <li>👑 شهردار با ایموجی پاسخ می‌دهد (👍 👎 ❓)</li>
            <li>🎯 اگر کلمه پیدا شود، آلفا ۶۰ ثانیه فرصت دارد</li>
            <li>🔪 آلفا باید غیب‌گو را پیدا کند — وگرنه شهروندان برنده‌اند</li>
            <li>⏰ بعد از ۲ دقیقه، رای‌گیری برای اعدام گرگینه باز می‌شود</li>
          </ul>
        </Section>

        {/* Win conditions */}
        <Section emoji="🏆" title="شرط پیروزی" color={C.yellow}>
          <div style={{ marginBottom: '10px', padding: '12px', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.25)' }}>
            <div style={{ fontWeight: '700', color: C.red, marginBottom: '6px' }}>🐺 گرگینه‌ها برنده می‌شوند اگر:</div>
            <ul style={{ margin: 0, paddingRight: '16px', color: C.textSub, fontSize: '13px', lineHeight: '1.8' }}>
              <li>غیب‌گو کشته شود</li>
              <li>یک شهروند توسط مردم اعدام شود</li>
              <li>وقت شهروندان برای پیدا کردن کلمه تمام شود</li>
            </ul>
          </div>
          <div style={{ padding: '12px', background: 'rgba(52,211,153,0.1)', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.25)' }}>
            <div style={{ fontWeight: '700', color: C.green, marginBottom: '6px' }}>🏘️ شهروندان برنده می‌شوند اگر:</div>
            <ul style={{ margin: 0, paddingRight: '16px', color: C.textSub, fontSize: '13px', lineHeight: '1.8' }}>
              <li>یک گرگینه اعدام شود</li>
              <li>کلمه حدس زده شود و غیب‌گو کشته نشود</li>
              <li>آلفا غیب‌گو را اشتباه شناسایی کند</li>
            </ul>
          </div>
        </Section>

        {/* Tips */}
        <Section emoji="💡" title="نکات" color={C.blue}>
          <ul style={{ margin: 0, paddingRight: '18px', color: C.textSub, lineHeight: '2', fontSize: '14px' }}>
            <li>سوالات هوشمندانه بپرسید که جواب بله/خیر داشته باشند</li>
            <li>رفتار بازیکنان دیگر را زیر نظر بگیرید</li>
            <li>از پاسخ‌های ایموجی شهردار به خوبی استفاده کنید</li>
            <li>اگر گرگینه هستید، با سوالات گمراه‌کننده شهروندان را گول بزنید</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

export default GameInfoModal;
