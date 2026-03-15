import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const iFocus = e => { e.target.style.borderColor='#c9a84c'; e.target.style.background='rgba(201,168,76,0.06)'; e.target.style.boxShadow='0 0 18px rgba(201,168,76,0.1)'; };
const iBlur  = e => { e.target.style.borderColor='rgba(201,168,76,0.3)'; e.target.style.background='rgba(0,0,0,0.4)'; e.target.style.boxShadow='none'; };

const s = {
  page: { paddingTop:110, paddingBottom:80 },
  wrap: { background:'linear-gradient(135deg,rgba(61,43,14,0.5),rgba(13,10,5,0.88))', border:'1px solid rgba(201,168,76,0.3)', padding:'44px 48px', maxWidth:700, margin:'0 auto', position:'relative' },
  topLbl: { position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'#0d0a05', padding:'0 20px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#c9a84c', letterSpacing:4, whiteSpace:'nowrap' },
  grp: { marginBottom:20 },
  lbl: { display:'block', fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#c9a84c', letterSpacing:3, textTransform:'uppercase', marginBottom:7 },
  inp: { width:'100%', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(201,168,76,0.3)', borderBottom:'2px solid rgba(201,168,76,0.5)', color:'#f5e9c8', padding:'12px 15px', fontFamily:"'Crimson Pro',serif", fontSize:16, outline:'none', transition:'all 0.3s', boxSizing:'border-box' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  submitBtn: { width:'100%', background:'linear-gradient(135deg,#8a6a1e,#c9a84c)', border:'none', color:'#1a1208', padding:17, fontFamily:"'Cinzel Decorative',serif", fontSize:15, letterSpacing:3, cursor:'pointer', transition:'all 0.3s', marginTop:8 },
  err: { background:'rgba(139,26,26,0.2)', border:'1px solid rgba(139,26,26,0.5)', color:'#ff8080', padding:'12px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:13, marginBottom:18 },
  divider: { textAlign:'center', fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#4a3a14', letterSpacing:4, margin:'20px 0', display:'flex', alignItems:'center', gap:12 },
  divLine: { flex:1, height:1, background:'rgba(201,168,76,0.15)' },
};

// Participation type card
const TypeCard = ({ value, current, onClick, icon, title, desc }) => (
  <button type="button" onClick={() => onClick(value)} style={{
    flex:1, padding:'18px 14px', cursor:'pointer', border:`2px solid`, borderRadius:4, textAlign:'center', transition:'all 0.2s', background:'transparent',
    borderColor: current===value ? '#c9a84c' : 'rgba(201,168,76,0.2)',
    background:  current===value ? 'rgba(201,168,76,0.08)' : 'transparent',
  }}>
    <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
    <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:13, color: current===value?'#f0d080':'#d4b896', marginBottom:5 }}>{title}</div>
    <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#8a6a1e', lineHeight:1.5 }}>{desc}</div>
    {current===value && <div style={{ marginTop:8, fontSize:10, fontFamily:"'Share Tech Mono',monospace", color:'#c9a84c', letterSpacing:2 }}>✓ SELECTED</div>}
  </button>
);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username:'', email:'', password:'', confirmPassword:'', pirateName:'',
    participationType:'solo',   // 'solo' | 'team'
    teamAction:'create',        // 'create' | 'join'  (only used when participationType==='team')
    teamName:'', joinCode:''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.username.trim())   return 'Username is required';
    if (form.username.length < 3) return 'Username must be at least 3 characters';
    if (!form.email.trim())      return 'Email is required';
    if (!form.password)          return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (form.participationType === 'team') {
      if (form.teamAction === 'create' && !form.teamName.trim()) return 'Team name is required';
      if (form.teamAction === 'join'   && !form.joinCode.trim()) return 'Join code is required';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      await register({
        username:          form.username.trim(),
        email:             form.email.trim(),
        password:          form.password,
        pirateName:        form.pirateName.trim(),
        participationType: form.participationType,
        teamAction:        form.participationType === 'team' ? form.teamAction : undefined,
        teamName:          form.teamAction === 'create' ? form.teamName.trim() : undefined,
        joinCode:          form.teamAction === 'join'   ? form.joinCode.trim().toUpperCase() : undefined,
      });
      setSuccess(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── Success screen ── */
  if (success) return (
    <div style={s.page}><div className="container">
      <div style={s.wrap}>
        <span style={s.topLbl}>✦ REGISTRATION COMPLETE ✦</span>
        <div style={{ textAlign:'center', padding:'40px 0' }}>
          <div style={{ fontSize:64, marginBottom:20 }}>🏴‍☠️</div>
          <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:26, color:'#f0d080', marginBottom:14 }}>
            {form.participationType === 'solo' ? 'Solo Pirate Enlisted!' : 'Crew Enlisted!'}
          </div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:'#d4b896', letterSpacing:1, lineHeight:2.2 }}>
            Welcome, <strong style={{ color:'#f0d080' }}>{form.pirateName || form.username}</strong>!<br/>
            {form.participationType === 'solo'
              ? 'You are registered as a solo pirate.'
              : form.teamAction === 'create'
                ? `Your crew "${form.teamName}" has been created.`
                : `You have joined the crew.`}<br/>
            Check your email for the confirmation.<br/>
            May fortune favor the bold.
          </div>
          <div style={{ marginTop:32 }}>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>⚓ Board Your Ship</button>
          </div>
        </div>
      </div>
    </div></div>
  );

  return (
    <div style={s.page}><div className="container">
      <div className="section-label">Enlist for the Hunt</div>
      <h2 className="section-title">Register Now</h2>
      <div style={s.wrap}>
        <span style={s.topLbl}>✦ TECHNICAL TREASURE HUNT 2026 ✦</span>

        {error && <div style={s.err}>⚠ {error}</div>}

        {/* Basic info */}
        <div style={{ ...s.divider, marginTop:0 }}>
          <div style={s.divLine}/><span>PERSONAL DETAILS</span><div style={s.divLine}/>
        </div>
        <div style={{ ...s.row, marginBottom:0 }}>
          <div style={s.grp}>
            <label style={s.lbl}>Username *</label>
            <input style={s.inp} placeholder="johndoe" value={form.username}
              onChange={e=>set('username',e.target.value)} onFocus={iFocus} onBlur={iBlur}/>
          </div>
          <div style={s.grp}>
            <label style={s.lbl}>Pirate Name 🦜</label>
            <input style={s.inp} placeholder="Blackbeard (optional)" value={form.pirateName}
              onChange={e=>set('pirateName',e.target.value)} onFocus={iFocus} onBlur={iBlur}/>
          </div>
        </div>
        <div style={s.grp}>
          <label style={s.lbl}>Email Address *</label>
          <input style={s.inp} type="email" placeholder="captain@seas.com" value={form.email}
            onChange={e=>set('email',e.target.value)} onFocus={iFocus} onBlur={iBlur}/>
        </div>
        <div style={{ ...s.row, marginBottom:0 }}>
          <div style={s.grp}>
            <label style={s.lbl}>Password * (min 6)</label>
            <input style={s.inp} type="password" placeholder="••••••••" value={form.password}
              onChange={e=>set('password',e.target.value)} onFocus={iFocus} onBlur={iBlur}
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          </div>
          <div style={s.grp}>
            <label style={s.lbl}>Confirm Password *</label>
            <input style={s.inp} type="password" placeholder="••••••••" value={form.confirmPassword}
              onChange={e=>set('confirmPassword',e.target.value)} onFocus={iFocus} onBlur={iBlur}
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          </div>
        </div>

        {/* Participation type */}
        <div style={s.divider}>
          <div style={s.divLine}/><span>PARTICIPATION TYPE</span><div style={s.divLine}/>
        </div>
        <div style={{ display:'flex', gap:14, marginBottom:20 }}>
          <TypeCard value="solo" current={form.participationType} onClick={v=>set('participationType',v)}
            icon="⚔️" title="Solo Pirate"
            desc={'Compete alone&#10;Individual ranking'} />
          <TypeCard value="team" current={form.participationType} onClick={v=>set('participationType',v)}
            icon="🚢" title="Crew / Team"
            desc={'2–4 members&#10;Team ranking'} />
        </div>

        {/* Team section — only show when 'team' selected */}
        {form.participationType === 'team' && (
          <div style={{ background:'rgba(201,168,76,0.04)', border:'1px solid rgba(201,168,76,0.18)', padding:'20px', marginBottom:20 }}>
            <div style={{ ...s.divider, margin:'0 0 16px 0' }}>
              <div style={s.divLine}/><span>CREW OPTIONS</span><div style={s.divLine}/>
            </div>
            {/* Create vs Join toggle */}
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[
                { val:'create', label:'⚓ Create New Crew', icon:'➕' },
                { val:'join',   label:'🗺️ Join by Code',    icon:'🔑' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => set('teamAction', opt.val)} style={{
                  flex:1, padding:'10px', cursor:'pointer', border:'1px solid', transition:'all 0.2s',
                  fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1,
                  background: form.teamAction===opt.val ? 'rgba(201,168,76,0.12)' : 'transparent',
                  borderColor: form.teamAction===opt.val ? '#c9a84c' : 'rgba(201,168,76,0.25)',
                  color: form.teamAction===opt.val ? '#f0d080' : '#8a6a1e',
                }}>{opt.label}</button>
              ))}
            </div>

            {form.teamAction === 'create' && (
              <div>
                <label style={s.lbl}>Crew Name *</label>
                <input style={s.inp} placeholder="The Flying Dutchman" value={form.teamName}
                  onChange={e=>set('teamName',e.target.value)} onFocus={iFocus} onBlur={iBlur}/>
                <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#6a5020', marginTop:8, letterSpacing:1 }}>
                  ✦ After registering, share your 6-character join code with teammates so they can join.
                </p>
              </div>
            )}

            {form.teamAction === 'join' && (
              <div>
                <label style={s.lbl}>Join Code *</label>
                <input style={{ ...s.inp, fontFamily:"'Share Tech Mono',monospace", letterSpacing:6, textTransform:'uppercase', fontSize:20 }}
                  placeholder="ABC123" maxLength={6}
                  value={form.joinCode}
                  onChange={e=>set('joinCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
                  onFocus={iFocus} onBlur={iBlur}/>
                <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#6a5020', marginTop:8, letterSpacing:1 }}>
                  ✦ Get the 6-character code from your team captain.
                </p>
              </div>
            )}
          </div>
        )}

        {form.participationType === 'solo' && (
          <div style={{ background:'rgba(61,220,132,0.04)', border:'1px solid rgba(61,220,132,0.15)', padding:'14px 18px', marginBottom:20, fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#3ddc84', letterSpacing:1, lineHeight:1.8 }}>
            ⚔️ Solo participants compete individually and will appear on the leaderboard separately.
          </div>
        )}

        <button style={{ ...s.submitBtn, opacity:loading?0.7:1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? '⏳ ENLISTING...' : '⚔ CLAIM YOUR SPOT ⚔'}
        </button>
        <div style={{ textAlign:'center', marginTop:18, fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:'rgba(201,168,76,0.45)', letterSpacing:2 }}>
          Already enlisted?{' '}
          <Link to="/login" style={{ color:'#c9a84c', textDecoration:'none' }}>Login →</Link>
        </div>
      </div>
    </div></div>
  );
}
