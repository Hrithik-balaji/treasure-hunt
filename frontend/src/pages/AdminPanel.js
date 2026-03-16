import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';

/* ─────────────────────────────────────────────
   DESIGN SYSTEM  –  Competitive-coding dark theme
   Inspired by Codeforces / Codedrills but
   with the pirate gold accent palette kept
───────────────────────────────────────────── */
const C = {
  bg:        '#0b0d11',
  surface:   '#13161d',
  surfaceHi: '#1a1e28',
  border:    '#252a38',
  borderHi:  '#3a4155',
  gold:      '#f0c040',
  goldDim:   '#a07820',
  goldFaint: 'rgba(240,192,64,0.08)',
  green:     '#3ddc84',
  greenDim:  'rgba(61,220,132,0.12)',
  red:       '#ff5c5c',
  redDim:    'rgba(255,92,92,0.12)',
  blue:      '#4d9fff',
  blueDim:   'rgba(77,159,255,0.12)',
  purple:    '#b57aff',
  text:      '#e8ecf4',
  textMid:   '#8b92a8',
  textDim:   '#4a5068',
  mono:      "'JetBrains Mono', 'Fira Code', monospace",
  sans:      "'Inter', 'Segoe UI', sans-serif",
};

const sx = {
  page: { background: C.bg, minHeight: '100vh', paddingTop: 80, paddingBottom: 60, fontFamily: C.sans, color: C.text },
  wrap: { maxWidth: 1400, margin: '0 auto', padding: '0 24px' },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 },
  badge: (color) => ({ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:4, fontSize:11, fontWeight:600, fontFamily:C.mono, letterSpacing:1, background:`rgba(${color},0.12)`, color:`rgb(${color})`, border:`1px solid rgba(${color},0.25)` }),
  btn: (variant='primary') => ({
    display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.15s', fontFamily:C.sans,
    ...(variant==='primary' ? { background:C.gold, color:'#0b0d11' } :
        variant==='danger'  ? { background:C.redDim, color:C.red, border:`1px solid rgba(255,92,92,0.3)` } :
        variant==='success' ? { background:C.greenDim, color:C.green, border:`1px solid rgba(61,220,132,0.3)` } :
        variant==='ghost'   ? { background:'transparent', color:C.textMid, border:`1px solid ${C.border}` } :
                              { background:C.blueDim, color:C.blue, border:`1px solid rgba(77,159,255,0.3)` }),
  }),
  input: { width:'100%', background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, padding:'9px 12px', fontSize:13, fontFamily:C.sans, outline:'none', boxSizing:'border-box' },
  label: { display:'block', fontSize:12, fontWeight:600, color:C.textMid, marginBottom:6, textTransform:'uppercase', letterSpacing:1 },
  tag: { display:'inline-block', padding:'3px 8px', borderRadius:4, fontSize:11, fontFamily:C.mono },
};

/* ─── tiny helpers ──────────────────────────── */
const Toast = ({ msg, type }) => !msg ? null : (
  <div style={{ position:'fixed', top:80, right:24, zIndex:9999, background: type==='err' ? '#2a1010' : '#0d2a18', border:`1px solid ${type==='err'?C.red:C.green}`, borderRadius:8, padding:'12px 20px', color: type==='err'?C.red:C.green, fontFamily:C.mono, fontSize:13, maxWidth:320, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
    {type==='err'?'✗ ':'✓ '}{msg}
  </div>
);

const Spinner = () => (
  <div style={{ textAlign:'center', padding:60, color:C.textDim, fontFamily:C.mono, letterSpacing:3 }}>LOADING...</div>
);

const StatCard = ({ icon, label, value, sub, color='255,192,64' }) => (
  <div style={{ ...sx.card, padding:'20px 24px', display:'flex', alignItems:'center', gap:16 }}>
    <div style={{ width:44, height:44, borderRadius:10, background:`rgba(${color},0.1)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
    <div>
      <div style={{ fontSize:28, fontWeight:700, fontFamily:C.mono, color:`rgb(${color})`, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:C.textMid, marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{sub}</div>}
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════ */
function OverviewTab({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const handleResetTreasure = async () => {
    setResetting(true);
    try {
      const res = await api.post('/admin/reset-treasure');
      showToast(res.data.message, 'success');
      setShowResetConfirm(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Reset failed', 'err');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    api.get('/admin/overview').then(r => setData(r.data.overview)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <div style={{ color:C.red, fontFamily:C.mono }}>Failed to load overview.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Stat row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
        <StatCard icon="👥" label="Total Players"     value={data.totalPlayers}     color="77,159,255" />
        <StatCard icon="🚢" label="Active Crews"      value={data.activeTeams}      color="61,220,132" sub={`${data.eliminatedTeams} eliminated`} />
        <StatCard icon="🗺️" label="Rounds"            value={data.totalRounds}      color="240,192,64" sub={`${data.openRounds} open`} />
        <StatCard icon="📜" label="Total Submissions" value={data.totalSubmissions}  color="181,122,255" />
        <StatCard icon="⭐" label="Avg Score"         value={data.avgScore}          color="255,180,60" />
        <StatCard icon="👑" label="Admins"            value={data.totalAdmins}       color="255,92,92" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Leaderboard preview */}
        <div style={{ ...sx.card, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>🏆</span>
            <span style={{ fontWeight:700, fontSize:14 }}>Top Teams</span>
          </div>
          {data.topTeams.map((t, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background: i===0?'rgba(240,192,64,0.04)':'transparent' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background: i===0?C.gold:i===1?'#aaa':i===2?'#cd7f32':C.surfaceHi, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color: i<3?'#0b0d11':C.textMid, flexShrink:0 }}>{t.rank}</div>
              <div style={{ flex:1, fontSize:14, fontWeight:600 }}>{t.name}</div>
              <div style={{ fontFamily:C.mono, fontSize:13, color:C.gold }}>{t.score} pts</div>
              <div style={{ fontSize:11, color:C.textDim }}>{t.members}👤</div>
            </div>
          ))}
          {data.topTeams.length === 0 && <div style={{ padding:24, color:C.textDim, textAlign:'center', fontSize:13 }}>No submissions yet</div>}
        </div>

        {/* Recent activity */}
        <div style={{ ...sx.card, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>⚡</span>
            <span style={{ fontWeight:700, fontSize:14 }}>Recent Activity</span>
          </div>
          {data.recentActivity.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.green, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{a.teamName}</div>
                <div style={{ fontSize:11, color:C.textDim }}>submitted Round {a.roundNumber} · {a.score} pts</div>
              </div>
              <div style={{ fontSize:11, color:C.textDim }}>{new Date(a.submittedAt).toLocaleTimeString()}</div>
            </div>
          ))}
          {data.recentActivity.length === 0 && <div style={{ padding:24, color:C.textDim, textAlign:'center', fontSize:13 }}>No activity yet</div>}
        </div>
      </div>

      {/* Round breakdown table */}
      <div style={{ ...sx.card, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontWeight:700, fontSize:14 }}>📊 Round Breakdown</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:C.surfaceHi }}>
                {['Round','Title','Status','Questions','Submissions','Avg Score','Max Score'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:C.textMid, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.roundBreakdown.map(r => (
                <tr key={r.roundNumber} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:'12px 16px', fontFamily:C.mono, color:C.gold }}>#{r.roundNumber}</td>
                  <td style={{ padding:'12px 16px', fontWeight:600 }}>{r.title}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ ...sx.tag, background: r.isOpen?C.greenDim:C.redDim, color: r.isOpen?C.green:C.red }}>
                      {r.isOpen ? '● OPEN' : '○ CLOSED'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', fontFamily:C.mono }}>{r.questionCount}</td>
                  <td style={{ padding:'12px 16px', fontFamily:C.mono }}>{r.submissionsCount}</td>
                  <td style={{ padding:'12px 16px', fontFamily:C.mono, color:C.blue }}>{r.avgScore}</td>
                  <td style={{ padding:'12px 16px', fontFamily:C.mono, color:C.textMid }}>{r.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Experimental / Game State Controls */}
      <div style={{ ...sx.card, padding: '24px', background: 'linear-gradient(135deg, #1a1610, #0d0a05)', border: `1px solid ${C.goldDim}`, marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.gold }}>🏆 Global Treasure Reset</div>
            <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>Clears the first-winner record. Allow new teams to compete for the first-place title.</div>
          </div>
          <button onClick={() => setShowResetConfirm(true)} style={sx.btn('danger')}>
            ↺ RESET TREASURE STATE
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ ...sx.card, padding: 40, maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: C.red, marginBottom: 16 }}>CONFIRM RESET?</div>
            <p style={{ color: C.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 30 }}>
              Are you sure you want to reset the treasure? This will allow it to be claimed again.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowResetConfirm(false)} style={{ ...sx.btn('ghost'), flex: 1 }}>CANCEL</button>
              <button onClick={handleResetTreasure} disabled={resetting} style={{ ...sx.btn('danger'), flex: 1 }}>
                {resetting ? 'RESETTING...' : 'CONFIRM RESET'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROUNDS TAB  –  full CRUD + live question editor
═══════════════════════════════════════════ */
function QuestionEditor({ questions, onChange }) {
  const addQ = () => onChange([...questions, { text:'', type:'text', correctAnswer:'', points:10, hint:'', options:[], order: questions.length+1 }]);
  const removeQ = (i) => onChange(questions.filter((_,idx)=>idx!==i));
  const updateQ = (i, field, val) => { const qs=[...questions]; qs[i]={...qs[i],[field]:val}; onChange(qs); };
  const updateOpt = (qi, oi, val) => { const qs=[...questions]; const opts=[...qs[qi].options]; opts[oi]=val; qs[qi]={...qs[qi],options:opts}; onChange(qs); };
  const addOpt = (qi) => { const qs=[...questions]; qs[qi]={...qs[qi],options:[...(qs[qi].options||[]),'new option']}; onChange(qs); };
  const removeOpt = (qi, oi) => { const qs=[...questions]; qs[qi].options=qs[qi].options.filter((_,idx)=>idx!==oi); onChange(qs); };

  return (
    <div>
      {questions.map((q, i) => (
        <div key={i} style={{ ...sx.card, padding:'16px 20px', marginBottom:12, borderLeft:`3px solid ${C.gold}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontFamily:C.mono, fontSize:12, color:C.gold }}>Q{i+1}</span>
            <div style={{ display:'flex', gap:8 }}>
              <select value={q.type} onChange={e=>updateQ(i,'type',e.target.value)} style={{ ...sx.input, width:'auto', padding:'5px 10px', fontSize:12 }}>
                <option value="text">Text</option>
                <option value="mcq">MCQ</option>
                <option value="code">Code</option>
              </select>
              <button onClick={()=>removeQ(i)} style={sx.btn('danger')}>✕ Remove</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sx.label}>Question Text *</label>
              <textarea value={q.text} onChange={e=>updateQ(i,'text',e.target.value)} rows={2}
                style={{ ...sx.input, resize:'vertical' }} placeholder="Enter question..." />
            </div>
            <div>
              <label style={sx.label}>Correct Answer *</label>
              <input value={q.correctAnswer} onChange={e=>updateQ(i,'correctAnswer',e.target.value)}
                style={sx.input} placeholder="Exact answer (case-insensitive)" />
            </div>
            <div>
              <label style={sx.label}>Points</label>
              <input type="number" value={q.points} onChange={e=>updateQ(i,'points',Number(e.target.value))}
                style={sx.input} min={1} />
            </div>
            <div>
              <label style={sx.label}>Alt Answers (comma-separated)</label>
              <input value={(q.altAnswers||[]).join(', ')} onChange={e=>updateQ(i,'altAnswers',e.target.value.split(',').map(s=>s.trim()).filter(s=>s))}
                style={sx.input} placeholder="e.g. blackboard, dry erase board" />
            </div>
            <div>
              <label style={sx.label}>Unlock Digit (RD2 only)</label>
              <input type="number" value={q.unlockDigit||''} onChange={e=>updateQ(i,'unlockDigit',Number(e.target.value))}
                style={sx.input} min={0} max={9} placeholder="0-9" />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sx.label}>Hint (optional)</label>
              <input value={q.hint||''} onChange={e=>updateQ(i,'hint',e.target.value)}
                style={sx.input} placeholder="Optional hint shown to players" />
            </div>
          </div>
          {q.type === 'mcq' && (
            <div>
              <label style={sx.label}>MCQ Options</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(q.options||[]).map((opt, oi) => (
                  <div key={oi} style={{ display:'flex', gap:8 }}>
                    <input value={opt} onChange={e=>updateOpt(i,oi,e.target.value)} style={{ ...sx.input, flex:1 }} />
                    <button onClick={()=>removeOpt(i,oi)} style={{ ...sx.btn('danger'), padding:'6px 10px' }}>✕</button>
                  </div>
                ))}
                <button onClick={()=>addOpt(i)} style={{ ...sx.btn('ghost'), alignSelf:'flex-start' }}>+ Add Option</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={addQ} style={{ ...sx.btn('ghost'), width:'100%', justifyContent:'center', padding:12 }}>
        + Add Question
      </button>
    </div>
  );
}

function RoundEditor({ round, onSave, onCancel }) {
  const [form, setForm] = useState({ title: round?.title||'', description: round?.description||'', durationMinutes: round?.durationMinutes||15, questions: round?.questions||[] });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title) return alert('Title is required');
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div style={{ ...sx.card, padding:'24px', marginTop:16 }}>
      <div style={{ fontSize:16, fontWeight:700, marginBottom:20, color:C.gold }}>
        {round ? `✏️ Editing Round #${round.roundNumber}` : '➕ New Round'}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={sx.label}>Title *</label>
          <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={sx.input} placeholder="Round title" />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={sx.label}>Description</label>
          <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{ ...sx.input, resize:'vertical' }} />
        </div>
        <div>
          <label style={sx.label}>Duration (minutes)</label>
          <input type="number" value={form.durationMinutes} onChange={e=>setForm(p=>({...p,durationMinutes:Number(e.target.value)}))} style={sx.input} min={1} />
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ ...sx.label, marginBottom:12 }}>Questions ({form.questions.length})</label>
        <QuestionEditor questions={form.questions} onChange={qs=>setForm(p=>({...p,questions:qs}))} />
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={sx.btn('ghost')}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ ...sx.btn('primary'), opacity:saving?0.7:1 }}>
          {saving ? 'Saving...' : '💾 Save Round'}
        </button>
      </div>
    </div>
  );
}

function RoundsTab({ showToast }) {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | round object
  const [submissionsPanel, setSubmissionsPanel] = useState(null);
  const [teams, setTeams] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rr, tr] = await Promise.all([api.get('/admin/stats'), api.get('/teams')]);
      // Get full rounds with questions for editing
      const fullRounds = await Promise.all(
        rr.data.stats.rounds.map(r => api.get(`/rounds/${r.roundNumber}`).then(res => res.data.round))
      );
      setRounds(fullRounds);
      setTeams(tr.data.teams);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (num) => {
    try { const r = await api.patch(`/rounds/${num}/toggle`); showToast(r.data.message, 'ok'); load(); }
    catch (e) { showToast(e.response?.data?.message || 'Error', 'err'); }
  };

  const saveRound = async (form) => {
    try {
      if (editing === 'new') {
        const nextNum = rounds.length > 0 ? Math.max(...rounds.map(r=>r.roundNumber)) + 1 : 1;
        await api.post('/rounds', { ...form, roundNumber: nextNum });
        showToast(`✅ Round ${nextNum} created!`, 'ok');
      } else {
        await api.put(`/admin/rounds/${editing.roundNumber}`, form);
        showToast(`✅ Round ${editing.roundNumber} updated!`, 'ok');
      }
      setEditing(null);
      load();
    } catch (e) { showToast(e.response?.data?.message || 'Save failed', 'err'); throw e; }
  };

  const deleteRound = async (num) => {
    if (!window.confirm(`Delete Round ${num}? This is irreversible.`)) return;
    try { await api.delete(`/admin/rounds/${num}`); showToast(`🗑️ Round ${num} deleted`, 'ok'); load(); }
    catch (e) { showToast(e.response?.data?.message || 'Error', 'err'); }
  };

  const resetSubmission = async (roundNumber, teamId, teamName) => {
    if (!window.confirm(`Reset submission for "${teamName}" in Round ${roundNumber}? They'll be able to re-submit.`)) return;
    try {
      await api.delete(`/admin/rounds/${roundNumber}/submissions/${teamId}`);
      showToast(`🔄 Submission reset for ${teamName}`, 'ok');
      load();
    } catch(e) { showToast(e.response?.data?.message || 'Error', 'err'); }
  };

  const seed = async () => {
    if (!window.confirm('Seed default questions? This deletes all existing rounds.')) return;
    try { const r = await api.post('/rounds/seed'); showToast(r.data.message, 'ok'); setEditing(null); load(); }
    catch (e) { showToast('Seed failed', 'err'); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Rounds <span style={{ color:C.textDim, fontWeight:400, fontSize:13 }}>({rounds.length})</span></div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={seed} style={sx.btn('ghost')}>🌱 Seed Defaults</button>
          <button onClick={()=>setEditing('new')} style={sx.btn('primary')}>+ New Round</button>
        </div>
      </div>

      {editing && (
        <RoundEditor key={editing?._id || 'new'} round={editing==='new'?null:editing} onSave={saveRound} onCancel={()=>setEditing(null)} />
      )}

      {rounds.map(round => {
        const maxScore = round.questions?.reduce((a,q)=>a+(q.points||0),0)||0;
        const showSubs = submissionsPanel === round.roundNumber;
        return (
          <div key={round.roundNumber} style={{ ...sx.card, marginBottom:12, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
              {/* Round number badge */}
              <div style={{ width:40, height:40, borderRadius:8, background:round.isOpen?C.greenDim:C.surfaceHi, border:`1px solid ${round.isOpen?C.green:C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:16, fontWeight:700, color:round.isOpen?C.green:C.textDim, flexShrink:0 }}>
                {round.roundNumber}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:15 }}>{round.title}</span>
                  <span style={{ ...sx.tag, background:round.isOpen?C.greenDim:C.redDim, color:round.isOpen?C.green:C.red, fontSize:10 }}>
                    {round.isOpen ? '● OPEN' : '○ CLOSED'}
                  </span>
                </div>
                <div style={{ fontSize:12, color:C.textDim, marginTop:3, display:'flex', gap:16 }}>
                  <span>⏱ {round.durationMinutes}m</span>
                  <span>❓ {round.questions?.length||0} questions</span>
                  <span>📊 max {maxScore} pts</span>
                  <span>📜 {round.submissions?.length||0} submissions</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
                <button onClick={()=>setSubmissionsPanel(showSubs?null:round.roundNumber)} style={sx.btn('secondary')}>
                  📋 Subs {showSubs?'▲':'▼'}
                </button>
                <button onClick={()=>setEditing(editing?.roundNumber===round.roundNumber?null:round)} style={sx.btn('ghost')}>✏️ Edit</button>
                <button onClick={()=>toggle(round.roundNumber)} style={sx.btn(round.isOpen?'danger':'success')}>
                  {round.isOpen ? '🔒 Close' : '⚓ Open'}
                </button>
                <button onClick={()=>deleteRound(round.roundNumber)} style={{ ...sx.btn('danger'), padding:'8px 10px' }}>🗑</button>
              </div>
            </div>

            {/* Inline editor */}
            {editing?.roundNumber === round.roundNumber && (
              <div style={{ borderTop:`1px solid ${C.border}`, padding:'0 20px 20px' }}>
                <RoundEditor round={editing} onSave={saveRound} onCancel={()=>setEditing(null)} />
              </div>
            )}

            {/* Submissions panel */}
            {showSubs && (
              <div style={{ borderTop:`1px solid ${C.border}`, background:C.surfaceHi }}>
                <div style={{ padding:'10px 20px', fontSize:12, fontWeight:700, color:C.textMid, textTransform:'uppercase', letterSpacing:1 }}>Submissions</div>
                {(round.submissions||[]).length === 0 ? (
                  <div style={{ padding:'16px 20px', color:C.textDim, fontSize:13 }}>No submissions yet.</div>
                ) : (
                  [...(round.submissions||[])].sort((a,b)=>b.score-a.score).map((s,i) => {
                    const team = teams.find(t=>t._id===s.team?.toString()||(s.team&&t._id===s.team._id?.toString()));
                    const tname = team?.name || s.team?.name || 'Unknown Team';
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderTop:`1px solid ${C.border}` }}>
                        <div style={{ width:24, fontFamily:C.mono, fontSize:12, color:C.textDim }}>#{i+1}</div>
                        <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{tname}</div>
                        <div style={{ fontFamily:C.mono, fontSize:13, color:C.gold }}>{s.score} pts</div>
                        <div style={{ fontSize:11, color:C.textDim }}>⏱ {Math.floor(s.timeTaken/60)}m {s.timeTaken%60}s</div>
                        <div style={{ fontSize:11, color:C.textDim }}>{new Date(s.submittedAt).toLocaleString()}</div>
                        <button onClick={()=>resetSubmission(round.roundNumber, s.team?._id||s.team, tname)} style={{ ...sx.btn('danger'), fontSize:11, padding:'5px 10px' }}>↺ Reset</button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {rounds.length === 0 && !editing && (
        <div style={{ ...sx.card, padding:60, textAlign:'center', color:C.textDim }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🗺️</div>
          <div style={{ fontSize:15, marginBottom:16 }}>No rounds yet</div>
          <button onClick={()=>setEditing('new')} style={sx.btn('primary')}>+ Create First Round</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEAMS TAB  –  full CRUD
═══════════════════════════════════════════ */
function TeamForm({ team, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: team?.name||'',
    shipName: team?.shipName||'',
    maxMembers: team?.maxMembers||4,
    scores: {
      round1: team?.scores?.round1 || 0,
      round2: team?.scores?.round2 || 0,
      round3: team?.scores?.round3 || 0,
    }
  });
  const [saving, setSaving] = useState(false);
  const handle = async () => { 
    setSaving(true); 
    try { 
      await onSave(form); 
    } catch (e) {
      console.error('❌ TeamForm save error:', e);
    } finally { 
      setSaving(false); 
    } 
  };
  return (
    <div style={{ ...sx.card, padding:20, marginBottom:16 }}>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:16, color:C.gold }}>{team?`✏️ Edit ${team.name}`:'➕ New Team'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
        <div>
          <label style={sx.label}>Team Name *</label>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={sx.input} placeholder="Crew name" />
        </div>
        <div>
          <label style={sx.label}>Ship Name</label>
          <input value={form.shipName} onChange={e=>setForm(p=>({...p,shipName:e.target.value}))} style={sx.input} placeholder="Optional ship name" />
        </div>
        <div>
          <label style={sx.label}>Max Members</label>
          <input type="number" value={form.maxMembers} onChange={e=>setForm(p=>({...p,maxMembers:Number(e.target.value)}))} style={sx.input} min={1} max={10} />
        </div>
      </div>

      {/* Score Editing Section */}
      <div style={{ background:C.surfaceHi, padding:16, borderRadius:8, marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Manual Score Adjustment</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            <label style={sx.label}>Round 1</label>
            <input type="number" value={form.scores.round1} onChange={e=>setForm(p=>({...p,scores:{...p.scores,round1:Number(e.target.value)}}))} style={sx.input} />
          </div>
          <div>
            <label style={sx.label}>Round 2</label>
            <input type="number" value={form.scores.round2} onChange={e=>setForm(p=>({...p,scores:{...p.scores,round2:Number(e.target.value)}}))} style={sx.input} />
          </div>
          <div>
            <label style={sx.label}>Round 3</label>
            <input type="number" value={form.scores.round3} onChange={e=>setForm(p=>({...p,scores:{...p.scores,round3:Number(e.target.value)}}))} style={sx.input} />
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={sx.btn('ghost')}>Cancel</button>
        <button onClick={handle} disabled={saving} style={{ ...sx.btn('primary'), opacity:saving?0.7:1 }}>{saving?'Saving...':'💾 Save'}</button>
      </div>
    </div>
  );
}

function TeamsTab({ showToast }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/teams'); setTeams(r.data.teams); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTeam = async (form) => {
    try {
      if (editing) {
        await api.put(`/admin/teams/${editing._id}`, form);
        showToast(`✅ ${form.name} updated!`, 'ok');
        setEditing(null);
      } else {
        await api.post('/admin/teams', form);
        showToast(`⚓ Team ${form.name} created!`, 'ok');
        setCreating(false);
      }
      load();
    } catch(e) { showToast(e.response?.data?.message||'Error', 'err'); throw e; }
  };

  const deleteTeam = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Members will be unassigned.`)) return;
    try { await api.delete(`/admin/teams/${id}`); showToast(`🗑️ ${name} deleted`, 'ok'); load(); }
    catch(e) { showToast(e.response?.data?.message||'Error', 'err'); }
  };

  const eliminate = async (id, name, isEliminated) => {
    try {
      await api.put(`/admin/teams/${id}`, { isEliminated: !isEliminated });
      showToast(isEliminated ? `✅ ${name} reinstated!` : `💀 ${name} eliminated!`, 'ok');
      load();
    } catch(e) { showToast(e.response?.data?.message||'Error', 'err'); }
  };

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.joinCode?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Teams <span style={{ color:C.textDim, fontWeight:400, fontSize:13 }}>({teams.length})</span></div>
        <div style={{ display:'flex', gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} style={{ ...sx.input, width:220 }} placeholder="🔍 Search teams..." />
          <button onClick={()=>{ setCreating(true); setEditing(null); }} style={sx.btn('primary')}>+ New Team</button>
        </div>
      </div>

      {creating && <TeamForm onSave={saveTeam} onCancel={()=>setCreating(false)} />}
      {editing  && <TeamForm key={editing._id} team={editing} onSave={saveTeam} onCancel={()=>setEditing(null)} />}

      <div style={{ ...sx.card, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:C.surfaceHi }}>
              {['Team','Ship','Join Code','Members','Score','Status','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:C.textMid, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(team=>(
              <tr key={team._id} style={{ borderBottom:`1px solid ${C.border}`, opacity:team.isEliminated?0.5:1 }}>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ fontWeight:600, color: team.isEliminated?C.textDim:C.text, textDecoration:team.isEliminated?'line-through':'none' }}>{team.name}</div>
                </td>
                <td style={{ padding:'12px 16px', color:C.textDim, fontSize:12 }}>{team.shipName||'—'}</td>
                <td style={{ padding:'12px 16px', fontFamily:C.mono, color:C.gold, letterSpacing:3, fontSize:13 }}>{team.joinCode}</td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {team.members?.map(m=>(
                      <span key={m._id} style={{ ...sx.tag, background:C.blueDim, color:C.blue, fontSize:10 }}>{m.pirateName||m.username}</span>
                    ))}
                    {!team.members?.length && <span style={{ color:C.textDim }}>—</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:4 }}>{team.members?.length||0}/{team.maxMembers}</div>
                </td>
                <td style={{ padding:'12px 16px', fontFamily:C.mono, color:C.gold }}>{team.totalScore||0}</td>
                <td style={{ padding:'12px 16px' }}>
                  {team.isEliminated
                    ? <span style={{ ...sx.tag, background:C.redDim, color:C.red }}>☠️ OUT</span>
                    : <span style={{ ...sx.tag, background:C.greenDim, color:C.green }}>● ACTIVE</span>
                  }
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>{ setEditing(team); setCreating(false); }} style={{ ...sx.btn('ghost'), padding:'6px 10px', fontSize:12 }}>✏️</button>
                    <button onClick={()=>eliminate(team._id, team.name, team.isEliminated)} style={{ ...sx.btn(team.isEliminated?'success':'danger'), padding:'6px 10px', fontSize:12 }}>
                      {team.isEliminated?'↩':'☠️'}
                    </button>
                    <button onClick={()=>deleteTeam(team._id, team.name)} style={{ ...sx.btn('danger'), padding:'6px 10px', fontSize:12 }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && (
          <div style={{ padding:40, textAlign:'center', color:C.textDim }}>No teams found.</div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   USERS TAB
═══════════════════════════════════════════ */
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/admin/users'); setUsers(r.data.users); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const withAct = async (fn) => { if(acting) return; setActing(true); try { await fn(); } finally { setActing(false); } };

  const deleteUser = (id, name) => withAct(async () => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api.delete(`/admin/users/${id}`); showToast(`🗑️ ${name} removed`, 'ok'); load(); }
    catch(e) { showToast(e.response?.data?.message||'Error','err'); }
  });

  const promote = (id, name) => withAct(async () => {
    if (!window.confirm(`Promote "${name}" to admin?`)) return;
    try { const r = await api.patch(`/admin/users/${id}/promote`); showToast(r.data.message,'ok'); load(); }
    catch(e) { showToast(e.response?.data?.message||'Error','err'); }
  });

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.pirateName||'').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div style={{ fontSize:15, fontWeight:700 }}>Users <span style={{ color:C.textDim, fontWeight:400, fontSize:13 }}>({users.length})</span></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} style={{ ...sx.input, width:260 }} placeholder="🔍 Search by name, email..." />
      </div>
      <div style={{ ...sx.card, overflow:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:800 }}>
          <thead>
            <tr style={{ background:C.surfaceHi }}>
              {['Pirate Name','Username','Email','Team','Role','Joined','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:C.textMid, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i)=>(
              <tr key={u._id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?'transparent':C.surfaceHi }}>
                <td style={{ padding:'11px 16px', fontWeight:600, color:C.gold }}>{u.pirateName||'—'}</td>
                <td style={{ padding:'11px 16px', fontFamily:C.mono, fontSize:12 }}>{u.username}</td>
                <td style={{ padding:'11px 16px', color:C.textMid, fontSize:12 }}>{u.email}</td>
                <td style={{ padding:'11px 16px', fontSize:12, color:C.blue }}>{u.team?.name||'—'}</td>
                <td style={{ padding:'11px 16px' }}>
                  <span style={{ ...sx.tag, background:u.role==='admin'?C.redDim:C.blueDim, color:u.role==='admin'?C.red:C.blue }}>
                    {u.role==='admin'?'👑 admin':'🦜 player'}
                  </span>
                </td>
                <td style={{ padding:'11px 16px', color:C.textDim, fontSize:11 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ padding:'11px 16px' }}>
                  {u.role !== 'admin' && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>promote(u._id, u.username)} disabled={acting} style={{ ...sx.btn('success'), fontSize:11, padding:'5px 10px' }}>⚓ Promote</button>
                      <button onClick={()=>deleteUser(u._id, u.username)} disabled={acting} style={{ ...sx.btn('danger'), fontSize:11, padding:'5px 10px' }}>🗑 Remove</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{ padding:40, textAlign:'center', color:C.textDim }}>No users found.</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT ADMIN PANEL
═══════════════════════════════════════════ */
const TABS = [
  { id:'overview', label:'Overview',  icon:'📊' },
  { id:'rounds',   label:'Rounds',    icon:'🗺️' },
  { id:'teams',    label:'Teams',     icon:'🚢' },
  { id:'users',    label:'Users',     icon:'👥' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState({ msg:'', type:'ok' });

  const showToast = (msg, type='ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'ok' }), 3500);
  };

  return (
    <div style={sx.page}>
      <Navbar />
      <Toast msg={toast.msg} type={toast.type} />

      <div style={sx.wrap}>
        {/* Header */}
        <div style={{ marginBottom:28, paddingTop:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'rgba(240,192,64,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚔️</div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, margin:0, letterSpacing:-0.5 }}>Admin Control Panel</h1>
              <div style={{ fontSize:12, color:C.textDim, fontFamily:C.mono }}>Treasure Hunt Management System</div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${C.border}`, marginBottom:28 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:'10px 20px', border:'none', cursor:'pointer', fontFamily:C.sans, fontSize:13, fontWeight:600,
              background:'transparent', transition:'all 0.15s',
              color: tab===t.id ? C.gold : C.textMid,
              borderBottom: `2px solid ${tab===t.id?C.gold:'transparent'}`,
              marginBottom:-1,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <Link to="/dashboard" style={{ alignSelf:'center', ...sx.btn('ghost'), textDecoration:'none', fontSize:12, marginBottom:4 }}>
            ← Dashboard
          </Link>
        </div>

        {/* Tab content */}
        {tab==='overview' && <OverviewTab showToast={showToast} />}
        {tab==='rounds'   && <RoundsTab   showToast={showToast} />}
        {tab==='teams'    && <TeamsTab    showToast={showToast} />}
        {tab==='users'    && <UsersTab    showToast={showToast} />}
      </div>
    </div>
  );
}
