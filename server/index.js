const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-Memory Database (Production ke liye MongoDB/PostgreSQL use kar sakte hain, abhi instant testing ke liye yeh best hai)
let users = [];
let deposits = [];
let withdrawals = [];
let games = [];

let systemConfig = {
  rakePercent: 10,
  minWithdrawal: 100,
  merchantUpi: 'merchant@upi',
  merchantQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=merchant@upi',
  notice: '🚀 Welcome to Ludo Supreme VIP. Instant auto deposits & fast payouts live!',
  apkDownloadUrl: ''
};

let stats = {
  totalRakeProfit: 0
};

// --- AUTH APIs ---
app.post('/api/register', (req, res) => {
  const { name, phone, password } = req.body;
  if (!phone || phone.length !== 10) return res.json({ success: false, message: 'Invalid 10-digit mobile number' });
  const existing = users.find(u => u.phone === phone);
  if (existing) return res.json({ success: false, message: 'User already registered with this phone' });
  
  const newUser = { name: name || 'Player', phone, password, balance: 50 }; // Welcome bonus ₹50
  users.push(newUser);
  res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  const user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return res.json({ success: false, message: 'Invalid phone or password' });
  res.json({ success: true, user });
});

app.post('/api/guest-login', (req, res) => {
  const guestPhone = 'GUEST' + Math.floor(100000 + Math.random() * 900000);
  const newUser = { name: 'Guest Player', phone: guestPhone, password: '123', balance: 100 };
  users.push(newUser);
  res.json({ success: true, user: newUser });
});

// --- WALLET APIs ---
app.post('/api/wallet/submit-deposit', (req, res) => {
  const { phone, amount, utr } = req.body;
  const user = users.find(u => u.phone === phone);
  if (!user) return res.json({ success: false, message: 'User not found' });

  const newDeposit = { id: 'DEP' + Date.now(), name: user.name, phone, amount: Number(amount), utr, status: 'Pending' };
  deposits.push(newDeposit);
  res.json({ success: true, message: 'Deposit request submitted successfully! Waiting for owner approval.' });
});

app.post('/api/wallet/submit-withdraw', (req, res) => {
  const { phone, upi, amount } = req.body;
  const user = users.find(u => u.phone === phone);
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
  if (amount < systemConfig.minWithdrawal) return res.json({ success: false, message: `Minimum withdrawal is ₹${systemConfig.minWithdrawal}` });

  user.balance -= Number(amount);
  const newWithdraw = { id: 'WIT' + Date.now(), name: user.name, phone, amount: Number(amount), upi, status: 'Pending' };
  withdrawals.push(newWithdraw);
  res.json({ success: true, balance: user.balance });
});

// --- ADMIN APIs ---
app.get('/api/admin/full-overview', (req, res) => {
  res.json({
    users,
    deposits,
    withdrawals,
    config: systemConfig,
    stats
  });
});

app.post('/api/admin/save-settings', (req, res) => {
  systemConfig = { ...systemConfig, ...req.body };
  io.emit('system_config_updated', systemConfig);
  res.json({ success: true });
});

app.post('/api/admin/action-deposit', (req, res) => {
  const { id, action } = req.body;
  const dep = deposits.find(d => d.id === id);
  if (!dep || dep.status !== 'Pending') return res.json({ success: false });

  if (action === 'approve') {
    dep.status = 'Approved';
    const user = users.find(u => u.phone === dep.phone);
    if (user) {
      user.balance += dep.amount;
      io.emit('balance_synced', user.balance);
    }
  } else {
    dep.status = 'Rejected';
  }
  res.json({ success: true });
});

app.post('/api/admin/action-withdraw', (req, res) => {
  const { id, action } = req.body;
  const wit = withdrawals.find(w => w.id === id);
  if (!wit || wit.status !== 'Pending') return res.json({ success: false });

  if (action === 'approve') {
    wit.status = 'Paid';
  } else {
    wit.status = 'Rejected';
    const user = users.find(u => u.phone === wit.phone);
    if (user) {
      user.balance += wit.amount; // Refund
      io.emit('balance_synced', user.balance);
    }
  }
  res.json({ success: true });
});

// --- SOCKET.IO GAME ENGINE ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_match', ({ mode, stake, phone }) => {
    const user = users.find(u => u.phone === phone);
    if (!user || user.balance < stake) return;

    user.balance -= stake;
    socket.emit('balance_synced', user.balance);

    const colorsPool = ['red', 'green', 'yellow', 'blue'];
    const assignedColor = colorsPool[Math.floor(Math.random() * mode)];

    const gameId = 'GAME_' + Date.now();
    const prize = stake * mode * (1 - systemConfig.rakePercent / 100);
    stats.totalRakeProfit += (stake * mode) * (systemConfig.rakePercent / 100);

    const gameSession = {
      id: gameId,
      prize,
      players: [{ phone: user.phone, color: assignedColor, socketId: socket.id }]
    };

    games.push(gameSession);
    socket.join(gameId);

    // Instant match simulation for smooth gameplay
    setTimeout(() => {
      socket.emit('game_started', gameSession);
    }, 1000);
  });

  socket.on('roll_dice', ({ gameId }) => {
    const val = Math.floor(Math.random() * 6) + 1;
    io.to(gameId).emit('dice_rolled', { val });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Render par dynamic port assignment zaroori hai
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Ludo Supreme VIP Server running live on port ${PORT}`);
});