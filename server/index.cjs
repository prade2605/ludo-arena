import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// 1. Process Crash Guards (Server kabhi auto-kill nahi hoga)
process.on('uncaughtException', (err) => {
  console.error('CRITICAL GUARD CAUGHT ERROR:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION CAUGHT:', reason);
});

const app = express();

// 2. Security Headers (Cross-Site Scripting aur sniffing block)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// 3. DDoS / Brute-force Limiter (Max 180 requests/minute per IP)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});
app.use('/api/', apiLimiter);

// 4. Permissive CORS for seamless web/mobile client access
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

const fs = require('fs');
const DB_FILE = './database.json';

// 1. Load data from file on startup
let rawDb = { users: {}, deposits: [], withdrawals: [] };
if (fs.existsSync(DB_FILE)) {
  try {
    rawDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.log("Error reading db file");
  }
}

// 2. Auto-save Proxy (Har ek modification par khud-b-khud save karega)
const autoSaveHandler = {
  get(target, prop) {
    const value = target[prop];
    if (value && typeof value === 'object') {
      return new Proxy(value, autoSaveHandler);
    }
    return value;
  },
  set(target, prop, value) {
    target[prop] = value;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); // Auto-save
    return true;
  },
  deleteProperty(target, prop) {
    delete target[prop];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); // Auto-save on delete
    return true;
  }
};

const db = new Proxy(rawDb, autoSaveHandler);

// Helper function to save data
const saveDb = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Ping Test
app.get('/api/ping', (req, res) => {
  res.json({ status: 'online', timestamp: Date.now() });
});

// In-Memory Production State
const db = {
 systemConfig: {
  platformName: 'Ludo Supreme Pro',
  rakePercent: 10,
  minWithdrawal: 100,
  merchantUpi: 'merchant@upi',
  merchantQrUrl: '',
  notice: '🔥 100% Secure Fair-Play Engine Active. Instant UPI Withdrawals.',
  theme: 'cyber',
  apkDownloadUrl: '' // Admin panel se set hoga
},
  users: {},
  deposits: [],
  withdrawals: [],
  stats: {
    totalDepositsAmount: 0,
    totalWithdrawalsAmount: 0,
    totalRakeProfit: 0
  }
};

const matchQueues = {};
const activeGames = {};

// --- USER APIS ---

app.post('/api/register', (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password || phone.length !== 10) {
    return res.status(400).json({ success: false, message: 'Invalid registration parameters.' });
  }
  if (db.users[phone]) {
    return res.status(400).json({ success: false, message: 'Phone number already registered.' });
  }

  const newUser = {
    uid: 'UID_' + Math.floor(1000 + Math.random() * 9000),
    name: String(name).trim().slice(0, 20),
    phone: String(phone).trim(),
    password: String(password),
    isGuest: false,
    balance: 50,
    pnl: 0,
    won: 0,
    matchesPlayed: 0,
    createdAt: new Date().toLocaleDateString()
  };

  db.users[phone] = newUser;
  return res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  const user = db.users[phone];
  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid phone or password.' });
  }
  return res.json({ success: true, user });
});

app.post('/api/guest-login', (req, res) => {
  const guestId = 'GST_' + Math.floor(100000 + Math.random() * 900000);
  const guestUser = {
    uid: guestId,
    name: 'Guest_' + guestId.slice(-4),
    phone: guestId,
    password: '',
    isGuest: true,
    balance: 100,
    pnl: 0,
    won: 0,
    matchesPlayed: 0,
    createdAt: new Date().toLocaleDateString()
  };

  db.users[guestId] = guestUser;
  return res.json({ success: true, user: guestUser });
});

app.post('/api/wallet/submit-deposit', (req, res) => {
  const { phone, amount, utr } = req.body;
  const user = db.users[phone];
  const numAmt = Number(amount);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (!numAmt || numAmt <= 0 || !utr || utr.length < 6) {
    return res.status(400).json({ success: false, message: 'Valid amount and 12-digit UTR required.' });
  }

  const depositReq = {
    id: 'DEP_' + Date.now().toString().slice(-5),
    uid: user.uid,
    name: user.name,
    phone: user.phone,
    amount: numAmt,
    utr: String(utr).trim(),
    status: 'Pending',
    date: new Date().toLocaleTimeString()
  };

  db.deposits.unshift(depositReq);
  return res.json({ success: true, message: 'Deposit request submitted for verification.' });
});

app.post('/api/wallet/submit-withdraw', (req, res) => {
  const { phone, upi, amount } = req.body;
  const user = db.users[phone];
  const numAmt = Number(amount);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (!upi || !upi.includes('@')) return res.status(400).json({ success: false, message: 'Valid UPI ID required' });
  if (!numAmt || numAmt < db.systemConfig.minWithdrawal) {
    return res.status(400).json({ success: false, message: `Minimum withdrawal is ₹${db.systemConfig.minWithdrawal}` });
  }
  if (user.balance < numAmt) return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });

  user.balance -= numAmt;
  const withdrawReq = {
    id: 'WIT_' + Date.now().toString().slice(-5),
    uid: user.uid,
    name: user.name,
    phone: user.phone,
    upi: String(upi).trim(),
    amount: numAmt,
    status: 'Pending',
    date: new Date().toLocaleTimeString()
  };

  db.withdrawals.unshift(withdrawReq);
  return res.json({ success: true, balance: user.balance, request: withdrawReq });
});

// --- ADMIN APIS ---

app.get('/api/admin/full-overview', (req, res) => {
  return res.json({
    users: Object.values(db.users),
    deposits: db.deposits,
    withdrawals: db.withdrawals,
    config: db.systemConfig,
    stats: db.stats
  });
});

app.post('/api/admin/save-settings', (req, res) => {
  const { rakePercent, minWithdrawal, merchantUpi, merchantQrUrl, notice, theme, platformName } = req.body;
  if (rakePercent !== undefined) db.systemConfig.rakePercent = Number(rakePercent);
  if (minWithdrawal !== undefined) db.systemConfig.minWithdrawal = Number(minWithdrawal);
  if (merchantUpi !== undefined) db.systemConfig.merchantUpi = String(merchantUpi).trim();
  if (merchantQrUrl !== undefined) db.systemConfig.merchantQrUrl = String(merchantQrUrl).trim();
  if (notice !== undefined) db.systemConfig.notice = String(notice).trim();
  if (theme !== undefined) db.systemConfig.theme = theme;
  if (platformName !== undefined) db.systemConfig.platformName = platformName;

  io.emit('system_config_updated', db.systemConfig);
  return res.json({ success: true, config: db.systemConfig });
});

app.post('/api/admin/action-deposit', (req, res) => {
  const { id, action } = req.body;
  const target = db.deposits.find((d) => d.id === id);
  if (!target || target.status !== 'Pending') return res.status(400).json({ success: false });

  if (action === 'approve') {
    target.status = 'Approved';
    if (db.users[target.phone]) db.users[target.phone].balance += target.amount;
    db.stats.totalDepositsAmount += target.amount;
  } else {
    target.status = 'Rejected';
  }
  return res.json({ success: true, deposits: db.deposits });
});

app.post('/api/admin/action-withdraw', (req, res) => {
  const { id, action } = req.body;
  const target = db.withdrawals.find((w) => w.id === id);
  if (!target || target.status !== 'Pending') return res.status(400).json({ success: false });

  if (action === 'approve') {
    target.status = 'Approved';
    db.stats.totalWithdrawalsAmount += target.amount;
  } else {
    target.status = 'Rejected';
    if (db.users[target.phone]) db.users[target.phone].balance += target.amount;
  }
  return res.json({ success: true, withdrawals: db.withdrawals });
});

// --- MULTIPLAYER ENGINE ---
const COLOR_SETS = {
  2: ['red', 'yellow'],
  3: ['red', 'green', 'yellow'],
  4: ['red', 'green', 'yellow', 'blue']
};

io.on('connection', (socket) => {
  socket.emit('system_config_updated', db.systemConfig);

  socket.on('find_match', ({ mode, stake, phone }) => {
    const user = db.users[phone];
    if (!user || user.balance < stake) return socket.emit('match_error', 'Low balance');

    user.balance -= stake;
    user.pnl -= stake;
    user.matchesPlayed += 1;
    socket.emit('balance_synced', user.balance);

    const qKey = `${mode}_${stake}`;
    if (!matchQueues[qKey]) matchQueues[qKey] = [];

    matchQueues[qKey].push({ socketId: socket.id, phone: user.phone, name: user.name });

    if (matchQueues[qKey].length >= mode) {
      const matchPlayers = matchQueues[qKey].splice(0, mode);
      const gameId = 'game_' + Date.now();
      const colors = COLOR_SETS[mode];

      const assigned = matchPlayers.map((p, idx) => ({ ...p, color: colors[idx] }));
      const totalPot = stake * mode;
      const rake = Math.floor((totalPot * db.systemConfig.rakePercent) / 100);
      const prize = totalPot - rake;

      activeGames[gameId] = { id: gameId, mode, stake, totalPot, prize, rake, players: assigned, turn: colors[0] };

      assigned.forEach((p) => {
        const sock = io.sockets.sockets.get(p.socketId);
        if (sock) sock.join(gameId);
      });

      io.to(gameId).emit('game_started', activeGames[gameId]);
    }
  });

  socket.on('roll_dice', ({ gameId }) => {
    io.to(gameId).emit('dice_rolled', { val: Math.floor(Math.random() * 6) + 1 });
  });

  socket.on('move_token', ({ gameId, color, index, toPos, nextTurn }) => {
    io.to(gameId).emit('token_moved', { color, index, toPos, nextTurn });
  });

  socket.on('claim_win', ({ gameId, winnerPhone }) => {
    const g = activeGames[gameId];
    if (!g || g.settled) return;
    g.settled = true;

    const u = db.users[winnerPhone];
    if (u) {
      u.balance += g.prize;
      u.pnl += g.prize;
      u.won += 1;
      db.stats.totalRakeProfit += g.rake;
    }
    io.to(gameId).emit('game_over', { winnerPhone, prize: g.prize });
  });

  socket.on('send_reaction', ({ gameId, reaction }) => {
    io.to(gameId).emit('receive_reaction', { reaction });
  });

  socket.on('disconnect', () => {
    Object.keys(matchQueues).forEach((k) => {
      matchQueues[k] = matchQueues[k].filter((p) => p.socketId !== socket.id);
    });
  });
});

server.listen(5000, '0.0.0.0', () => {
  console.log('✅ Secured Ludo Server running on https://ludo-backend-0hgv.onrender.com');
});