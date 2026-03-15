import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import '../styles/global.css';

export default function Leaderboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/leaderboard').then(r => setBoard(r.data.leaderboard)).finally(() => setLoading(false)); }, []);

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, paddingBottom:80, minHeight:'100vh' }}>
        <div className="container">
          <div className="section-label">The Victors</div>
          <h2 className="section-title">Hall of Legends</h2>
          <div className="ornament">✦ ⬡ ✦ ⬡ ✦</div>

          {loading ? (
            <div style={{ textAlign:'center', fontFamily:"'Share Tech Mono',monospace", color:'#c9a84c', letterSpacing:4, fontSize:13 }}>CONSULTING THE ORACLE...</div>
          ) : board.length === 0 ? (
            <div style={{ background:'linear-gradient(135deg,rgba(61,43,14,0.3),rgba(13,10,5,0.6))', border:'1px dashed rgba(201,168,76,0.2)', padding:'80px', textAlign:'center' }}>
              <p style={{ fontSize:48, marginBottom:16 }}>🗺️</p>
              <p style={{ fontStyle:'italic', color:'#d4b896', fontSize:18 }}>No crews have scored yet. The hunt has just begun!</p>
            </div>
          ) : (
            <>
              {/* Podium */}
              {board.length >= 1 && (
                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:16, marginBottom:60 }}>
                  {(board.length >= 2 ? [board[1], board[0], board.length >= 3 ? board[2] : null] : [null, board[0], null]).map((team, i) => {
                    if (!team) return <div key={i} style={{ flex:1 }} />;
                    const rank = i===0?2:i===1?1:3;
                    const heights = ['120px','160px','100px'];
                    const colors = {1:'#f0d080', 2:'#c0c0c0', 3:'#cd7f32'};
                    const medals = {1:'🥇', 2:'🥈', 3:'🥉'};
                    return (
                      <div key={team._id} style={{ flex:1, maxWidth:220, textAlign:'center' }}>
                        <div style={{ marginBottom:12 }}>
                          <p style={{ fontSize:32 }}>{medals[rank]}</p>
                          <p style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:14, color:colors[rank], marginTop:4 }}>{team.name}</p>
                          <p style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:24, fontWeight:900, color:colors[rank] }}>{team.totalScore}</p>
                        </div>
                        <div style={{ height:heights[i], background:`linear-gradient(180deg,${colors[rank]}1a,${colors[rank]}08)`, border:`1px solid ${colors[rank]}66`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:48, color:`${colors[rank]}88` }}>{rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table */}
              <div style={{ background:'linear-gradient(135deg,rgba(61,43,14,0.3),rgba(13,10,5,0.7))', border:'1px solid rgba(201,168,76,0.2)', overflow:'hidden' }}>
                <div style={{ display:'flex', padding:'14px 24px', background:'rgba(61,43,14,0.6)', borderBottom:'1px solid rgba(201,168,76,0.2)' }}>
                  {['#','CREW','R1','R2','R3','TOTAL','MAP'].map(h => (
                    <div key={h} style={{ flex:h==='CREW'?3:1, fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:3, color:'#8a6a1e', textAlign:'center' }}>{h}</div>
                  ))}
                </div>
                {board.map((team, idx) => {
                  const isMe = user?.team?._id===team._id || user?.team===team._id;
                  const medals = {1:'🥇',2:'🥈',3:'🥉'};
                  return (
                    <div key={team._id} style={{ display:'flex', alignItems:'center', padding:'16px 24px', borderBottom:'1px solid rgba(201,168,76,0.07)', background: isMe?'rgba(201,168,76,0.06)':idx%2===0?'transparent':'rgba(61,43,14,0.2)', borderLeft: isMe?'3px solid #c9a84c':'3px solid transparent', transition:'all 0.2s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,168,76,0.08)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background=isMe?'rgba(201,168,76,0.06)':idx%2===0?'transparent':'rgba(61,43,14,0.2)';}}>
                      <div style={{ flex:1, textAlign:'center', fontSize:22 }}>{medals[team.rank]||team.rank}</div>
                      <div style={{ flex:3 }}>
                        <p style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:14, color:'#f0d080' }}>{team.name} {isMe&&'⭐'}</p>
                        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'#8a6a1e', marginTop:2 }}>
                          {team.members?.map(m=>m.pirateName||m.username).join(' · ')}
                        </p>
                      </div>
                      {[1,2,3].map(n => (
                        <div key={n} style={{ flex:1, textAlign:'center', fontFamily:"'Share Tech Mono',monospace", fontSize:15, color: team.completedRounds?.includes(n)?'#c9a84c':'rgba(201,168,76,0.2)' }}>
                          {team.scores?.[`round${n}`]??'—'}
                        </div>
                      ))}
                      <div style={{ flex:1, textAlign:'center', fontFamily:"'Cinzel Decorative',serif", fontSize:22, color:'#f0d080', textShadow:'0 0 15px rgba(201,168,76,0.4)' }}>{team.totalScore}</div>
                      <div style={{ flex:1, display:'flex', gap:5, justifyContent:'center' }}>
                        {[1,2,3].map(n => (
                          <div key={n} style={{ width:10, height:10, borderRadius:'50%', background: team.completedRounds?.includes(n)?'#c9a84c':'rgba(201,168,76,0.15)', border:`1px solid ${team.completedRounds?.includes(n)?'#c9a84c':'rgba(201,168,76,0.2)'}` }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
