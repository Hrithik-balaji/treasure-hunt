import React, { useState, useEffect } from 'react';

function pad(n) { return String(n).padStart(2, '0'); }

function getTimeLeft(target) {
  const diff = new Date(target) - new Date();
  if (diff <= 0) return { d:0, h:0, m:0, s:0, done:true };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    done: false,
  };
}

// ── Permanently set to March 16, 2026 ──
const EVENT_DATE = '2026-03-16T09:00:00';

export default function Countdown() {
  const [time, setTime] = useState(getTimeLeft(EVENT_DATE));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(EVENT_DATE)), 1000);
    return () => clearInterval(id);
  }, []);

  const s = {
    wrap:  { background:'linear-gradient(135deg,rgba(61,43,14,0.5),rgba(13,10,5,0.8))', border:'1px solid rgba(201,168,76,0.3)', padding:'50px 40px 40px', textAlign:'center', maxWidth:800, margin:'0 auto' },
    title: { fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:6, color:'#c9a84c', marginBottom:30, display:'block' },
    grid:  { display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:10 },
    item:  { display:'flex', flexDirection:'column', alignItems:'center', minWidth:90 },
    num:   { fontFamily:"'Cinzel Decorative',serif", fontSize:52, color:'#f0d080', textShadow:'0 0 30px rgba(201,168,76,0.6)', lineHeight:1 },
    label: { fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#8a6a1e', letterSpacing:4, marginTop:8 },
    sep:   { fontFamily:"'Cinzel Decorative',serif", fontSize:44, color:'#8a6a1e', alignSelf:'flex-start', paddingTop:4 },
    date:  { fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#5a4520', letterSpacing:3, marginTop:20 },
  };

  const units = [
    { val: time.d, lbl: 'DAYS' },
    { val: time.h, lbl: 'HOURS' },
    { val: time.m, lbl: 'MINUTES' },
    { val: time.s, lbl: 'SECONDS' },
  ];

  return (
    <div style={s.wrap}>
      <span style={s.title}>
        {time.done ? '⚓ THE HUNT HAS BEGUN ⚓' : '⌛ TIME REMAINING ⌛'}
      </span>
      <div style={s.grid}>
        {units.map((u, i) => (
          <React.Fragment key={u.lbl}>
            <div style={s.item}>
              <span style={s.num}>{pad(u.val)}</span>
              <span style={s.label}>{u.lbl}</span>
            </div>
            {i < units.length - 1 && <span style={s.sep}>:</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={s.date}>⚔ MARCH 16, 2026 ⚔</div>
    </div>
  );
}
