import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://ludo-backend-xyz.onrender.com');
const API = 'https://ludo-backend-xyz.onrender.com/api';

const playSound = (type, isMuted) => {
  if (isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'roll') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'step') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'win') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
};

const TRACK_COORDS = [
  [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
  [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
  [1, 8],
  [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],
  [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15],
  [8, 15],
  [9, 15], [9, 14], [9, 13], [9, 12], [9, 11], [9, 10],
  [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9],
  [15, 8],
  [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7],
  [9, 6], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1],
  [8, 1],
  [7, 1]
];

const HOME_LANES = {
  red: [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7]],
  green: [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8]],
  yellow: [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8]],
  blue: [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9]]
};

const START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const COLOR_MAP = { red: { color: '#ef4444' }, green: { color: '#22c55e' }, yellow: { color: '#eab308' }, blue: { color: '#3b82f6' } };

const THEMES = {
  cyber: { name: 'Cyber Neon', bg: '#070b14', card: '#0f172a', border: '#1e293b', accent: '#38bdf8', gridBg: '#0b1329' },
  gold: { name: 'Royal Gold', bg: '#140e05', card: '#241a0b', border: '#453315', accent: '#facc15', gridBg: '#1f1608' }
};

const TOKEN_DESIGNS = [
  { id: 'sphere', name: 'Sphere', radius: '50%', border: '2px solid #fff' },
  { id: 'gem', name: 'Diamond Gem', radius: '6px', border: '2px solid #facc15' }
];

export default function App() {
  const [isAdminRoute] = useState(() => window.location.pathname.includes('/admin-owner-zone'));
  const [adminAuth, setAdminAuth] = useState({ loggedIn: false, key: '' });
  const [adminData, setAdminData] = useState({ users: [], deposits: [], withdrawals: [], stats: {} });

  const [adminForm, setAdminForm] = useState({
    rakePercent: 10,
    minWithdrawal: 100,
    merchantUpi: 'merchant@upi',
    merchantQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=merchant@upi',
    notice: '🚀 Welcome to Ludo Supreme VIP. Instant auto deposits & fast payouts live!',
    apkDownloadUrl: ''
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const s = localStorage.getItem('ludo_player_session');
    return s ? JSON.parse(s) : null;
  });

  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [systemConfig, setSystemConfig] = useState(adminForm);
  const [userSelectedTheme, setUserSelectedTheme] = useState('cyber');
  const [chosenTokenDesign, setChosenTokenDesign] = useState('sphere');

  const [view, setView] = useState('lobby');
  const [balance, setBalance] = useState(0);
  const [selectedMode, setSelectedMode] = useState(2);
  const [stake, setStake] = useState(50);
  const [matchSearchTime, setMatchSearchTime] = useState(0);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTab, setWalletTab] = useState('deposit');
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositUtr, setDepositUtr] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [activeGameId, setActiveGameId] = useState(null);
  const [myColor, setMyColor] = useState('red');
  const [activeColors, setActiveColors] = useState(['red', 'green']);
  const [turn, setTurn] = useState('red');
  const [diceVal, setDiceVal] = useState(6);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [timer, setTimer] = useState(15);
  const [isMoving, setIsMoving] = useState(false);
  const [prizePool, setPrizePool] = useState(0);
  const [winnerModal, setWinnerModal] = useState(null);

  const [tokens, setTokens] = useState({ red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] });

  const activeTheme = THEMES[userSelectedTheme] || THEMES.cyber;
  const currentToken = TOKEN_DESIGNS.find((t) => t.id === chosenTokenDesign) || TOKEN_DESIGNS[0];

  useEffect(() => {
    socket.on('system_config_updated', (cfg) => {
      setSystemConfig(cfg);
      setAdminForm((prev) => ({ ...prev, ...cfg }));
    });
    socket.on('balance_synced', (b) => setBalance(b));
    socket.on('game_started', (game) => {
      setActiveGameId(game.id);
      setPrizePool(game.prize);
      setActiveColors(game.players.map((p) => p.color));
      const me = game.players.find((p) => p.phone === currentUser?.phone);
      if (me) setMyColor(me.color);
      setTokens({ red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] });
      setTurn('red');
      setDiceVal(6);
      setHasRolled(false);
      setWinnerModal(null);
      setTimer(15);
      setIsMoving(false);
      setView('game');
    });
    socket.on('dice_rolled', ({ val }) => { setDiceVal(val); setRolling(false); setHasRolled(true); playSound('roll', isMuted); });
    socket.on('token_moved', ({ color, index, toPos, nextTurn }) => {
      setTokens((prev) => { const copy = { ...prev, [color]: [...prev[color]] }; copy[color][index] = toPos; return copy; });
      playSound('step', isMuted); setHasRolled(false); setTurn(nextTurn); setTimer(15);
    });
    socket.on('game_over', ({ winnerPhone, prize }) => {
      playSound('win', isMuted);
      if (currentUser?.phone === winnerPhone) { setBalance((b) => b + prize); setWinnerModal({ isMe: true, prize }); }
      else { setWinnerModal({ isMe: false, prize }); }
    });
    return () => { socket.off('system_config_updated'); socket.off('balance_synced'); socket.off('game_started'); socket.off('dice_rolled'); socket.off('token_moved'); socket.off('game_over'); };
  }, [currentUser, isMuted]);

  const fetchAdminData = async () => {
    try {
      const res = await fetch(`${API}/admin/full-overview`);
      const data = await res.json();
      setAdminData(data);
      setAdminForm(data.config);
    } catch {}
  };

  useEffect(() => {
    if (isAdminRoute && adminAuth.loggedIn) {
      fetchAdminData();
      const t = setInterval(fetchAdminData, 3000);
      return () => clearInterval(t);
    }
  }, [isAdminRoute, adminAuth.loggedIn]);

  const handleAuth = async () => {
    const endpoint = authMode === 'register' ? '/register' : '/login';
    const payload = authMode === 'register' ? { name: authName, phone: authPhone, password: authPassword } : { phone: authPhone, password: authPassword };
    try {
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) return alert(data.message);
      setCurrentUser(data.user); setBalance(data.user.balance);
      localStorage.setItem('ludo_player_session', JSON.stringify(data.user));
    } catch { alert('Server connection error.'); }
  };

  const handleGuestLogin = async () => {
    try {
      const res = await fetch(`${API}/guest-login`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { setCurrentUser(data.user); setBalance(data.user.balance); localStorage.setItem('ludo_player_session', JSON.stringify(data.user)); }
    } catch {}
  };

  const handleSubmitDeposit = async () => {
    if (!depositUtr || depositUtr.length < 6) return alert('Enter valid UTR / Reference Number');
    try {
      const res = await fetch(`${API}/wallet/submit-deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: currentUser.phone, amount: depositAmount, utr: depositUtr }) });
      const data = await res.json();
      if (data.success) { alert(data.message); setShowWalletModal(false); setDepositUtr(''); } else alert(data.message);
    } catch {}
  };

  const handleSubmitWithdrawal = async () => {
    const amt = Number(withdrawAmount);
    if (!withdrawUpi.includes('@') || !amt || amt < systemConfig.minWithdrawal) return alert(`Minimum withdrawal is ₹${systemConfig.minWithdrawal} to valid UPI`);
    try {
      const res = await fetch(`${API}/wallet/submit-withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: currentUser.phone, upi: withdrawUpi, amount: amt }) });
      const data = await res.json();
      if (data.success) { setBalance(data.balance); setShowWalletModal(false); setWithdrawAmount(''); alert('Withdrawal requested successfully!'); } else alert(data.message);
    } catch {}
  };

  // ADMIN VIP DASHBOARD VIEW
  if (isAdminRoute) {
    if (!adminAuth.loggedIn) {
      return (
        <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#030712', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <div style={{ width: '90%', maxWidth: '380px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px' }}>👑</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8', marginTop: '6px' }}>VIP ADMIN HQ</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Master Control & Live Analytics</div>
            </div>
            <input type="password" placeholder="Enter Owner Master Key" value={adminAuth.key} onChange={(e) => setAdminAuth({ ...adminAuth, key: e.target.value })} style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
            <button onClick={() => { if (adminAuth.key === 'owner786') setAdminAuth({ ...adminAuth, loggedIn: true }); else alert('Wrong Master Key'); }} style={{ padding: '14px', backgroundColor: '#38bdf8', color: '#000', fontWeight: 900, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>AUTHENTICATE</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#030712', color: '#f8fafc', padding: '24px', boxSizing: 'border-box', fontFamily: 'system-ui' }}>
        <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px 24px', borderRadius: '18px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8' }}>👑 VIP OWNER CONSOLE</div>
              <div style={{ fontSize: '12px', color: '#22c55e' }}>● Live Platform Operating & Gateway Synced</div>
            </div>
            <button onClick={() => setAdminAuth({ loggedIn: false, key: '' })} style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Lock HQ</button>
          </div>

          {/* Metrics Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>TOTAL REGISTERED USERS</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#38bdf8', marginTop: '6px' }}>{adminData.users.length}</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>PENDING DEPOSIT REQUESTS</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#facc15', marginTop: '6px' }}>{adminData.deposits.filter((d) => d.status === 'Pending').length}</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>PENDING WITHDRAWAL PAYOUTS</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#ef4444', marginTop: '6px' }}>{adminData.withdrawals.filter((w) => w.status === 'Pending').length}</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>TOTAL COMMISSION PROFIT</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#34d399', marginTop: '6px' }}>₹{adminData.stats.totalRakeProfit || 0}</div>
            </div>
          </div>

          {/* Gateway & QR Settings */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontWeight: 900, fontSize: '18px', color: '#facc15' }}>⚙️ Payment Gateway & QR Management</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Merchant UPI ID</label>
                <input type="text" value={adminForm.merchantUpi} onChange={(e) => setAdminForm({ ...adminForm, merchantUpi: e.target.value })} style={{ width: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', color: '#fff', marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Merchant QR Image URL (Paste QR Link)</label>
                <input type="text" value={adminForm.merchantQrUrl} onChange={(e) => setAdminForm({ ...adminForm, merchantQrUrl: e.target.value })} style={{ width: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', color: '#fff', marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Rake Commission (%)</label>
                <input type="number" value={adminForm.rakePercent} onChange={(e) => setAdminForm({ ...adminForm, rakePercent: e.target.value })} style={{ width: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', color: '#fff', marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Minimum Withdrawal Limit (₹)</label>
                <input type="number" value={adminForm.minWithdrawal} onChange={(e) => setAdminForm({ ...adminForm, minWithdrawal: e.target.value })} style={{ width: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', color: '#fff', marginTop: '6px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', color: '#38bdf8' }}>Live Broadcast Marquee Notice</label>
                <input type="text" value={adminForm.notice} onChange={(e) => setAdminForm({ ...adminForm, notice: e.target.value })} style={{ width: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', color: '#fff', marginTop: '6px' }} />
              </div>
            </div>
            <button onClick={async () => { await fetch(`${API}/admin/save-settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminForm) }); alert('VIP Settings Saved Live!'); }} style={{ padding: '14px 28px', backgroundColor: '#facc15', color: '#000', fontWeight: 900, border: 'none', borderRadius: '10px', cursor: 'pointer', alignSelf: 'flex-end' }}>SAVE ALL SETTINGS</button>
          </div>

          {/* Deposits Approvals Table */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontWeight: 900, fontSize: '18px', color: '#34d399' }}>📥 Deposit Requests (UTR Approvals)</div>
            {adminData.deposits.length === 0 ? <div style={{ color: '#64748b', fontSize: '14px' }}>No deposit requests pending.</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead><tr style={{ color: '#94a3b8', borderBottom: '1px solid #1e293b' }}><th style={{ padding: '12px' }}>User</th><th>Phone</th><th>Amount</th><th>UTR Reference</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {adminData.deposits.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{d.name}</td><td>{d.phone}</td><td style={{ color: '#34d399', fontWeight: 900 }}>₹{d.amount}</td><td style={{ color: '#facc15', fontWeight: 'bold' }}>{d.utr}</td><td>{d.status}</td>
                      <td>
                        {d.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={async () => { await fetch(`${API}/admin/action-deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id, action: 'approve' }) }); fetchAdminData(); }} style={{ padding: '6px 14px', backgroundColor: '#22c55e', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Credit</button>
                            <button onClick={async () => { await fetch(`${API}/admin/action-deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id, action: 'reject' }) }); fetchAdminData(); }} style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Withdrawal Payouts Table */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontWeight: 900, fontSize: '18px', color: '#ef4444' }}>📤 Withdrawal Payout Requests</div>
            {adminData.withdrawals.length === 0 ? <div style={{ color: '#64748b', fontSize: '14px' }}>No withdrawal requests pending.</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead><tr style={{ color: '#94a3b8', borderBottom: '1px solid #1e293b' }}><th style={{ padding: '12px' }}>User</th><th>Phone</th><th>Amount</th><th>Destination UPI</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {adminData.withdrawals.map((w) => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{w.name}</td><td>{w.phone}</td><td style={{ color: '#ef4444', fontWeight: 900 }}>₹{w.amount}</td><td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{w.upi}</td><td>{w.status}</td>
                      <td>
                        {w.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={async () => { await fetch(`${API}/admin/action-withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id, action: 'approve' }) }); fetchAdminData(); }} style={{ padding: '6px 14px', backgroundColor: '#22c55e', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Mark Paid</button>
                            <button onClick={async () => { await fetch(`${API}/admin/action-withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id, action: 'reject' }) }); fetchAdminData(); }} style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Reject & Refund</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Users Profile Database */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontWeight: 900, fontSize: '18px', color: '#38bdf8' }}>👥 Registered User Profiles Database</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead><tr style={{ color: '#94a3b8', borderBottom: '1px solid #1e293b' }}><th style={{ padding: '12px' }}>Name</th><th>Mobile Number</th><th>Wallet Balance</th></tr></thead>
              <tbody>
                {adminData.users.map((u) => (
                  <tr key={u.phone} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.name}</td><td>{u.phone}</td><td style={{ color: '#34d399', fontWeight: 900 }}>₹{u.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    );
  }

  // Auth View
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: activeTheme.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box', fontFamily: 'system-ui' }}>
        <div style={{ width: '100%', maxWidth: '420px', backgroundColor: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '44px' }}>👑</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: activeTheme.accent }}>Ludo Supreme VIP</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Real Cash Tournaments • Secure & Fast</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => setAuthMode('login')} style={{ padding: '12px', borderRadius: '10px', border: authMode === 'login' ? `2px solid ${activeTheme.accent}` : '1px solid #334155', backgroundColor: '#020617', color: authMode === 'login' ? activeTheme.accent : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Login</button>
            <button onClick={() => setAuthMode('register')} style={{ padding: '12px', borderRadius: '10px', border: authMode === 'register' ? `2px solid ${activeTheme.accent}` : '1px solid #334155', backgroundColor: '#020617', color: authMode === 'register' ? activeTheme.accent : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Register</button>
          </div>
          {authMode === 'register' && <input type="text" placeholder="Your Full Name" value={authName} onChange={(e) => setAuthName(e.target.value)} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />}
          <input type="tel" maxLength={10} placeholder="10-digit Mobile Number" value={authPhone} onChange={(e) => setAuthPhone(e.target.value.replace(/\D/g, ''))} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />
          <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />
          <button onClick={handleAuth} style={{ padding: '16px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: '15px' }}>{authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</button>
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>── OR ──</div>
          <button onClick={handleGuestLogin} style={{ padding: '14px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '12px', color: '#facc15', fontWeight: 'bold', cursor: 'pointer' }}>⚡ PLAY AS GUEST (TRIAL)</button>
        </div>
      </div>
    );
  }

  // Player Dashboard View
  return (
    <div style={{ minHeight: '100vh', width: '100vw', boxSizing: 'border-box', backgroundColor: activeTheme.bg, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 24px 16px', fontFamily: 'system-ui' }}>
      
      <div style={{ width: '100%', maxWidth: '1200px', backgroundColor: '#facc15', color: '#000', padding: '6px 14px', borderRadius: '0 0 8px 8px', fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: '12px' }}>
        <marquee scrollamount="6">{systemConfig.notice}</marquee>
      </div>

      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '18px', padding: '12px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: activeTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>👑</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '15px', color: activeTheme.accent }}>{currentUser.name}</div>
            <div style={{ fontSize: '11px', color: '#22c55e' }}>● {currentUser.phone}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setShowThemeModal(true)} style={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', padding: '8px 12px', color: '#facc15', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>🎨 Style</button>
          <button onClick={() => setIsMuted(!isMuted)} style={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', padding: '8px 12px', color: '#94a3b8', cursor: 'pointer' }}>{isMuted ? '🔇' : '🔊'}</button>
          <button onClick={() => setShowWalletModal(true)} style={{ backgroundColor: '#020617', border: '1px solid rgba(16,185,129,0.5)', padding: '8px 16px', borderRadius: '10px', fontWeight: 900, color: '#34d399', cursor: 'pointer' }}>₹{balance} ＋</button>
          <button onClick={() => { localStorage.removeItem('ludo_player_session'); setCurrentUser(null); }} style={{ backgroundColor: '#020617', border: '1px solid #ef4444', borderRadius: '10px', padding: '8px 12px', color: '#ef4444', cursor: 'pointer' }}>⏻</button>
        </div>
      </div>

      {view === 'lobby' && (
        <div style={{ width: '100%', maxWidth: '1200px', backgroundColor: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#020617', border: `1px solid ${activeTheme.border}`, padding: '16px 24px', borderRadius: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>AVAILABLE BALANCE</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#34d399' }}>₹{balance}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setWalletTab('deposit'); setShowWalletModal(true); }} style={{ padding: '10px 18px', backgroundColor: '#22c55e', color: '#000', fontWeight: 900, borderRadius: '10px', border: 'none', cursor: 'pointer' }}>+ Add Cash</button>
              <button onClick={() => { setWalletTab('withdraw'); setShowWalletModal(true); }} style={{ padding: '10px 18px', backgroundColor: '#38bdf8', color: '#000', fontWeight: 900, borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Withdraw UPI</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>SELECT BATTLE MODE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {[2, 3, 4].map((m) => (
                <button key={m} onClick={() => setSelectedMode(m)} style={{ padding: '16px', borderRadius: '12px', border: selectedMode === m ? `2px solid ${activeTheme.accent}` : '1px solid #334155', backgroundColor: selectedMode === m ? 'rgba(56,189,248,0.15)' : '#020617', color: selectedMode === m ? activeTheme.accent : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>
                  {m === 2 ? '1 vs 1 Battle' : `${m} Players`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>SELECT STAKE AMOUNT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
              {[10, 25, 50, 100, 250, 500].map((fee) => (
                <button key={fee} onClick={() => setStake(fee)} style={{ padding: '16px', borderRadius: '12px', border: stake === fee ? '2px solid #34d399' : '1px solid #334155', backgroundColor: stake === fee ? 'rgba(52,211,153,0.15)' : '#020617', color: stake === fee ? '#34d399' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>₹{fee}</button>
              ))}
            </div>
          </div>
          <button onClick={() => {
            if (balance < stake) { alert('Insufficient balance!'); setShowWalletModal(true); return; }
            setView('matching'); setMatchSearchTime(0);
            socket.emit('find_match', { mode: selectedMode, stake, phone: currentUser.phone });
          }} style={{ padding: '18px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>PLAY NOW (BET ₹{stake})</button>
        </div>
      )}

      {view === 'matching' && (
        <div style={{ width: '100%', maxWidth: '800px', height: '480px', backgroundColor: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <div style={{ width: '110px', height: '110px', borderRadius: '50%', border: `4px solid ${activeTheme.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px' }}>🎲</div>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 900, fontSize: '20px' }}>Finding Live Players...</div><div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Connecting to room ({matchSearchTime}s)</div></div>
          <button onClick={() => setView('lobby')} style={{ padding: '10px 24px', backgroundColor: '#020617', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel & Refund</button>
        </div>
      )}

      {/* Wallet Modal with QR & UPI */}
      {showWalletModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ width: '90%', maxWidth: '400px', backgroundColor: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '20px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontWeight: 900, fontSize: '16px' }}>Cash Wallet (₹{balance})</div><button onClick={() => setShowWalletModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => setWalletTab('deposit')} style={{ padding: '10px', borderRadius: '8px', border: walletTab === 'deposit' ? '2px solid #34d399' : '1px solid #334155', backgroundColor: '#020617', color: walletTab === 'deposit' ? '#34d399' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Cash</button>
              <button onClick={() => setWalletTab('withdraw')} style={{ padding: '10px', borderRadius: '8px', border: walletTab === 'withdraw' ? `2px solid ${activeTheme.accent}` : '1px solid #334155', backgroundColor: '#020617', color: walletTab === 'withdraw' ? activeTheme.accent : '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>Withdraw UPI</button>
            </div>
            {walletTab === 'deposit' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[100, 250, 500].map((amt) => (<button key={amt} onClick={() => setDepositAmount(amt)} style={{ padding: '10px', borderRadius: '8px', border: depositAmount === amt ? '2px solid #34d399' : '1px solid #334155', backgroundColor: '#020617', color: '#34d399', fontWeight: 'bold', cursor: 'pointer' }}>₹{amt}</button>))}
                </div>
                <div style={{ backgroundColor: '#020617', padding: '12px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Scan QR & Pay ₹{depositAmount}</div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>{systemConfig.merchantUpi}</div>
                  <img src={systemConfig.merchantQrUrl} alt="Merchant QR" style={{ width: '130px', height: '130px', margin: '10px auto', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#fff' }} />
                </div>
                <input type="text" placeholder="Enter 12-Digit UTR / Ref Number" value={depositUtr} onChange={(e) => setDepositUtr(e.target.value)} style={{ padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <button onClick={handleSubmitDeposit} style={{ padding: '14px', backgroundColor: '#34d399', color: '#000', fontWeight: 900, border: 'none', borderRadius: '10px', cursor: 'pointer' }}>SUBMIT UTR FOR APPROVAL</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Enter UPI ID (e.g. mobile@upi)" value={withdrawUpi} onChange={(e) => setWithdrawUpi(e.target.value)} style={{ padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <input type="number" placeholder={`Amount (Min ₹${systemConfig.minWithdrawal})`} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} style={{ padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <button onClick={handleSubmitWithdrawal} style={{ padding: '14px', backgroundColor: activeTheme.accent, color: '#000', fontWeight: 900, border: 'none', borderRadius: '10px', cursor: 'pointer' }}>REQUEST UPI PAYOUT</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showThemeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130 }}>
          <div style={{ width: '90%', maxWidth: '360px', backgroundColor: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontWeight: 900, fontSize: '16px' }}>Theme Style</div><button onClick={() => setShowThemeModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.keys(THEMES).map((k) => (<button key={k} onClick={() => setUserSelectedTheme(k)} style={{ padding: '10px', borderRadius: '8px', border: userSelectedTheme === k ? `2px solid ${THEMES[k].accent}` : '1px solid #334155', backgroundColor: '#020617', color: THEMES[k].accent, fontWeight: 'bold', cursor: 'pointer' }}>{THEMES[k].name}</button>))}
            </div>
            <button onClick={() => setShowThemeModal(false)} style={{ padding: '12px', backgroundColor: activeTheme.accent, color: '#000', fontWeight: 900, border: 'none', borderRadius: '10px', cursor: 'pointer' }}>APPLY</button>
          </div>
        </div>
      )}

    </div>
  );
}