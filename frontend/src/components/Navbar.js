import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);

  const isActive = (p) => location.pathname === p;
  const handleLogout = () => { logout(); navigate('/'); };

  const st = {
    nav: {
      position:'fixed', top:0, left:0, right:0, zIndex:100,
      padding:'16px 40px', display:'flex', alignItems:'center',
      justifyContent:'space-between', transition:'all 0.3s',
      ...(scrolled ? { background:'rgba(13,10,5,0.97)', borderBottom:'1px solid rgba(201,168,76,0.2)', backdropFilter:'blur(10px)' } : {})
    },
    logo: { fontFamily:"'Cinzel Decorative',serif", fontSize:15, color:'#c9a84c', textDecoration:'none', letterSpacing:2, textShadow:'0 0 20px rgba(201,168,76,0.5)' },
    links: { display:'flex', gap:24, listStyle:'none', alignItems:'center', flexWrap:'wrap' },
    link: { color:'#d4b896', textDecoration:'none', fontSize:13, letterSpacing:2, textTransform:'uppercase', fontFamily:"'Share Tech Mono',monospace", transition:'color 0.3s', padding:'4px 0', borderBottom:'1px solid transparent' },
    active: { color:'#f0d080', borderBottom:'1px solid #c9a84c' },
    btn: { background:'linear-gradient(135deg,#8a6a1e,#c9a84c)', color:'#1a1208', padding:'8px 22px', fontFamily:"'Cinzel Decorative',serif", fontSize:12, letterSpacing:1, textDecoration:'none', transition:'all 0.3s', display:'inline-block' },
    user: { fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:'#c9a84c', letterSpacing:2 },
    logout: { background:'transparent', border:'1px solid rgba(139,26,26,0.5)', color:'#ff8080', padding:'6px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1, cursor:'pointer', transition:'all 0.3s' },
  };

  // Public nav (not logged in)
  if (!user) {
    return (
      <nav style={st.nav}>
        <Link to="/" style={st.logo}>⚓ TTH 2026</Link>
        <ul style={st.links}>
          {[{path:'/',label:'Home'},{path:'/rounds',label:'Rounds'}].map(({path,label})=>(
            <li key={path}><Link to={path} style={{...st.link,...(isActive(path)?st.active:{})}}>{label}</Link></li>
          ))}
          <li><Link to="/login" style={st.btn}>⚔ Enter</Link></li>
        </ul>
      </nav>
    );
  }

  // Logged in nav
  return (
    <nav style={st.nav}>
      <Link to="/dashboard" style={st.logo}>⚓ TTH 2026</Link>
      <ul style={st.links}>
        {[
          {path:'/dashboard',  label:'Dashboard'},
          {path:'/rounds',     label:'Rounds'},
          ...(user.role==='admin'?[
            {path:'/leaderboard',label:'Leaderboard'},
            {path:'/admin',label:'⚙ Admin'}
          ]:[]),
        ].map(({path,label})=>(
          <li key={path}><Link to={path} style={{...st.link,...(isActive(path)?st.active:{})}}>{label}</Link></li>
        ))}
        <li style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={st.user}>🦜 {user.pirateName||user.username}</span>
          <button onClick={handleLogout} style={st.logout}>LEAVE</button>
        </li>
      </ul>
    </nav>
  );
}
