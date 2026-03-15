import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import '../styles/global.css';

const C = {
  gold: '#f0c040', surface: '#0d0a05', surfaceHi: 'rgba(240,192,64,0.05)',
  border: 'rgba(240,192,64,0.15)', text: '#f5e9c8', textMid: '#d4b896',
  textDim: '#8a6a1e', mono: "'Share Tech Mono',monospace", sans: "'Inter',sans-serif",
  goldDim: 'rgba(240,192,64,0.1)', amber: '#ffb347', green: '#3ddc84', red: '#ff5c5c',
};
const sx = {
  input: { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(240,192,64,0.3)', borderBottom: '2px solid rgba(240,192,64,0.5)', color: '#f5e9c8', padding: '13px 16px', fontFamily: C.mono, fontSize: 15, outline: 'none' },
};

/* ── CSS keyframes injected once ── */
const KEYFRAMES = `
  @keyframes hintSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }
  @keyframes hintGlow {
    0%,100% { box-shadow: 0 0 15px rgba(255,179,71,0.3); }
    50%      { box-shadow: 0 0 35px rgba(255,179,71,0.7); }
  }
  @keyframes lockShake {
    0%,100% { transform: translateX(0); }
    25%     { transform: translateX(-6px); }
    75%     { transform: translateX(6px); }
  }
  @keyframes rayRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes haloPulse {
    0%, 100% { opacity: 0.3; transform: scale(0.9); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
  @keyframes chestFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(1deg); }
  }
  @keyframes particleFloat {
    0% { transform: translateY(0) translateX(0); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lidOpen {
    0% { transform: rotateX(0deg); }
    100% { transform: rotateX(-110deg); }
  }
  @keyframes goldGlow {
    0%, 100% { filter: brightness(1) blur(10px); }
    50% { filter: brightness(1.5) blur(15px); }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  }
`;

export default function RoundPage() {
  const { num } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [showDigit, setShowDigit] = useState(null);
  const [notification, setNotification] = useState(null);

  // ── Hint System State ──
  const [hintsUsed, setHintsUsed] = useState([]);        // indices that have been hinted
  const [hintsRemaining, setHintsRemaining] = useState(2);
  const [revealedHints, setRevealedHints] = useState({}); // { index: hintText }
  const [hintModal, setHintModal] = useState(null);       // { index } when warning is open
  const [hintLoading, setHintLoading] = useState(false);
  
  // ── Round 3 Specific State ──
  const [rd3Stage, setRd3Stage] = useState('QUESTION'); // QUESTION, DISCOVERY, FINAL_PUZZLE, OUTCOME
  const [rd3FinalAnswer, setRd3FinalAnswer] = useState('');
  const [rd3Outcome, setRd3Outcome] = useState(null); // 'WINNER' | 'LATE'
  const [chestOpened, setChestOpened] = useState(false);
  const [finalRiddleError, setFinalRiddleError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/rounds/${num}`),
      api.get('/teams/my-team'),
    ]).then(([resRound, resTeam]) => {
      const r = resRound.data.round;
      setRound(r);
      setAnswers(new Array(r.questions.length).fill(''));
      setTimeLeft(r.durationMinutes * 60);
      if (r.alreadySubmitted) {
        setSubmitted(true);
        if (num === '3') {
          setRd3Stage('OUTCOME');
          setChestOpened(true);
          api.get('/rounds/game-state').then(gsRes => {
             const st = gsRes.data.state;
             if (st?.isFirstWinnerFound && (st.winnerUser === user._id || st.winnerTeam === resTeam.data.team?._id)) {
               setRd3Outcome('WINNER');
             } else {
               setRd3Outcome('LATE');
             }
          });
        }
      }
      setTeam(resTeam.data.team);
      // Sync hint state from server
      if (r.hintsUsed) setHintsUsed(r.hintsUsed);
      if (r.hintsRemaining !== undefined) setHintsRemaining(r.hintsRemaining);
    }).catch(err => setError(err.response?.data?.message || 'Failed to load trial data'))
      .finally(() => setLoading(false));
  }, [num]);

  /* ── Verify clue (Reveal Digit or Logic Puzzle) ── */
  const verifyClue = async (index) => {
    if (!answers[index]) return;
    try {
      const res = await api.post('/rounds/verify-clue', { roundNumber: parseInt(num), questionIndex: index, answer: answers[index] });
      if (res.data.correct) {
        if (num === '3') {
          // Check global game state to see if treasure is already claimed
          const stateRes = await api.get('/rounds/game-state');
          if (stateRes.data.state?.isFirstWinnerFound) {
            setRd3Outcome('LATE');
            setChestOpened(true);
            setRd3Stage('OUTCOME');
          } else {
            setRd3Stage('DISCOVERY');
          }
          const updatedTeam = await api.get('/teams/my-team');
          setTeam(updatedTeam.data.team);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setShowDigit({ digit: res.data.digit, index });
          const updatedTeam = await api.get('/teams/my-team');
          setTeam(updatedTeam.data.team);
        }
      } else {
        setNotification({ msg: res.data.message || 'That is not the correct answer, pirate!', type: 'err' });
      }
    } catch (err) {
      setNotification({ msg: `⚓ ${err.response?.data?.message || 'Communication error with the ship!'}`, type: 'err' });
    }
  };

  /* ── Hint System ── */
  const requestHint = (index) => {
    if (hintsUsed.includes(index)) return; // already revealed
    if (hintsRemaining <= 0) {
      setNotification({ msg: '🚫 Your team has already used the maximum number of hints.', type: 'err' });
      return;
    }
    setHintModal({ index });
  };

  const confirmHint = async () => {
    if (!hintModal) return;
    const { index } = hintModal;
    setHintLoading(true);
    try {
      const res = await api.post('/rounds/use-hint', { questionIndex: index });
      setRevealedHints(prev => ({ ...prev, [index]: res.data.hint }));
      setHintsUsed(res.data.hintsUsed);
      setHintsRemaining(res.data.hintsRemaining);
      setHintModal(null);
    } catch (err) {
      const d = err.response?.data;
      if (d?.hintsUsed) {
        setHintsUsed(d.hintsUsed);
        setHintsRemaining(2 - d.hintsUsed.length);
      }
      setHintModal(null);
      setNotification({ msg: d?.message || 'Could not use hint.', type: 'err' });
    } finally {
      setHintLoading(false);
    }
  };

  /* ── Unlock Round 3 ── */
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
      if (err.response?.data) {
        const d = err.response.data;
        if (d.eliminated) user.isEliminated = true;
        if (d.attemptsLeft !== undefined) user.round3PinAttempts = 3 - d.attemptsLeft;
        else user.round3PinAttempts = (user.round3PinAttempts || 0) + 1;
      }
      if (err.response?.status === 403 || err.response?.status === 400) {
        const updatedTeam = await api.get('/teams/my-team');
        setTeam(updatedTeam.data.team);
      }
      setNotification({ msg: err.response?.data?.message || 'Unlock failed!', type: 'err' });
    } finally { setUnlocking(false); }
  };

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const res = await api.post(`/rounds/${num}/submit`, { answers, timeTaken });
      setResult(res.data); setSubmitted(true);
    } catch (err) { setError(err.response?.data?.message || 'Submission failed!'); }
  }, [answers, num, startTime, submitted]);

  // ── Round 3: Verify Final Riddle ──
  const handleVerifyFinal = async () => {
    if (!rd3FinalAnswer) return;
    setFinalRiddleError('');
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const res = await api.post('/rounds/verify-final', { 
        answer: rd3FinalAnswer,
        answers: answers,
        timeTaken: timeTaken
      });
      if (res.data.correct) {
        setRd3Outcome(res.data.status);
        setRd3Stage('OUTCOME');
        if (res.data.status === 'WINNER') {
          setTimeout(() => setChestOpened(true), 500);
        }
        setSubmitted(true);
      } else {
        setFinalRiddleError('⚓ That word does not unlock the treasure. Re-read the riddle!');
      }
    } catch (err) {
      setNotification({ msg: '⚓ Error communicating with the treasure vault!', type: 'err' });
    }
  };

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(tt => tt - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted, handleSubmit]);

  const formatTime = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const timerWarning = timeLeft !== null && timeLeft < 60;

  if (loading) return (<><style>{KEYFRAMES}</style><Navbar /><div style={{ paddingTop: 140, textAlign: 'center', fontFamily: "'Share Tech Mono',monospace", color: '#c9a84c', letterSpacing: 4 }}>DECODING THE TRIAL...</div></>);
  if (error) return (<><style>{KEYFRAMES}</style><Navbar /><div style={{ paddingTop: 140, textAlign: 'center', color: '#ff8080', fontFamily: "'Share Tech Mono',monospace" }}>{error}</div></>);

  /* ─── Sub-components ─── */
  const NotificationModal = ({ note, onClose }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1510, #0a0a0a)', border: `2px solid ${note.type === 'err' ? '#ff4d4d' : C.gold}`, padding: 40, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 30px ${note.type === 'err' ? 'rgba(255,77,77,0.2)' : 'rgba(240,192,64,0.1)'}`, borderRadius: 4 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>{note.type === 'err' ? '🚫' : note.type === 'success' ? '✅' : '⚓'}</div>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", color: note.type === 'err' ? '#ff4d4d' : C.gold, fontSize: 22, marginBottom: 16, letterSpacing: 2 }}>{note.type === 'err' ? 'STAY BACK!' : note.type === 'success' ? 'TRIUMPH!' : 'PARROT SAYS:'}</div>
        <p style={{ color: '#d4b896', lineHeight: 1.6, fontSize: 15, marginBottom: 30 }}>{note.msg}</p>
        <button className="btn-primary" onClick={onClose} style={{ width: '100%', background: note.type === 'err' ? '#ff4d4d' : '', border: note.type === 'err' ? '#ff4d4d' : '' }}>UNDERSTOOD</button>
      </div>
    </div>
  );

  /* ── Hint Warning Modal ── */
  const HintWarningModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(16px)' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1208, #0a0800)', border: `2px solid ${C.amber}`, padding: '48px 40px', maxWidth: 480, width: '90%', textAlign: 'center', borderRadius: 8, boxShadow: `0 24px 80px rgba(0,0,0,0.9), 0 0 40px rgba(255,179,71,0.15)` }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⚠️</div>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", color: C.amber, fontSize: 22, marginBottom: 16, letterSpacing: 2 }}>USE A HINT?</div>
        <p style={{ color: '#d4b896', lineHeight: 1.7, fontSize: 15, marginBottom: 12 }}>
          Using a hint will deduct <strong style={{ color: C.amber }}>50% of the marks</strong> for this clue from you and your entire team.
        </p>
        <p style={{ color: '#ff8080', fontFamily: C.mono, fontSize: 13, marginBottom: 32, padding: '10px 16px', background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 4 }}>
          ⚠️ Your team can only use a maximum of <strong>2 hints</strong> per round.<br />
          <strong>{hintsRemaining} hint{hintsRemaining !== 1 ? 's' : ''} remaining.</strong>
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setHintModal(null)} disabled={hintLoading}
            className="btn-secondary" style={{ flex: 1, padding: '14px 0', fontSize: 14, letterSpacing: 2 }}>
            ✕ CANCEL
          </button>
          <button onClick={confirmHint} disabled={hintLoading}
            className="btn-primary" style={{ flex: 1, padding: '14px 0', fontSize: 14, letterSpacing: 2, background: C.amber, opacity: hintLoading ? 0.7 : 1 }}>
            {hintLoading ? '...' : '✓ USE HINT'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Hint Card ── */
  const HintCard = ({ hintText, index }) => (
    <div style={{
      marginTop: 16, marginLeft: 68, padding: '18px 24px',
      background: 'linear-gradient(135deg, rgba(255,179,71,0.07), rgba(255,179,71,0.03))',
      border: `1px solid rgba(255,179,71,0.35)`,
      borderLeft: `4px solid ${C.amber}`,
      borderRadius: 6,
      animation: 'hintSlideUp 0.4s ease, hintGlow 2.5s ease-in-out 0.4s infinite',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.amber, letterSpacing: 4, fontWeight: 700 }}>HINT REVEALED — 50% DEDUCTION APPLIED</span>
      </div>
      <p style={{ color: '#f5d78e', fontSize: 15, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{hintText}</p>
    </div>
  );

  /* ── Round 3: Premium Treasure Chest Component (Pure CSS/SVG) ── */
  const TreasureChest = ({ isOpened, onClick, stage, isEmpty }) => {
    const isClickable = stage === 'DISCOVERY' || (stage === 'OUTCOME' && !isOpened);

    return (
      <div style={{ position: 'relative', width: '100%', height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isClickable ? 'pointer' : 'default', perspective: 1200 }} onClick={onClick}>
        
        {/* Background Atmosphere */}
        <div style={{ position: 'absolute', width: 600, height: 600, background: 'radial-gradient(circle, rgba(240,192,64,0.1) 0%, transparent 70%)', borderRadius: '50%', animation: 'haloPulse 4s infinite ease-in-out' }} />
        <div style={{ position: 'absolute', width: 800, height: 800, background: 'repeating-conic-gradient(from 0deg, transparent 0deg 15deg, rgba(240,192,64,0.03) 15deg 30deg)', borderRadius: '50%', animation: 'rayRotate 30s linear infinite' }} />

        {/* The 3D Chest Model */}
        <div style={{ 
          position: 'relative', width: 340, height: 240, 
          transformStyle: 'preserve-3d',
          transition: 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isOpened ? 'translateY(-20px) rotateY(0deg)' : 'translateY(0) rotateY(0deg)',
          animation: !isOpened ? 'chestFloat 4s infinite ease-in-out' : 'none'
        }}>
          
          {/* Internal Treasure (Glow that appears when opened) */}
          {!isEmpty && (
            <div style={{ 
              position: 'absolute', inset: '20px', background: 'radial-gradient(circle, #fff 0%, #f0c040 60%, transparent 100%)',
              opacity: isOpened ? 1 : 0, transition: 'opacity 0.5s 0.3s',
              boxShadow: '0 -20px 60px rgba(240,192,64,0.8)',
              transform: 'translateZ(-10px)',
              filter: 'blur(15px)',
              animation: 'goldGlow 2s infinite ease-in-out'
            }} />
          )}

          {/* Lid (Top Part) */}
          <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '50%', 
            transformStyle: 'preserve-3d', originY: 'bottom',
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpened ? 'rotateX(-120deg)' : 'rotateX(0deg)',
            zIndex: 20
          }}>
            {/* Lid Front Face */}
            <div style={{ 
              position: 'absolute', inset: 0, 
              background: 'linear-gradient(180deg, #4d3319 0%, #332211 100%)',
              border: `4px solid ${C.gold}`,
              borderRadius: '20px 20px 0 0',
              boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.5)'
            }}>
              {/* Gold Strips on Lid */}
              <div style={{ position: 'absolute', left: '20%', width: 12, height: '100%', background: C.gold, opacity: 0.6 }} />
              <div style={{ position: 'absolute', right: '20%', width: 12, height: '100%', background: C.gold, opacity: 0.6 }} />
              {/* Lock (Keyhole) */}
              <div style={{ 
                position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)',
                width: 44, height: 54, background: C.gold, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 30
              }}>
                <div style={{ width: 10, height: 20, background: '#1a1208', borderRadius: 40 }} />
              </div>
            </div>
          </div>

          {/* Chest Body (Bottom Part) */}
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', 
            background: 'linear-gradient(180deg, #332211 0%, #1a1208 100%)',
            border: `4px solid ${C.gold}`,
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            transform: 'translateZ(-1px)'
          }}>
             {/* Gold Rivets and Strips */}
             <div style={{ position: 'absolute', left: '20%', width: 12, height: '100%', background: C.gold, opacity: 0.3 }} />
             <div style={{ position: 'absolute', right: '20%', width: 12, height: '100%', background: C.gold, opacity: 0.3 }} />
             {/* Sparkle effects on gold edges (only if not empty) */}
             {!isEmpty && (
               <>
                 <div style={{ position: 'absolute', top: -5, left: '10%', width: 4, height: 4, background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #fff', animation: 'sparkle 1.5s infinite 0.2s' }} />
                 <div style={{ position: 'absolute', bottom: 10, right: '15%', width: 3, height: 3, background: '#fff', borderRadius: '50%', boxShadow: '0 0 8px #fff', animation: 'sparkle 2s infinite 0.8s' }} />
               </>
             )}
          </div>
        </div>

        {/* Label Overlay */}
        <div style={{ position: 'absolute', bottom: 0, fontFamily: "'Cinzel Decorative',serif", color: C.gold, fontSize: 24, letterSpacing: 4, textShadow: '0 0 20px rgba(240,192,64,0.4)', textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
           {isOpened ? (isEmpty ? 'ALREADY PLUNDERED' : 'THE TREASURE IS YOURS!') : (stage === 'DISCOVERY' ? 'CLICK TO UNLOCK' : '')}
        </div>
      </div>
    );
  };

  /* ── Round 3: Final Riddle Modal ── */
  const FinalRiddleModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(30px)' }}>
      <div style={{ background: 'linear-gradient(145deg, #1a1208, #050505)', border: `2px solid ${C.gold}`, padding: '60px 50px', maxWidth: 540, width: '90%', textAlign: 'center', borderRadius: 8, boxShadow: `0 30px 100px rgba(0,0,0,1), 0 0 60px rgba(240,192,64,0.1)` }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>📜</div>
        <h2 style={{ fontFamily: "'Cinzel Decorative',serif", color: C.gold, fontSize: 28, marginBottom: 24, letterSpacing: 3 }}>FINAL TREASURE RIDDLE</h2>
        <p style={{ color: '#d4b896', fontSize: 18, lineHeight: 1.8, fontStyle: 'italic', marginBottom: 32 }}>
          "Where <strong style={{color: C.gold, letterSpacing: 2}}>STUDENTS</strong> gather before and after class, <br/>
          Where conversations and laughter pass. <br/>
          Food and drinks bring energy anew, <br/>
          Your treasure patiently waits for you."
        </p>
        <div style={{ marginBottom: 30 }}>
            <input type="text" style={sx.input} placeholder="ENTER FINAL LOCATION..." value={rd3FinalAnswer} 
                   onChange={e => setRd3FinalAnswer(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleVerifyFinal()} autoFocus />
            {finalRiddleError && <p style={{ color: '#ff5c5c', fontSize: 13, marginTop: 12, fontFamily: C.mono }}>{finalRiddleError}</p>}
        </div>
        <button className="btn-primary" style={{ width: '100%' }} onClick={handleVerifyFinal}>SOLVE THE PUZZLE</button>
      </div>
    </div>
  );

  /* ── Hint Button ── */
  const HintButton = ({ index }) => {
    const alreadyUsed = hintsUsed.includes(index);
    const limitReached = hintsRemaining <= 0 && !alreadyUsed;
    const disabled = alreadyUsed || limitReached;

    return (
      <div style={{ marginLeft: 68, marginTop: 10 }}>
        {disabled ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: 'rgba(120,120,120,0.08)', border: '1px solid rgba(120,120,120,0.25)', borderRadius: 4, color: '#666', fontFamily: C.mono, fontSize: 11, letterSpacing: 2 }}>
            🔒 {alreadyUsed ? 'HINT USED FOR THIS CLUE' : 'TEAM HINT LIMIT REACHED'}
          </div>
        ) : (
          <button onClick={() => requestHint(index)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px',
            background: 'rgba(255,179,71,0.08)', border: `1px solid rgba(255,179,71,0.35)`,
            borderRadius: 4, color: C.amber, fontFamily: C.mono, fontSize: 11, letterSpacing: 2,
            cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,179,71,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,179,71,0.08)'; }}>
            💡 USE HINT <span style={{ opacity: 0.7 }}>(-50% marks)</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <Navbar />
      {notification && <NotificationModal note={notification} onClose={() => setNotification(null)} />}
      {hintModal && <HintWarningModal />}
      
      {/* Digit Reveal Popup (Round 2 only) */}
      {showDigit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }} onClick={() => setShowDigit(null)}>
          <div style={{ background: 'radial-gradient(circle at center, #1a1510 0%, #050505 100%)', border: `1px solid ${C.gold}`, padding: '80px 100px', textAlign: 'center', boxShadow: '0 0 100px rgba(240,192,64,0.2)', position: 'relative', borderRadius: 4 }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 24, right: 24, cursor: 'pointer', color: C.textMid, fontSize: 20 }} onClick={() => setShowDigit(null)}>✕</div>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textMid, letterSpacing: 6, marginBottom: 32 }}>CLUE {showDigit.index + 1} DECODED</div>
            <div style={{ fontSize: 160, color: '#fff', fontFamily: "'Cinzel Decorative',serif", textShadow: `0 0 50px ${C.gold}, 0 0 100px ${C.gold}`, lineHeight: 1 }}>{showDigit.digit}</div>
            <div style={{ width: 80, height: 2, background: C.gold, margin: '40px auto' }} />
            <div style={{ color: '#d4b896', fontStyle: 'italic', fontSize: 18, letterSpacing: 1 }}>"A fragment of the secret code. Keep it safe."</div>
            <button className="btn-primary" onClick={() => setShowDigit(null)} style={{ marginTop: 56, padding: '16px 48px', letterSpacing: 3 }}>CONTINUE THE HUNT</button>
          </div>
        </div>
      )}

      <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh', background: C.surface }}>
        <div className="container" style={{ maxWidth: 860 }}>

          {/* Elimination Card */}
          {(user?.isEliminated || team?.isEliminated) && (
            <div style={{ background: 'radial-gradient(circle at center, rgba(30,10,10,0.98) 0%, rgba(5,0,0,1) 100%)', border: '2px solid #ff4d4d', padding: 80, textAlign: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(25px)' }}>
              <div style={{ fontSize: 180, marginBottom: 40, filter: 'drop-shadow(0 0 50px rgba(255,77,77,0.7))', animation: 'float 3s ease-in-out infinite' }}>💀</div>
              <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 72, color: '#ff4d4d', marginBottom: 20, letterSpacing: 8, textShadow: '0 0 30px rgba(255,77,77,0.3)' }}>ELIMINATED</h1>
              <div style={{ width: 120, height: 2, background: '#ff4d4d', marginBottom: 40 }} />
              <p style={{ color: '#d4b896', fontSize: 24, maxWidth: 700, fontStyle: 'italic', lineHeight: 1.8, letterSpacing: 1 }}>"You or your crew failed the master lock. Your journey is over, pirate."</p>
              <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: 60, padding: '20px 60px', background: 'transparent', border: '2px solid #ff4d4d', color: '#ff4d4d', fontSize: 18, letterSpacing: 4 }}>ABANDON SHIP</button>
            </div>
          )}

          {/* Round 3 Lock Card */}
          {num === '3' && team && !team.round3Unlocked && !user?.isEliminated && !team?.isEliminated && (
            <div style={{ background: 'linear-gradient(135deg,rgba(25,20,15,0.98),rgba(0,0,0,1))', border: `1px solid ${C.goldDim}`, padding: 60, textAlign: 'center', marginBottom: 48, boxShadow: '0 40px 100px rgba(0,0,0,1)', position: 'relative', borderRadius: 2 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />
              <div style={{ fontSize: 64, marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(240,192,64,0.3))' }}>🔒</div>
              <h2 style={{ fontFamily: "'Cinzel Decorative',serif", color: '#f0d080', fontSize: 32, marginBottom: 12, letterSpacing: 3 }}>Master Number Lock</h2>
              <p style={{ color: '#8a6a1e', fontSize: 12, marginBottom: 48, letterSpacing: 4, fontWeight: 700 }}>VERIFY YOUR CREW'S FINDINGS FROM TRIAL II</p>

              <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginBottom: 48 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ width: 64, height: 88, background: 'rgba(240,192,64,0.03)', border: `2px solid ${pinEntry.length > i ? C.gold : 'rgba(240,192,64,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: C.gold, fontFamily: C.mono, boxShadow: pinEntry.length > i ? `0 0 15px ${C.goldDim}` : 'none', transition: 'all 0.2s' }}>
                    {pinEntry[i] || ''}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 84px)', gap: 16, justifyContent: 'center', marginBottom: 48 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(key => (
                  <button key={key} onClick={() => {
                    if (key === 'C') setPinEntry('');
                    else if (key === 'OK') handleUnlock();
                    else if (pinEntry.length < 5) setPinEntry(p => p + key);
                  }} style={{ height: 84, borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(240,192,64,0.02)', color: C.gold, fontSize: 22, fontFamily: C.mono, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,192,64,0.08)'; e.currentTarget.style.borderColor = C.gold; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(240,192,64,0.02)'; e.currentTarget.style.borderColor = C.border; }}>
                    {key}
                  </button>
                ))}
              </div>

              <div style={{ color: '#ff8080', fontSize: 13, letterSpacing: 4, fontFamily: C.mono, fontWeight: 700 }}>
                ⚠️ {3 - (user?.round3PinAttempts || 0)} ATTEMPTS REMAINING
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textMid, letterSpacing: 5, marginBottom: 10 }}>TRIAL {num} OF III</div>
              <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(28px,5vw,48px)', color: C.gold, textShadow: '0 0 40px rgba(240,192,64,0.2)', marginBottom: 0 }}>{round?.title}</h1>
              <p style={{ fontStyle: 'italic', color: '#d4b896', marginTop: 12, fontSize: 18, opacity: 0.8 }}>{round?.description}</p>
            </div>
            {!submitted && timeLeft !== null && (
              <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${timerWarning ? 'rgba(255,128,128,0.3)' : C.border}`, padding: '24px 32px', textAlign: 'center', minWidth: 160, backdropFilter: 'blur(10px)' }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: timerWarning ? '#ff8080' : C.textMid, letterSpacing: 4, marginBottom: 10 }}>⌛ TRIAL TIME</div>
                <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 40, color: timerWarning ? '#ff8080' : C.gold, animation: timerWarning ? 'glowPulse 0.5s infinite' : undefined }}>{formatTime(timeLeft)}</div>
              </div>
            )}
          </div>

          {/* Round 2: Hints Banner */}
          {num === '2' && !submitted && (
            <div style={{ marginBottom: 24, padding: '14px 20px', background: hintsRemaining > 0 ? 'rgba(255,179,71,0.06)' : 'rgba(120,120,120,0.06)', border: `1px solid ${hintsRemaining > 0 ? 'rgba(255,179,71,0.3)' : 'rgba(120,120,120,0.2)'}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>💡</span>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: hintsRemaining > 0 ? C.amber : '#777', letterSpacing: 3, fontWeight: 700 }}>HINT SYSTEM</div>
                  <div style={{ fontSize: 13, color: '#d4b896', marginTop: 2 }}>Using a hint costs <strong style={{ color: C.amber }}>50% of that clue's marks</strong>.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: hintsUsed.length > i ? 'rgba(255,92,92,0.15)' : 'rgba(255,179,71,0.12)', border: `2px solid ${hintsUsed.length > i ? '#ff5c5c' : C.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {hintsUsed.length > i ? '✗' : '💡'}
                  </div>
                ))}
                <span style={{ fontFamily: C.mono, fontSize: 12, color: hintsRemaining > 0 ? C.amber : '#ff5c5c', fontWeight: 700, marginLeft: 4 }}>
                  {hintsRemaining} HINT{hintsRemaining !== 1 ? 'S' : ''} LEFT
                </span>
              </div>
            </div>
          )}

          {/* Round 2: Digit Tracker */}
          {num === '2' && team && team.round2Digits && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 48 }}>
              {team.round2Digits.map((d, i) => (
                <div key={i} style={{ width: 48, height: 64, background: 'rgba(240,192,64,0.03)', border: `2px solid ${d === '?' ? 'rgba(240,192,64,0.1)' : '#c9a84c'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: d === '?' ? '#4a3a1a' : C.gold, fontSize: 28, fontFamily: C.mono, textShadow: d !== '?' ? `0 0 15px ${C.goldDim}` : 'none' }}>{d}</div>
              ))}
            </div>
          )}

          {/* Result */}
          {submitted && result && (
            <div style={{ background: 'linear-gradient(135deg,rgba(30,25,20,0.9),rgba(10,10,10,0.95))', border: `2px solid ${C.goldDim}`, padding: '80px 40px', textAlign: 'center', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', borderRadius: 2 }}>
              <div style={{ fontSize: 88, marginBottom: 24, filter: 'drop-shadow(0 0 30px rgba(240,192,64,0.4))' }}>{result.score >= 60 ? '🏆' : result.score >= 30 ? '⚔️' : '☠️'}</div>
              <h2 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 32, color: C.gold, marginBottom: 16, letterSpacing: 4 }}>{result.score >= 60 ? 'TREASURE FOUND!' : 'TRIAL CONCLUDED'}</h2>
              <p style={{ fontStyle: 'italic', color: '#d4b896', fontSize: 20, marginBottom: 48, opacity: 0.9 }}>{result.message}</p>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 110, color: C.gold, textShadow: '0 0 50px rgba(240,192,64,0.5)', lineHeight: 0.9 }}>{result.score}</div>
              <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textMid, letterSpacing: 6, marginTop: 20, marginBottom: 48 }}>DOUBLOONS EARNED</div>
              {num === '2' && hintsUsed.length > 0 && (
                <div style={{ fontSize: 12, color: '#aaa', fontFamily: C.mono, marginBottom: 32, padding: '10px 20px', background: 'rgba(255,179,71,0.06)', border: '1px solid rgba(255,179,71,0.2)', borderRadius: 4 }}>
                  💡 {hintsUsed.length} hint{hintsUsed.length !== 1 ? 's' : ''} used — 50% deduction applied to hinted clues.
                </div>
              )}
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ padding: '16px 44px' }}>BACK TO SHIP</button>
              </div>
            </div>
          )}

          {submitted && !result && num !== '3' && (
            <div style={{ background: 'rgba(240,192,64,0.03)', border: `1px solid ${C.border}`, padding: '60px', textAlign: 'center', borderRadius: 2 }}>
              <p style={{ fontSize: 56, marginBottom: 20 }}>📜</p>
              <h2 style={{ fontFamily: "'Cinzel Decorative',serif", color: C.gold, marginBottom: 16, letterSpacing: 3 }}>TRIAL ALREADY SEALED</h2>
              <p style={{ fontStyle: 'italic', color: '#d4b896', marginBottom: 36, fontSize: 18 }}>Your crew has already logged an entry for this trial.</p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')}>RETURN TO DECK</button>
            </div>
          )}

          {/* Round 3 Multi-Stage UI */}
          {num === '3' && team?.round3Unlocked && (
            <div style={{ marginTop: 20 }}>
              {/* Discovery Stage */}
              {rd3Stage === 'DISCOVERY' && (
                <div style={{ padding: '40px 0', animation: 'fadeUp 1.2s ease-out' }}>
                  <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <h2 style={{ fontFamily: "'Cinzel Decorative',serif", color: C.gold, fontSize: 32, letterSpacing: 4, marginBottom: 16 }}>TREASURE DISCOVERED!</h2>
                    <p style={{ color: '#d4b896', fontSize: 18, fontStyle: 'italic', maxWidth: 600, margin: '0 auto' }}>“Your logic was sound, pirate. The legendary chest has appeared from the depths. Click the chest to unlock the final puzzle.”</p>
                  </div>
                  <div style={{ background: 'radial-gradient(circle at center, rgba(20,15,5,0.8) 0%, transparent 70%)', paddingBottom: 60 }}>
                    <TreasureChest stage="DISCOVERY" onClick={() => {
                       setChestOpened(true);
                       setTimeout(() => setRd3Stage('FINAL_PUZZLE'), 1500);
                    }} isOpened={chestOpened} />
                  </div>
                </div>
              )}

              {/* Final Puzzle Stage (Covered by FinalRiddleModal component below in the return) */}
              {rd3Stage === 'FINAL_PUZZLE' && <FinalRiddleModal />}

              {/* Outcome Stage */}
              {rd3Stage === 'OUTCOME' && (
                <div style={{ padding: '40px 0', textAlign: 'center', animation: 'fadeUp 1.5s ease-out' }}>
                  <div style={{ marginBottom: 40 }}>
                    <TreasureChest isOpened={chestOpened} stage="OUTCOME" isEmpty={rd3Outcome === 'LATE'} />
                  </div>
                  <div style={{ marginTop: 20 }}>
                    {rd3Outcome === 'WINNER' ? (
                      <div style={{ animation: 'fadeUp 1s ease' }}>
                        <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
                        <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 52, color: C.gold, marginBottom: 20, letterSpacing: 6, textShadow: '0 0 30px rgba(240,192,64,0.4)' }}>HOORAY! YOU FOUND THE TREASURE!</h1>
                        <p style={{ color: '#d4b896', fontSize: 22, fontStyle: 'italic', letterSpacing: 1 }}>"The gold, the glory, and the title of Master Pirate are yours, Captain!"</p>
                      </div>
                    ) : (
                      <div style={{ animation: 'fadeUp 1s ease' }}>
                        <div style={{ fontSize: 64, marginBottom: 20 }}>☠️</div>
                        <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 48, color: '#ff5c5c', marginBottom: 20, letterSpacing: 4 }}>YOU'RE LATE, KIDDOS!</h1>
                        <p style={{ color: '#d4b896', fontSize: 20, fontStyle: 'italic' }}>"Another crew reached the vault first. The treasure has been plundered!"</p>
                      </div>
                    )}
                    <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: 60, padding: '20px 50px', letterSpacing: 4 }}>RETURN TO THE DOCK</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions */}
          {(num !== '3' || (team?.round3Unlocked && rd3Stage === 'QUESTION')) && !submitted && round?.questions?.map((q, i) => (
            <div key={q._id || i} style={{ background: 'rgba(240,192,64,0.02)', border: `1px solid ${C.border}`, padding: '36px', marginBottom: 24, borderRadius: 4, position: 'relative', transition: 'all 0.3s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(240,192,64,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
                <div style={{ width: 44, height: 44, border: `1px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative',serif", fontSize: 18, color: C.gold, flexShrink: 0, background: 'rgba(240,192,64,0.05)' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{ background: 'rgba(240,192,64,0.08)', border: `1px solid ${C.goldDim}`, padding: '3px 12px', fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: 2, fontWeight: 700 }}>{q.type?.toUpperCase()}</span>
                    <span style={{ background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,128,128,0.2)', padding: '3px 12px', fontFamily: C.mono, fontSize: 10, color: '#ff8080', letterSpacing: 2, fontWeight: 700 }}>{q.points} PTS</span>
                    {num === '2' && hintsUsed.includes(i) && (
                      <span style={{ background: 'rgba(255,179,71,0.1)', border: '1px solid rgba(255,179,71,0.3)', padding: '3px 12px', fontFamily: C.mono, fontSize: 10, color: C.amber, letterSpacing: 2, fontWeight: 700 }}>💡 HINT USED (-50%)</span>
                    )}
                  </div>
                  <p style={{ fontSize: 20, color: '#f5e9c8', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-line' }}>{q.text}</p>
                </div>
              </div>

              {q.type === 'mcq' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginLeft: 68 }}>
                  {q.options.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', border: `1px solid ${answers[i] === opt ? 'rgba(240,192,64,0.5)' : 'rgba(240,192,64,0.1)'}`, background: answers[i] === opt ? 'rgba(240,192,64,0.05)' : 'transparent', transition: 'all 0.2s', borderRadius: 4 }}>
                      <input type="radio" name={`q${i}`} value={opt} checked={answers[i] === opt} onChange={() => setAnswers(p => { const a = [...p]; a[i] = opt; return a; })} style={{ display: 'none' }} />
                      <div style={{ width: 18, height: 18, border: `1px solid ${answers[i] === opt ? C.gold : C.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        {answers[i] === opt && <div style={{ width: 10, height: 10, background: C.gold }} />}
                      </div>
                      <span style={{ fontSize: 17, color: answers[i] === opt ? C.gold : '#d4b896', fontWeight: answers[i] === opt ? 600 : 400 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ marginLeft: 68 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <input type="text" style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: `1px solid ${C.border}`, borderBottom: `2px solid ${C.goldDim}`, color: '#f5e9c8', padding: '16px 20px', fontFamily: C.mono, fontSize: 16, outline: 'none', transition: 'all 0.3s' }}
                      placeholder="ENTER YOUR ANSWER..." value={answers[i]}
                      onFocus={e => e.target.style.borderColor = 'rgba(240,192,64,0.5)'}
                      onBlur={e => e.target.style.borderColor = C.border}
                      onChange={e => setAnswers(p => { const a = [...p]; a[i] = e.target.value; return a; })} />

                    {num === '2' && i < 5 && (
                      <button className="btn-secondary" onClick={() => verifyClue(i)} style={{ padding: '0 24px', whiteSpace: 'nowrap', fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
                        ⚓ REVEAL DIGIT
                      </button>
                    )}
                  </div>

                  {/* Hint Button (Round 2 only) */}
                  {num === '2' && <HintButton index={i} />}

                  {/* Hint Reveal Card */}
                  {num === '2' && revealedHints[i] && <HintCard hintText={revealedHints[i]} index={i} />}
                </div>
              )}
            </div>
          ))}

          {/* Sticky Submit */}
          {((num !== '3' || (team?.round3Unlocked && rd3Stage === 'QUESTION'))) && !submitted && (
            <div style={{ position: 'sticky', bottom: 32, background: 'rgba(10,8,5,0.98)', border: `1px solid ${C.goldDim}`, padding: '20px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(15px)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', zIndex: 100, borderRadius: 2 }}>
              <span style={{ fontFamily: C.mono, fontSize: 13, color: '#8a6a1e', letterSpacing: 3, fontWeight: 700 }}>
                {num === '3' ? 'FINAL CHALLENGE' : `${answers.filter(Boolean).length}/${round?.questions?.length} CLUES SEALED`}
              </span>
              <button className="btn-primary" onClick={num === '3' ? () => verifyClue(0) : handleSubmit} style={{ padding: '16px 52px', fontSize: 15, letterSpacing: 4 }}>
                {num === '3' ? 'SOLVE LOGIC' : '🏴‍☠️ SUBMIT LOG'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
