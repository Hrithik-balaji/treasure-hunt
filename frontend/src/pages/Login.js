import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const iFocus = e => { e.target.style.borderColor='#c9a84c'; e.target.style.background='rgba(201,168,76,0.05)'; e.target.style.boxShadow='0 0 20px rgba(201,168,76,0.1)'; };
const iBlur  = e => { e.target.style.borderColor='rgba(201,168,76,0.3)'; e.target.style.background='rgba(0,0,0,0.4)'; e.target.style.boxShadow='none'; };

const s = {
  page: { paddingTop:110, paddingBottom:80 },
  wrap: { background:'linear-gradient(135deg,rgba(61,43,14,0.5),rgba(13,10,5,0.85))', border:'1px solid rgba(201,168,76,0.3)', padding:'50px', maxWidth:480, margin:'0 auto', position:'relative' },
  topLbl: { position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'#0d0a05', padding:'0 20px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#c9a84c', letterSpacing:4, whiteSpace:'nowrap' },
  grp: { marginBottom:22 },
  lbl: { display:'block', fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#c9a84c', letterSpacing:3, textTransform:'uppercase', marginBottom:7 },
  inp: { width:'100%', height:'52px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(201,168,76,0.3)', borderBottom:'2px solid rgba(201,168,76,0.5)', color:'#f5e9c8', padding:'0 16px', fontFamily:"'Crimson Pro',serif", fontSize:16, outline:'none', transition:'all 0.3s', boxSizing:'border-box', display:'block' },
  submitBtn: { width:'100%', background:'linear-gradient(135deg,#8a6a1e,#c9a84c)', border:'none', color:'#1a1208', padding:18, fontFamily:"'Cinzel Decorative',serif", fontSize:15, letterSpacing:3, cursor:'pointer', transition:'all 0.3s', marginTop:10 },
  err: { background:'rgba(139,26,26,0.2)', border:'1px solid rgba(139,26,26,0.5)', color:'#ff8080', padding:'12px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:13, marginBottom:20 },
  foot: { textAlign:'center', marginTop:24, fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:'rgba(201,168,76,0.5)', letterSpacing:2 },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/dashboard'); }
    catch (e) { setError(e.response?.data?.message || 'Authentication failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}><div className="container">
      <div className="section-label">Return to the Hunt</div>
      <h2 className="section-title">Enter Your Vessel</h2>
      <div style={s.wrap}>
        <span style={s.topLbl}>✦ PIRATE AUTHENTICATION ✦</span>
        {error && <div style={s.err}>⚠ {error}</div>}
        <div style={s.grp}>
          <label style={s.lbl}>Email Address</label>
          <input style={s.inp} type="email" placeholder="captain@seas.com" value={form.email}
            onChange={e=>setForm(p=>({...p,email:e.target.value}))} onFocus={iFocus} onBlur={iBlur}/>
        </div>
        <div style={s.grp}>
          <label style={s.lbl}>Password</label>
          <input style={s.inp} type="password" placeholder="••••••••" value={form.password}
            onChange={e=>setForm(p=>({...p,password:e.target.value}))}
            onFocus={iFocus} onBlur={iBlur}
            onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
        </div>
        <button style={{...s.submitBtn,opacity:loading?0.7:1}} onClick={handleSubmit} disabled={loading}>
          {loading ? '⏳ BOARDING...' : '⚔ BOARD THE SHIP'}
        </button>
        <div style={s.foot}>
          No crew yet?{' '}
          <Link to="/register" style={{ color:'#c9a84c', textDecoration:'none' }}>Register here →</Link>
        </div>
        <div style={{ ...s.foot, marginTop:10 }}>
          <Link to="/" style={{ color:'rgba(201,168,76,0.4)', textDecoration:'none' }}>← Back to Harbor</Link>
        </div>
      </div>
    </div></div>
  );
}
