import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import '../styles/global.css';

const C = { gold:'#f0c040', surface:'#0d0a05', surfaceHi:'rgba(240,192,64,0.05)', border:'rgba(240,192,64,0.15)', text:'#f5e9c8', textMid:'#d4b896', textDim:'#8a6a1e', mono:"'Share Tech Mono',monospace", sans:"'Inter',sans-serif", goldDim:'rgba(240,192,64,0.1)' };
const sx = { input:{ width:'100%', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(240,192,64,0.3)', borderBottom:'2px solid rgba(240,192,64,0.5)', color:'#f5e9c8', padding:'13px 16px', fontFamily:C.mono, fontSize:15, outline:'none' } };

export default function RoundPage() {
  const { num } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // FIX: Added useAuth to check role
  const [round, setRound] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [team, setTeam] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [showDigit, setShowDigit] = useState(null); // { digit, index }
  const [notification, setNotification] = useState(null); // { msg, type: 'err' | 'info' | 'success' }

  useEffect(() => {
    Promise.all([
      api.get(`/rounds/${num}`),
      api.get('/teams/my-team')
    ]).then(([resRound, resTeam]) => {
      const r = resRound.data.round;
      setRound(r); 
      setAnswers(new Array(r.questions.length).fill(''));
      setTimeLeft(r.durationMinutes * 60);
      if (r.alreadySubmitted) setSubmitted(true);
      setTeam(resTeam.data.team);
    }).catch(err => setError(err.response?.data?.message || 'Failed to load trial data'))
      .finally(() => setLoading(false));
  }, [num]);

  const verifyClue = async (index) => {
    if (!answers[index]) return;
    try {
      const res = await api.post('/rounds/verify-clue', { 
        roundNumber: 2, 
        questionIndex: index, 
        answer: answers[index] 
      });
      if (res.data.correct) {
        setShowDigit({ digit: res.data.digit, index });
        const updatedTeam = await api.get('/teams/my-team');
        setTeam(updatedTeam.data.team);
      } else {
        setNotification({ msg: res.data.message || 'That is not the correct answer, pirate!', type: 'err' });
      }
    } catch (err) { 
      const msg = err.response?.data?.message || 'Communication error with the ship!';
      setNotification({ msg: `⚓ ${msg}`, type: 'err' });
    }
  };

  const handleUnlock = async () => {
    if (pinEntry.length !== 5) return;
    setUnlocking(true);
    try {
      const res = await api.post('/rounds/unlock', { pin: pinEntry });
      if (res.data.unlocked) {
        setPinEntry('');
        setNotification({ msg: '🔓 Master Lock Disengaged! Trial III is open.', type: 'success' });
        const updatedTeam = await api.get('/teams/my-team');
        setTeam(updatedTeam.data.team);
      }
    } catch (err) {
      setPinEntry('');
      if (err.response?.status === 403 || err.response?.status === 400) {
        const updatedTeam = await api.get('/teams/my-team');
        setTeam(updatedTeam.data.team);
      }
      setNotification({ msg: err.response?.data?.message || 'Unlock failed!', type: 'err' });
    } finally { setUnlocking(false); }
  };

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const res = await api.post(`/rounds/${num}/submit`, { answers, timeTaken });
      setResult(res.data); setSubmitted(true);
    } catch (err) { setError(err.response?.data?.message || 'Submission failed!'); }
  }, [answers, num, startTime, submitted]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(tt => tt - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted, handleSubmit]);

  const formatTime = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const timerWarning = timeLeft !== null && timeLeft < 60;

  if (loading) return (<><Navbar /><div style={{ paddingTop:140, textAlign:'center', fontFamily:"'Share Tech Mono',monospace", color:'#c9a84c', letterSpacing:4 }}>DECODING THE TRIAL...</div></>);
  if (error) return (<><Navbar /><div style={{ paddingTop:140, textAlign:'center', color:'#ff8080', fontFamily:"'Share Tech Mono',monospace" }}>{error}</div></>);

  const NotificationModal = ({ note, onClose }) => (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)' }} onClick={onClose}>
      <div style={{ background:'linear-gradient(135deg, #1a1510, #0a0a0a)', border:`2px solid ${note.type==='err'?'#ff4d4d':C.gold}`, padding:40, maxWidth:420, width:'90%', textAlign:'center', boxShadow:`0 20px 60px rgba(0,0,0,0.8), 0 0 30px ${note.type==='err'?'rgba(255,77,77,0.2)':'rgba(240,192,64,0.1)'}`, borderRadius:4 }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:48, marginBottom:20 }}>{note.type==='err'?'🚫':note.type==='success'?'✅':'⚓'}</div>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", color:note.type==='err'?'#ff4d4d':C.gold, fontSize:22, marginBottom:16, letterSpacing:2 }}>{note.type==='err'?'STAY BACK!':note.type==='success'?'TRIUMPH!':'PARROT SAYS:'}</div>
        <p style={{ color:'#d4b896', lineHeight:1.6, fontSize:15, marginBottom:30 }}>{note.msg}</p>
        <button className="btn-primary" onClick={onClose} style={{ width:'100%', background:note.type==='err'?'#ff4d4d':'', border:note.type==='err'?'#ff4d4d':'' }}>UNDERSTOOD</button>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      {notification && <NotificationModal note={notification} onClose={()=>setNotification(null)} />}
      <div style={{ paddingTop:100, paddingBottom:80, minHeight:'100vh', background:C.surface }}>
        <div className="container" style={{ maxWidth:860 }}>

          {/* Elimination Card */}
          {team?.isEliminated && (
            <div style={{ background:'radial-gradient(circle at center, rgba(30,10,10,0.98) 0%, rgba(5,0,0,1) 100%)', border:'2px solid #ff4d4d', padding:80, textAlign:'center', position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:2000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backdropFilter:'blur(25px)' }}>
              <div style={{ fontSize:180, marginBottom:40, filter:'drop-shadow(0 0 50px rgba(255,77,77,0.7))', animation:'float 3s ease-in-out infinite' }}>💀</div>
              <h1 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:72, color:'#ff4d4d', marginBottom:20, letterSpacing:8, textShadow:'0 0 30px rgba(255,77,77,0.3)' }}>ELIMINATED</h1>
              <div style={{ width:120, height:2, background:'#ff4d4d', marginBottom:40 }} />
              <p style={{ color:'#d4b896', fontSize:24, maxWidth:700, fontStyle:'italic', lineHeight:1.8, letterSpacing:1 }}>"Your crew failed the master lock. The depths of the ocean await your return. Your journey is over, pirate."</p>
              <button className="btn-primary" onClick={()=>navigate('/')} style={{ marginTop:60, padding:'20px 60px', background:'transparent', border:'2px solid #ff4d4d', color:'#ff4d4d', fontSize:18, letterSpacing:4 }}>ABANDON SHIP</button>
            </div>
          )}

          {/* Round 3 Lock Card */}
          {num === '3' && team && !team.round3Unlocked && !team.isEliminated && (
            <div style={{ background:'linear-gradient(135deg,rgba(25,20,15,0.98),rgba(0,0,0,1))', border:`1px solid ${C.goldDim}`, padding:60, textAlign:'center', marginBottom:48, boxShadow:'0 40px 100px rgba(0,0,0,1)', position:'relative', borderRadius:2 }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />
              <div style={{ fontSize:64, marginBottom:24, filter:'drop-shadow(0 0 20px rgba(240,192,64,0.3))' }}>🔒</div>
              <h2 style={{ fontFamily:"'Cinzel Decorative',serif", color:'#f0d080', fontSize:32, marginBottom:12, letterSpacing:3 }}>Master Number Lock</h2>
              <p style={{ color:'#8a6a1e', fontSize:12, marginBottom:48, letterSpacing:4, fontWeight:700 }}>VERIFY YOUR CREW'S FINDINGS FROM TRIAL II</p>
              
              <div style={{ display:'flex', gap:18, justifyContent:'center', marginBottom:48 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width:64, height:88, background:'rgba(240,192,64,0.03)', border:`2px solid ${pinEntry.length > i ? C.gold : 'rgba(240,192,64,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, color:C.gold, fontFamily:C.mono, boxShadow:pinEntry.length > i ? `0 0 15px ${C.goldDim}` : 'none', transition:'all 0.2s' }}>
                    {pinEntry[i] || ''}
                  </div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 84px)', gap:16, justifyContent:'center', marginBottom:48 }}>
                {[1,2,3,4,5,6,7,8,9, 'C', 0, 'OK'].map(key => (
                  <button key={key} onClick={() => {
                    if (key === 'C') setPinEntry('');
                    else if (key === 'OK') handleUnlock();
                    else if (pinEntry.length < 5) setPinEntry(p => p + key);
                  }} style={{ height:84, borderRadius:4, border:`1px solid ${C.border}`, background:'rgba(240,192,64,0.02)', color:C.gold, fontSize:22, fontFamily:C.mono, cursor:'pointer', transition:'all 0.2s', outline:'none' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(240,192,64,0.08)'; e.currentTarget.style.borderColor=C.gold;}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(240,192,64,0.02)'; e.currentTarget.style.borderColor=C.border;}}>
                    {key}
                  </button>
                ))}
              </div>

              <div style={{ color:'#ff8080', fontSize:13, letterSpacing:4, fontFamily:C.mono, fontWeight:700 }}>
                ⚠️ {3 - team.round3PinAttempts} ATTEMPTS REMAINING
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:48, gap:20, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontFamily:C.mono, fontSize:11, color:C.textMid, letterSpacing:5, marginBottom:10 }}>
                TRIAL {num} OF III
              </div>
              <h1 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(28px,5vw,48px)', color:C.gold, textShadow:'0 0 40px rgba(240,192,64,0.2)', marginBottom:0 }}>
                {round?.title}
              </h1>
              <p style={{ fontStyle:'italic', color:'#d4b896', marginTop:12, fontSize:18, opacity:0.8 }}>{round?.description}</p>
            </div>
            {!submitted && timeLeft !== null && (
              <div style={{ background:'rgba(0,0,0,0.4)', border:`1px solid ${timerWarning?'rgba(255,128,128,0.3)':C.border}`, padding:'24px 32px', textAlign:'center', minWidth:160, backdropFilter:'blur(10px)' }}>
                <div style={{ fontFamily:C.mono, fontSize:10, color:timerWarning?'#ff8080':C.textMid, letterSpacing:4, marginBottom:10 }}>⌛ TRIAL TIME</div>
                <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:40, color:timerWarning?'#ff8080':C.gold, animation:timerWarning?'glowPulse 0.5s infinite':undefined }}>{formatTime(timeLeft)}</div>
              </div>
            )}
          </div>

          {/* Result */}
          {submitted && result && (
            <div style={{ background:'linear-gradient(135deg,rgba(30,25,20,0.9),rgba(10,10,10,0.95))', border:`2px solid ${C.goldDim}`, padding:'80px 40px', textAlign:'center', boxShadow:'0 40px 100px rgba(0,0,0,0.5)', borderRadius:2 }}>
              <div style={{ fontSize:88, marginBottom:24, filter:'drop-shadow(0 0 30px rgba(240,192,64,0.4))' }}>{result.score>=60?'🏆':result.score>=30?'⚔️':'☠️'}</div>
              <h2 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:32, color:C.gold, marginBottom:16, letterSpacing:4 }}>
                {result.score>=60?'TREASURE FOUND!':'TRIAL CONCLUDED'}
              </h2>
              <p style={{ fontStyle:'italic', color:'#d4b896', fontSize:20, marginBottom:48, opacity:0.9 }}>{result.message}</p>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:110, color:C.gold, textShadow:'0 0 50px rgba(240,192,64,0.5)', lineHeight:0.9 }}>{result.score}</div>
              <div style={{ fontFamily:C.mono, fontSize:12, color:C.textMid, letterSpacing:6, marginTop:20, marginBottom:48 }}>DOUBLOONS EARNED</div>
              <div style={{ display:'flex', gap:20, justifyContent:'center' }}>
                <button className="btn-primary" onClick={()=>navigate('/dashboard')} style={{ padding:'16px 44px' }}>BACK TO SHIP</button>
                {user?.role === 'admin' && (
                  <button className="btn-secondary" onClick={()=>navigate('/leaderboard')} style={{ padding:'16px 44px' }}>THE RANKINGS</button>
                )}
              </div>
            </div>
          )}

          {submitted && !result && (
            <div style={{ background:'rgba(240,192,64,0.03)', border:`1px solid ${C.border}`, padding:'60px', textAlign:'center', borderRadius:2 }}>
              <p style={{ fontSize:56, marginBottom:20 }}>📜</p>
              <h2 style={{ fontFamily:"'Cinzel Decorative',serif", color:C.gold, marginBottom:16, letterSpacing:3 }}>TRIAL ALREADY SEALED</h2>
              <p style={{ fontStyle:'italic', color:'#d4b896', marginBottom:36, fontSize:18 }}>Your crew has already logged an entry for this trial.</p>
              <button className="btn-primary" onClick={()=>navigate('/dashboard')}>RETURN TO DECK</button>
            </div>
          )}

          {/* Digit Reveal Popup */}
          {showDigit && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.92)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(20px)' }} onClick={()=>setShowDigit(null)}>
              <div style={{ background:'radial-gradient(circle at center, #1a1510 0%, #050505 100%)', border:`1px solid ${C.gold}`, padding:'80px 100px', textAlign:'center', boxShadow:'0 0 100px rgba(240,192,64,0.2)', position:'relative', borderRadius:4 }} onClick={e=>e.stopPropagation()}>
                <div style={{ position:'absolute', top:24, right:24, cursor:'pointer', color:C.textMid, fontSize:20 }} onClick={()=>setShowDigit(null)}>✕</div>
                <div style={{ fontFamily:C.mono, fontSize:12, color:C.textMid, letterSpacing:6, marginBottom:32 }}>CLUE {showDigit.index + 1} DECODED</div>
                <div style={{ fontSize:160, color:'#fff', fontFamily:"'Cinzel Decorative',serif", textShadow:`0 0 50px ${C.gold}, 0 0 100px ${C.gold}`, lineHeight:1 }}>{showDigit.digit}</div>
                <div style={{ width:80, height:2, background:C.gold, margin:'40px auto' }} />
                <div style={{ color:'#d4b896', fontStyle:'italic', fontSize:18, letterSpacing:1 }}>"A fragment of the secret code. Keep it safe."</div>
                <button className="btn-primary" onClick={()=>setShowDigit(null)} style={{ marginTop:56, padding:'16px 48px', letterSpacing:3 }}>CONTINUE THE HUNT</button>
              </div>
            </div>
          )}

          {/* Round Header / Digit Tracker for Round 2 */}
          {num === '2' && team && (
            <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:48 }}>
              {team.round2Digits.map((d, i) => (
                <div key={i} style={{ width:48, height:64, background:'rgba(240,192,64,0.03)', border:`2px solid ${d==='?'?'rgba(240,192,64,0.1)':'#c9a84c'}`, display:'flex', alignItems:'center', justifyContent:'center', color:d==='?'?'#4a3a1a':C.gold, fontSize:28, fontFamily:C.mono, textShadow:d!=='?'?`0 0 15px ${C.goldDim}`:'none' }}>{d}</div>
              ))}
            </div>
          )}

          {/* Questions */}
          {(num !== '3' || team?.round3Unlocked) && !submitted && round?.questions?.map((q, i) => (
            <div key={q._id||i} style={{ background:'rgba(240,192,64,0.02)', border:`1px solid ${C.border}`, padding:'36px', marginBottom:24, borderRadius:4, position:'relative', transition:'all 0.3s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(240,192,64,0.3)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ display:'flex', gap:24, marginBottom:28 }}>
                <div style={{ width:44, height:44, border:`1px solid ${C.gold}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cinzel Decorative',serif", fontSize:18, color:C.gold, flexShrink:0, background:'rgba(240,192,64,0.05)' }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                    <span style={{ background:'rgba(240,192,64,0.08)', border:`1px solid ${C.goldDim}`, padding:'3px 12px', fontFamily:C.mono, fontSize:10, color:C.gold, letterSpacing:2, fontWeight:700 }}>{q.type?.toUpperCase()}</span>
                    <span style={{ background:'rgba(255,92,92,0.08)', border:'1px solid rgba(255,128,128,0.2)', padding:'3px 12px', fontFamily:C.mono, fontSize:10, color:'#ff8080', letterSpacing:2, fontWeight:700 }}>{q.points} PTS</span>
                  </div>
                  <p style={{ fontSize:20, color:'#f5e9c8', lineHeight:1.6, fontWeight:500 }}>{q.text}</p>
                  {q.hint && <p style={{ fontStyle:'italic', color:'#8a6a1e', fontSize:15, marginTop:12, display:'flex', alignItems:'center', gap:8 }}>⚓ <span style={{ opacity:0.8 }}>{q.hint}</span></p>}
                </div>
              </div>

              {q.type === 'mcq' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:14, marginLeft:68 }}>
                  {q.options.map(opt => (
                    <label key={opt} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', cursor:'pointer', border:`1px solid ${answers[i]===opt?'rgba(240,192,64,0.5)':'rgba(240,192,64,0.1)'}`, background:answers[i]===opt?'rgba(240,192,64,0.05)':'transparent', transition:'all 0.2s', borderRadius:4 }}>
                      <input type="radio" name={`q${i}`} value={opt} checked={answers[i]===opt} onChange={()=>setAnswers(p=>{const a=[...p];a[i]=opt;return a;})} style={{ display:'none' }}/>
                      <div style={{ width:18, height:18, border:`1px solid ${answers[i]===opt?C.gold:C.textDim}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                        {answers[i]===opt && <div style={{ width:10, height:10, background:C.gold }} />}
                      </div>
                      <span style={{ fontSize:17, color: answers[i]===opt?C.gold:'#d4b896', fontWeight:answers[i]===opt?600:400 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ marginLeft:68, display:'flex', gap:16 }}>
                  <input type="text" style={{ flex:1, background:'rgba(0,0,0,0.5)', border:`1px solid ${C.border}`, borderBottom:`2px solid ${C.goldDim}`, color:'#f5e9c8', padding:'16px 20px', fontFamily:C.mono, fontSize:16, outline:'none', transition:'all 0.3s' }}
                    placeholder="ENTER YOUR DECODING..." value={answers[i]}
                    onFocus={e=>e.target.style.borderColor='rgba(240,192,64,0.5)'}
                    onBlur={e=>e.target.style.borderColor=C.border}
                    onChange={e=>setAnswers(p=>{const a=[...p];a[i]=e.target.value;return a;})}/>
                  
                  {num === '2' && i < 5 && (
                    <button className="btn-secondary" onClick={()=>verifyClue(i)} style={{ padding:'0 24px', whiteSpace:'nowrap', fontSize:12, letterSpacing:2, fontWeight:700 }}>
                      ⚓ REVEAL DIGIT
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Sticky submit */}
          {(num !== '3' || team?.round3Unlocked) && !submitted && (
            <div style={{ position:'sticky', bottom:32, background:'rgba(10,8,5,0.98)', border:`1px solid ${C.goldDim}`, padding:'20px 36px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(15px)', boxShadow:'0 20px 50px rgba(0,0,0,0.8)', zIndex:100, borderRadius:2 }}>
              <span style={{ fontFamily:C.mono, fontSize:13, color:'#8a6a1e', letterSpacing:3, fontWeight:700 }}>
                {answers.filter(Boolean).length}/{round?.questions?.length} CLUES SEALED
              </span>
              <button className="btn-primary" onClick={handleSubmit} style={{ padding:'16px 52px', fontSize:15, letterSpacing:4 }}>
                🏴‍☠️ SUBMIT LOG
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
