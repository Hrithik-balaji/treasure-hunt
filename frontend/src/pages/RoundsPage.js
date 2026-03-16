import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const ROUND_META = {
  1: { icon: '📜', label: 'Technical Quiz',         duration: '15m', desc: 'Python, networking, data structures, and logical thinking.' },
  2: { icon: '🗺️', label: 'Technical Clue Hunt',    duration: '20m', desc: 'Binary, ciphers, debugging, and sequential logic.' },
  3: { icon: '💎', label: 'Final Master Challenge',  duration: '30m', desc: 'Recursion, algorithms, pattern recognition, and code ordering.' },
};

export default function RoundsPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isAdmin   = user?.role === 'admin';

  const [rounds,  setRounds]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null); // roundNumber being toggled

  // ── fetch rounds ────────────────────────────────────
  useEffect(() => {
    // Admins see all rounds (open + closed); players only see open ones.
    // The backend already handles this via the isOpen filter for non-admins,
    // but we want admins to see locked rounds too, so we call the same endpoint
    // and merge with full round list knowledge.
    api.get('/rounds')
      .then(res => {
        const fetched = res.data.rounds || [];

        if (isAdmin) {
          // Admin: ensure all 3 rounds are shown even if not yet seeded.
          // Fill in stubs for missing rounds so the UI always shows 3 cards.
          const byNum = {};
          fetched.forEach(r => { byNum[r.roundNumber] = r; });
          const merged = [1, 2, 3].map(n => byNum[n] || {
            roundNumber: n,
            title:           ROUND_META[n].label,
            description:     ROUND_META[n].desc,
            durationMinutes: parseInt(ROUND_META[n].duration),
            isOpen:          false,
            _stub:           true,
          });
          setRounds(merged);
        } else {
          // Players: backend only returns isOpen rounds; we show all 3 but
          // mark locked ones that weren't returned.
          const openNums = new Set(fetched.map(r => r.roundNumber));
          const merged = [1, 2, 3].map(n => {
            if (openNums.has(n)) return fetched.find(r => r.roundNumber === n);
            return {
              roundNumber: n,
              title:           ROUND_META[n].label,
              description:     ROUND_META[n].desc,
              durationMinutes: parseInt(ROUND_META[n].duration),
              isOpen:          false,
              _locked:         true,
            };
          });
          setRounds(merged);
        }
      })
      .catch(() => {
        // Fallback: show all as locked
        setRounds([1, 2, 3].map(n => ({
          roundNumber: n, title: ROUND_META[n].label,
          description: ROUND_META[n].desc, isOpen: false, _locked: true,
        })));
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  // ── admin: toggle open/closed ────────────────────────
  const handleToggle = async (roundNumber) => {
    setToggling(roundNumber);
    try {
      const res = await api.patch(`/rounds/${roundNumber}/toggle`);
      // Update local state
      setRounds(prev => prev.map(r =>
        r.roundNumber === roundNumber
          ? { ...r, isOpen: res.data.round?.isOpen ?? !r.isOpen }
          : r
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle round');
    } finally {
      setToggling(null);
    }
  };

  // ── card click ───────────────────────────────────────
  const handleEnter = (round) => {
    if (!round.isOpen) return;
    navigate(`/round/${round.roundNumber}`);
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ paddingTop: 140, textAlign: 'center', fontFamily: "'Share Tech Mono',monospace", color: '#c9a84c', letterSpacing: 4 }}>
        CHARTING THE TRIALS...
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 900 }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: 56, textAlign: 'center' }}>
            <div className="section-label">The Three Trials</div>
            <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(22px,4vw,40px)', color: '#f0d080', textShadow: '0 0 40px rgba(201,168,76,0.3)', marginTop: 14 }}>
              Choose Your Trial
            </h1>
            <p style={{ fontStyle: 'italic', color: '#d4b896', fontSize: 17, marginTop: 8 }}>
              {isAdmin
                ? 'As Captain, you may unlock or lock any trial.'
                : 'Only unlocked trials may be entered. Prove your worth, sailor.'}
            </p>
          </div>

          {/* ── Round cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {rounds.map((round, idx) => {
              const meta     = ROUND_META[round.roundNumber] || {};
              const isOpen   = round.isOpen;
              const isLocked = !isOpen;
              const isBusy   = toggling === round.roundNumber;

              return (
                <div
                  key={round.roundNumber}
                  style={{
                    position:   'relative',
                    background: isLocked
                      ? 'linear-gradient(135deg,rgba(20,15,5,0.7),rgba(10,8,3,0.9))'
                      : 'linear-gradient(135deg,rgba(61,43,14,0.55),rgba(13,10,5,0.85))',
                    border:     `1px solid ${isLocked ? 'rgba(100,80,30,0.2)' : 'rgba(201,168,76,0.35)'}`,
                    padding:    '32px 36px',
                    transition: 'border-color 0.3s, transform 0.3s',
                    cursor:     isLocked && !isAdmin ? 'not-allowed' : 'default',
                    opacity:    isLocked && !isAdmin ? 0.65 : 1,
                    // staggered fade-in
                    animation:  `fadeUp 0.5s ease ${idx * 0.12}s both`,
                  }}
                  onMouseEnter={e => {
                    if (!isLocked || isAdmin) {
                      e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)';
                      e.currentTarget.style.transform   = 'translateY(-3px)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isLocked ? 'rgba(100,80,30,0.2)' : 'rgba(201,168,76,0.35)';
                    e.currentTarget.style.transform   = 'none';
                  }}
                >

                  {/* ── Lock overlay band ── */}
                  {isLocked && (
                    <div style={{
                      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                      display:  'flex', alignItems: 'center', justifyContent: 'flex-end',
                      pointerEvents: 'none', paddingRight: 36,
                    }}>
                      <div style={{
                        fontFamily: "'Share Tech Mono',monospace", fontSize: 42,
                        color: 'rgba(100,80,30,0.25)', letterSpacing: 4,
                      }}>🔒</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>

                    {/* ── Left: info ── */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flex: 1 }}>

                      {/* Round icon */}
                      <div style={{
                        width: 64, height: 64, border: `1px solid ${isLocked ? 'rgba(100,80,30,0.3)' : 'rgba(201,168,76,0.4)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, flexShrink: 0,
                        background: isLocked ? 'rgba(0,0,0,0.3)' : 'rgba(201,168,76,0.05)',
                        filter: isLocked ? 'grayscale(80%)' : 'none',
                      }}>
                        {meta.icon}
                      </div>

                      <div>
                        {/* Trial label */}
                        <div style={{
                          fontFamily: "'Share Tech Mono',monospace", fontSize: 10,
                          color: isOpen ? '#c9a84c' : '#5a4520', letterSpacing: 4, marginBottom: 6,
                        }}>
                          TRIAL {round.roundNumber} OF III &nbsp;·&nbsp;
                          <span style={{ color: isOpen ? '#5cb85c' : '#8b4444' }}>
                            {isOpen ? '⚓ OPEN' : '🔒 LOCKED'}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 style={{
                          fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(16px,2.5vw,22px)',
                          color: isOpen ? '#f0d080' : '#7a6030', marginBottom: 6,
                        }}>
                          {round.title}
                        </h2>

                        {/* Description */}
                        <p style={{ fontStyle: 'italic', color: isOpen ? '#d4b896' : '#5a4520', fontSize: 15, lineHeight: 1.5 }}>
                          {round.description}
                        </p>

                        {/* Duration pill */}
                        <div style={{ marginTop: 10 }}>
                          <span style={{
                            fontFamily: "'Share Tech Mono',monospace", fontSize: 10,
                            color: isOpen ? '#c9a84c' : '#5a4520', letterSpacing: 2,
                            border: `1px solid ${isOpen ? 'rgba(201,168,76,0.3)' : 'rgba(100,80,30,0.2)'}`,
                            padding: '3px 10px',
                          }}>
                            ⌛ {round.durationMinutes || meta.duration} MINUTES
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Right: action buttons ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', justifyContent: 'center', minWidth: 160 }}>

                      {/* Player: Enter button (only if open) */}
                      {!isAdmin && isOpen && (
                        <button
                          className="btn-primary"
                          onClick={() => handleEnter(round)}
                          style={{ padding: '12px 28px', fontSize: 12, letterSpacing: 2, whiteSpace: 'nowrap' }}
                        >
                          Enter Trial {round.roundNumber} →
                        </button>
                      )}

                      {/* Player: locked message */}
                      {!isAdmin && isLocked && (
                        <div style={{
                          fontFamily: "'Share Tech Mono',monospace", fontSize: 11,
                          color: '#5a4520', letterSpacing: 2, textAlign: 'right',
                        }}>
                          AWAITING CAPTAIN
                        </div>
                      )}

                      {/* Admin: toggle + enter */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleToggle(round.roundNumber)}
                            disabled={isBusy}
                            style={{
                              background:   isOpen ? 'rgba(139,26,26,0.25)' : 'rgba(34,100,34,0.25)',
                              border:       `1px solid ${isOpen ? 'rgba(139,26,26,0.6)' : 'rgba(34,139,34,0.6)'}`,
                              color:        isOpen ? '#ff8080' : '#7dc87d',
                              padding:      '11px 22px',
                              fontFamily:   "'Share Tech Mono',monospace",
                              fontSize:     11, letterSpacing: 2, cursor: isBusy ? 'wait' : 'pointer',
                              transition:   'all 0.2s', whiteSpace: 'nowrap',
                              opacity:      isBusy ? 0.6 : 1,
                            }}
                          >
                            {isBusy ? '...' : isOpen ? '🔒 LOCK ROUND' : '🔓 UNLOCK ROUND'}
                          </button>

                          {isOpen && (
                            <button
                              className="btn-secondary"
                              onClick={() => navigate(`/round/${round.roundNumber}`)}
                              style={{ padding: '10px 22px', fontSize: 11, letterSpacing: 2, whiteSpace: 'nowrap' }}
                            >
                              Preview →
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Bottom nav ── */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
              style={{ padding: '13px 32px', fontSize: 12, letterSpacing: 2 }}
            >
              ← Back to Dashboard
            </button>
            {isAdmin && (
              <button
                className="btn-secondary"
                onClick={() => navigate('/leaderboard')}
                style={{ padding: '13px 32px', fontSize: 12, letterSpacing: 2 }}
              >
                🏆 Leaderboard
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
