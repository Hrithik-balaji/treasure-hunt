// ═══════════════════════════════════════════════════════
//  App.js
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing     from './pages/Landing';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Dashboard   from './pages/Dashboard';
import RoundPage   from './pages/RoundPage';   // ← individual round attempt page
import RoundsPage  from './pages/RoundsPage';  // ← rounds lobby with lock/unlock
import Leaderboard from './pages/Leaderboard';
import AdminPanel  from './pages/AdminPanel';
import NotFound    from './pages/NotFound';
import Navbar      from './components/Navbar';
import './styles/global.css';

// ── Route guards defined OUTSIDE AppInner so React never sees them
//    as new component types on re-render (fixes the remount/NotFound bug)
function Protect({ c, admin, user }) {
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return c;
}

function PubOnly({ c, user }) {
  return user ? <Navigate to="/dashboard" replace /> : c;
}

function AppInner() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const warn = () => {
      const w = document.getElementById('cpw');
      if (w) {
        w.style.opacity = '1';
        setTimeout(() => { w.style.opacity = '0'; }, 2500);
      }
    };

    const handleContextMenu = (e) => e.preventDefault();

    const handleKeyDown = (e) => {
      const blocked = (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i','j','k'].includes(e.key.toLowerCase())) ||
        e.key === 'PrintScreen'
      );
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        warn();
        return false;
      }
    };

    const handleSelectStart = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      e.preventDefault();
    };

    const handleDragStart = (e) => e.preventDefault();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown',     handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart',   handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown',     handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart',   handleDragStart);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh',
        fontFamily:"'Share Tech Mono',monospace", color:'#c9a84c', letterSpacing:4, fontSize:14 }}>
        ⚓ LOADING...
      </div>
    );
  }

  return (
    <>
      <div id="cpw" style={{
        position:'fixed', bottom:30, left:'50%', transform:'translateX(-50%)',
        background:'rgba(139,26,26,0.95)', color:'#f5e9c8', padding:'12px 30px',
        fontFamily:"'Share Tech Mono',monospace", fontSize:'13px', letterSpacing:'2px',
        zIndex:99999, opacity:0, transition:'opacity 0.3s',
        border:'1px solid rgba(201,168,76,0.4)', pointerEvents:'none',
      }}>
        ⚔ Content is protected — developer tools are not permitted
      </div>

      <div className="bg-fixed" />
      <div className="map-grid" />
      <div className="page-content">
        <Routes>
          <Route path="/"            element={<PubOnly user={user} c={<><Navbar/><Landing/></>} />} />
          <Route path="/login"       element={<PubOnly user={user} c={<Login/>} />} />
          <Route path="/register"    element={<PubOnly user={user} c={<Register/>} />} />
          <Route path="/leaderboard" element={<Protect user={user} admin c={<Leaderboard/>} />} />
          <Route path="/dashboard"   element={<Protect user={user} c={<Dashboard/>} />} />
          <Route path="/rounds"      element={<Protect user={user} c={<RoundsPage/>} />} />
          <Route path="/round/:num"  element={<Protect user={user} c={<RoundPage/>} />} />
          <Route path="/admin"       element={<Protect user={user} admin c={<AdminPanel/>} />} />
          <Route path="*"            element={<NotFound/>} />
        </Routes>
         <div style={{ textAlign:'center', fontFamily:"'Share Tech Mono',monospace", fontSize:16, color:'#5a4520', letterSpacing:3, padding:'20px 0 30px' }}>
        © 2026 Hrithik Balaji. All Rights Reserved.
  </div>

      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}