import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import '../styles/global.css';

const hov = (e, on) => { e.currentTarget.style.borderColor = on ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.25)'; e.currentTarget.style.transform = on ? 'translateY(-4px)' : 'none'; };

export default function Dashboard() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const refs = useRef([]);

  useEffect(() => {
    Promise.allSettled([api.get('/rounds'), api.get('/teams/my-team')]).then(([rr, tr]) => {
      if (rr.status === 'fulfilled') setRounds(rr.value.data.rounds);
      if (tr.status === 'fulfilled') setTeam(tr.value.data.team);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; } });
    }, { threshold: 0.1 });
    refs.current.forEach(r => r && obs.observe(r));
    return () => obs.disconnect();
  }, [rounds]);

  const roundIcons = {1:'📜', 2:'🗺️', 3:'💎'};

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, paddingBottom:80, minHeight:'100vh' }}>
        <div className="container">
          {/* Header */}
          <div style={{ marginBottom:60 }}>
            <div className="section-label">Your Command Deck</div>
            <h1 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(24px,5vw,48px)', color:'#f0d080', textAlign:'center', textShadow:'0 0 40px rgba(201,168,76,0.3)', marginTop:16 }}>
              Welcome, {user?.pirateName || user?.username}
            </h1>
            <p style={{ textAlign:'center', fontStyle:'italic', color:'#d4b896', fontSize:18, marginTop:8 }}>
              The hunt is afoot. Your treasure awaits.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'80px', fontFamily:"'Share Tech Mono',monospace", color:'#c9a84c', letterSpacing:4, fontSize:13 }}>
              LOADING YOUR VESSEL...
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:32, alignItems:'start' }}>

              {/* LEFT: Team */}
              <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                <div style={{ background:'linear-gradient(135deg,rgba(61,43,14,0.5),rgba(13,10,5,0.8))', border:'1px solid rgba(201,168,76,0.3)', padding:'32px', position:'relative' }}>
                  <span style={{ position:'absolute', top:-11, left:24, background:'#0d0a05', padding:'0 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#c9a84c', letterSpacing:4 }}>YOUR CREW</span>

                  {team ? (
                    <>
                      <h3 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:22, color:'#f0d080', marginBottom:6 }}>{team.name}</h3>
                      {team.shipName && <p style={{ fontStyle:'italic', color:'#d4b896', marginBottom:20, fontSize:15 }}>🚢 {team.shipName}</p>}

                      {/* Join code */}
                      <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', padding:'18px', textAlign:'center', marginBottom:24 }}>
                        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#8a6a1e', letterSpacing:4, marginBottom:8 }}>JOIN CODE</div>
                        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:28, color:'#f0d080', letterSpacing:8, textShadow:'0 0 20px rgba(201,168,76,0.5)' }}>{team.joinCode}</div>
                      </div>

                      {team.members?.map(m => (
                        <div key={m._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(201,168,76,0.1)' }}>
                          <span style={{ color:'#c9a84c', fontSize:16 }}>⬡</span>
                          <div>
                            <p style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:13, color:'#f0d080' }}>{m.pirateName || m.username}</p>
                            <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#8a6a1e' }}>@{m.username}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <p style={{ fontStyle:'italic', color:'#d4b896', marginBottom:20 }}>☠️ You sail alone. Join a crew!</p>
                      <Link to="/register" className="btn-secondary" style={{ fontSize:13, padding:'10px 24px' }}>Join / Create Crew</Link>
                    </div>
                  )}
                </div>

                {/* Score */}
                {team && (
                  <div style={{ background:'linear-gradient(135deg,rgba(61,43,14,0.6),rgba(13,10,5,0.9))', border:'1px solid rgba(201,168,76,0.4)', padding:'28px', textAlign:'center', boxShadow:'0 0 40px rgba(201,168,76,0.1)' }}>
                    <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#8a6a1e', letterSpacing:4, marginBottom:12 }}>💰 DOUBLOONS EARNED</div>
                    <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:64, color:'#f0d080', textShadow:'0 0 40px rgba(201,168,76,0.6)', lineHeight:1 }}>{team.totalScore}</div>
                    <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#8a6a1e', letterSpacing:3, marginBottom:20 }}>TOTAL SCORE</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      {[1,2,3].map(n => (
                        <div key={n} style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', padding:'12px 6px' }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#8a6a1e', letterSpacing:2 }}>ROUND {n}</div>
                          <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:24, color:'#f0d080' }}>{team.scores?.[`round${n}`] ?? 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user?.role === 'admin' && (
                  <Link to="/admin" className="btn-primary" style={{ textAlign:'center', letterSpacing:2, fontSize:12 }}>⚙ CAPTAIN'S QUARTERS</Link>
                )}
              </div>

              {/* RIGHT: Rounds */}
              <div>
                <div className="section-label" style={{ marginBottom:30 }}>Available Trials</div>
                <div style={{ display:'flex', flexDirection:'column', gap:24, position:'relative' }}>
                  <div style={{ position:'absolute', left:-20, top:0, bottom:0, width:2, background:'linear-gradient(to bottom,#8a6a1e,transparent)' }}/>

                  {rounds.length === 0 ? (
                    <div style={{ background:'linear-gradient(135deg,rgba(61,43,14,0.3),rgba(13,10,5,0.6))', border:'1px dashed rgba(201,168,76,0.2)', padding:'60px', textAlign:'center' }}>
                      <p style={{ fontSize:48, marginBottom:16 }}>⚓</p>
                      <p style={{ fontStyle:'italic', color:'#d4b896', fontSize:18 }}>The Captain has not opened any rounds yet. Stand by, sailor.</p>
                    </div>
                  ) : rounds.map((round, i) => {
                    const done = team?.completedRounds?.includes(round.roundNumber);
                    return (
                      <div key={round._id} ref={el => refs.current[i] = el}
                        style={{ background:'linear-gradient(135deg,rgba(61,43,14,0.4),rgba(13,10,5,0.6))', border:`1px solid ${done?'rgba(34,139,34,0.4)':'rgba(201,168,76,0.25)'}`, padding:'28px', opacity:0, transform:'translateX(-20px)', transition:'opacity 0.7s,transform 0.7s' }}
                        onMouseEnter={e=>hov(e,true)} onMouseLeave={e=>hov(e,false)}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:16 }}>
                          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                            <span style={{ fontSize:36 }}>{roundIcons[round.roundNumber]}</span>
                            <div>
                              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color: done?'#5cb85c':'#8a6a1e', letterSpacing:3, marginBottom:4 }}>
                                ROUND {round.roundNumber} {done && '✓ COMPLETED'}
                              </div>
                              <h3 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:18, color: done?'#7dc87d':'#f0d080' }}>{round.title}</h3>
                              <p style={{ fontStyle:'italic', color:'#d4b896', fontSize:15, marginTop:4 }}>{round.description}</p>
                            </div>
                          </div>
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:28, color: done?'#5cb85c':'#c9a84c' }}>{round.durationMinutes}m</div>
                            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#8a6a1e', letterSpacing:2 }}>DURATION</div>
                          </div>
                        </div>
                        {done
                          ? <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:'#5cb85c', letterSpacing:2 }}>✅ SCORE: {team.scores?.[`round${round.roundNumber}`]} POINTS</p>
                          : <Link to={`/round/${round.roundNumber}`} className="btn-primary" style={{ fontSize:12, padding:'11px 28px' }}>Enter Round {round.roundNumber} →</Link>
                        }
                      </div>
                    );
                  })}

                  {user?.role === 'admin' && (
                    <Link to="/leaderboard" className="btn-secondary" style={{ textAlign:'center', padding:'16px', fontSize:12, letterSpacing:2 }}>
                      🏆 VIEW HALL OF LEGENDS
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
