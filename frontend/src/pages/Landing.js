// pages/Landing.js — TTH 2026 style (from Colab notebook)
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Countdown from '../components/Countdown';
import '../styles/global.css';

const s = {
  hero: { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'120px 40px 80px', position:'relative' },
  ring: { width:180, height:180, border:'2px solid #c9a84c', borderRadius:'50%', position:'relative', margin:'0 auto 40px', boxShadow:'0 0 40px rgba(201,168,76,0.3)', animation:'rotateSlow 20s linear infinite', flexShrink:0 },
  inner: { position:'absolute', inset:8, border:'1px solid rgba(201,168,76,0.4)', borderRadius:'50%' },
  center: { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:36, animation:'pulse 2s ease-in-out infinite' },
  tag: { fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:'#c9a84c', letterSpacing:6, textTransform:'uppercase', marginBottom:20, animation:'fadeUp 0.8s 0.3s both' },
  title: { fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(36px,7vw,80px)', fontWeight:900, lineHeight:1.1, color:'#f0d080', textShadow:'0 0 60px rgba(201,168,76,0.4)', marginBottom:12, animation:'fadeUp 0.8s 0.5s both' },
  year: { fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(20px,4vw,40px)', color:'#c9a84c', animation:'fadeUp 0.8s 0.7s both', marginBottom:20 },
  tagline: { fontSize:20, fontStyle:'italic', color:'#d4b896', letterSpacing:4, marginBottom:36, animation:'fadeUp 0.8s 0.9s both' },
  badges: { display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center', marginBottom:40, animation:'fadeUp 0.8s 1.1s both' },
  badge: { background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.4)', padding:'8px 22px', fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:'#c9a84c', letterSpacing:2 },
  cta: { display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center', animation:'fadeUp 0.8s 1.3s both' },
  scroll: { position:'absolute', bottom:30, left:'50%', color:'rgba(201,168,76,0.5)', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:3, animation:'bounce 2s ease-in-out infinite', display:'flex', flexDirection:'column', alignItems:'center', gap:6 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, marginBottom:50 },
  card: { background:'linear-gradient(135deg,rgba(61,43,14,0.4),rgba(13,10,5,0.6))', border:'1px solid rgba(201,168,76,0.25)', padding:'28px 20px', textAlign:'center', transition:'all 0.3s' },
  prizeBox: { background:'linear-gradient(135deg,rgba(61,43,14,0.6),rgba(26,18,8,0.8))', border:'2px solid rgba(201,168,76,0.4)', padding:'50px 60px', textAlign:'center', maxWidth:800, margin:'0 auto 50px' },
  rulesGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 },
  ruleCard: { background:'rgba(61,43,14,0.2)', borderLeft:'3px solid #8a6a1e', padding:'22px 24px', transition:'all 0.3s' },
  statsBar: { display:'flex', gap:40, justifyContent:'center', flexWrap:'wrap', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', padding:'28px 40px', marginBottom:80 },
};

const rules = [
  'Teams must consist of the registered members only. No substitutions after registration closes.',
  'No external devices or internet access during Round 1 and Round 3 unless specified.',
  'All clues in Round 2 must be solved sequentially. Jumping ahead is not permitted.',
  "The organizer's decision on all scores, tie-breakers, and disqualifications is final.",
  'Any form of malpractice or unsportsmanlike conduct results in immediate disqualification.',
  'Teams must report to the venue at least 10 minutes before their scheduled round begins.',
];
const overview = [
  {icon:'🏴‍☠️', title:'Format',  value:'Team Event'},
  {icon:'⚔️',   title:'Rounds',  value:'3 Stages'},
  {icon:'⏳',   title:'Round 1', value:'15 Minutes'},
  {icon:'🧠',   title:'Skills',  value:'Logic & Code'},
];
const hov = (e, on) => {
  e.currentTarget.style.borderColor = on ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.25)';
  e.currentTarget.style.transform = on ? 'translateY(-5px)' : 'none';
};

export default function Landing() {
  const [stats, setStats] = useState({ totalTeams:'—', totalParticipants:'—', spotsLeft:'—' });

  // FIX: use full backend URL so it works in production
  useEffect(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    axios.get(`${base}/stats`)
      .then(r => { if (r.data?.data) setStats(r.data.data); })
      .catch(() => {}); // silently ignore — stats are non-critical
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={s.hero}>
        <div style={{ position:'relative', marginBottom:40 }}>
          <div style={s.ring}><div style={s.inner}/><div style={s.center}>🧭</div></div>
        </div>
        <div style={s.tag}>✦ A Quest Awaits You ✦</div>
        <h1 style={s.title}>Technical<br/>Treasure Hunt</h1>
        <div style={s.year}>2026</div>
        <div style={s.tagline}>Decode • Discover • Dominate</div>
        <div style={s.badges}>
          {['⚔ 3 Rounds','🏴 Team Event','⏳ Time Bound','🧩 Problem Solving'].map(b => (
            <div key={b} style={s.badge}>{b}</div>
          ))}
        </div>
        <div style={s.cta}>
          <Link to="/register" className="btn-primary">⚔ Join the Hunt</Link>
          <Link to="/rounds" className="btn-secondary">See Challenges</Link>
        </div>
        <div style={s.scroll}>▼ SCROLL</div>
      </section>

      {/* Countdown */}
      <div className="container" style={{ paddingBottom:80 }}>
        <div className="section-label">The Clock is Ticking</div><br/>
        <Countdown/>
      </div>

      {/* Live stats */}
      <div className="container">
        <div style={s.statsBar}>
          {[
            {num:stats.totalTeams,       lbl:'TEAMS REGISTERED'},
            {num:stats.totalParticipants,lbl:'PARTICIPANTS'},
            {num:stats.spotsLeft,        lbl:'SPOTS LEFT'},
          ].map(st => (
            <div key={st.lbl} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:36, color:'#f0d080' }}>{st.num}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#8a6a1e', letterSpacing:3 }}>{st.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overview */}
      <section className="section"><div className="container">
        <div className="section-label">The Quest Briefing</div>
        <h2 className="section-title">Event Overview</h2>
        <div style={s.grid}>
          {overview.map(o => (
            <div key={o.title} style={s.card} onMouseEnter={e=>hov(e,true)} onMouseLeave={e=>hov(e,false)}>
              <div style={{ fontSize:34, marginBottom:12 }}>{o.icon}</div>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:12, color:'#c9a84c', letterSpacing:2, marginBottom:6 }}>{o.title}</div>
              <div style={{ fontSize:16, color:'#d4b896' }}>{o.value}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign:'center', fontSize:18, color:'#d4b896', fontStyle:'italic', maxWidth:700, margin:'0 auto', lineHeight:1.9 }}>
          A multi-round technical challenge designed to test problem-solving skills, logical thinking, debugging ability, and teamwork under pressure.
        </p>
      </div></section>

      {/* Prizes */}
      <section className="section" style={{ paddingTop:0 }}><div className="container">
        <div className="section-label">The Treasure Awaits</div>
        <h2 className="section-title">Prizes & Glory</h2>
        <div style={s.prizeBox}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:'#c9a84c', letterSpacing:6, marginBottom:16 }}>✦ GRAND CHAMPION ✦</div>
          <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(24px,5vw,50px)', color:'#f0d080', marginBottom:12 }}>🏆 The Treasure Title</div>
          <div style={{ fontSize:18, color:'#d4b896', fontStyle:'italic' }}>Recognition, Certificates & Eternal Bragging Rights</div>
        </div>
        <div style={{ ...s.grid, maxWidth:800, margin:'0 auto' }}>
          {[
            {icon:'🥇', title:'1st Place', value:'Champion Trophy + Certificate'},
            {icon:'🥈', title:'2nd Place', value:'Runner-up Certificate'},
            {icon:'🥉', title:'3rd Place', value:'Merit Certificate'},
          ].map(p => (
            <div key={p.title} style={s.card} onMouseEnter={e=>hov(e,true)} onMouseLeave={e=>hov(e,false)}>
              <div style={{ fontSize:34, marginBottom:12 }}>{p.icon}</div>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:12, color:'#c9a84c', letterSpacing:2, marginBottom:6 }}>{p.title}</div>
              <div style={{ fontSize:16, color:'#d4b896' }}>{p.value}</div>
            </div>
          ))}
        </div>
      </div></section>

      {/* Rules */}
      <section className="section" style={{ paddingTop:0 }}><div className="container">
        <div className="section-label">The Sacred Scrolls</div>
        <h2 className="section-title">Rules & Code of Conduct</h2>
        <div style={s.rulesGrid}>
          {rules.map((rule, i) => (
            <div key={i} style={s.ruleCard}
              onMouseEnter={e=>{e.currentTarget.style.borderLeftColor='#c9a84c';e.currentTarget.style.background='rgba(61,43,14,0.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderLeftColor='#8a6a1e';e.currentTarget.style.background='rgba(61,43,14,0.2)';}}>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:34, color:'rgba(201,168,76,0.2)', lineHeight:1, marginBottom:6 }}>0{i+1}</div>
              <div style={{ fontSize:16, color:'#d4b896', lineHeight:1.7 }}>{rule}</div>
            </div>
          ))}
        </div>
      </div></section>

      {/* Footer */}
      <footer style={{ textAlign:'center', padding:'60px 40px', borderTop:'1px solid rgba(201,168,76,0.15)', position:'relative', zIndex:1 }}>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:20, color:'#c9a84c', marginBottom:8 }}>⚓ Technical Treasure Hunt 2026</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:'rgba(201,168,76,0.4)', letterSpacing:3 }}>MLRITM · Dundigal · CSE Department</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'rgba(201,168,76,0.25)', letterSpacing:3, marginTop:6 }}>Decode • Discover • Dominate</div>
      </footer>
    </>
  );
}