import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div style={{ minHeight:'100vh', background:'#030b14', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Rajdhani,sans-serif', color:'#d4c5a9', textAlign:'center', padding:'40px' }}>
    <div style={{ fontSize:'80px', marginBottom:'16px' }}>☠️</div>
    <h1 style={{ fontFamily:'Uncial Antiqua,cursive', fontSize:'48px', color:'#c8a84b', marginBottom:'12px' }}>Lost at Sea!</h1>
    <p style={{ color:'#7a6e5f', fontSize:'18px', marginBottom:'32px' }}>This page doesn't exist on any treasure map.</p>
    <Link to="/" style={{ fontFamily:'Orbitron,monospace', fontSize:'13px', letterSpacing:'2px', padding:'14px 36px', border:'1px solid #c8a84b', borderRadius:'3px', color:'#c8a84b', textDecoration:'none' }}>
      ← Return to Harbor
    </Link>
  </div>
);

export default NotFound;
