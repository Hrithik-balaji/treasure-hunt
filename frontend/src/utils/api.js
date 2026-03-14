// ═══════════════════════════════════════════════════════
//  utils/api.js  –  The Messenger Parrot 🦜
//
//  Axios is an HTTP client (like fetch but nicer).
//  We create ONE configured instance so every request
//  automatically includes the right base URL and token.
//
//  Instead of writing this in every component:
//    axios.get('http://localhost:5000/api/leaderboard', {
//      headers: { Authorization: `Bearer ${token}` }
//    })
//  We just write:
//    api.get('/leaderboard')
// ═══════════════════════════════════════════════════════

import axios from 'axios';

const api = axios.create({
  // All requests go to this base URL
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── REQUEST INTERCEPTOR ──────────────────────────────
// Runs before every request. Attaches the JWT token
// from localStorage to the Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── RESPONSE INTERCEPTOR ─────────────────────────────
// Runs after every response. If we get 401 (Unauthorized),
// the token expired → log the user out automatically.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
