import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('https://ludo-arena.onrender.com');

export default function App() {
  const [view, setView] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState('🚀 Welcome to Ludo Supreme VIP');
  
  const [depositAmount, setDepositAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upi, setUpi] = useState('');

  const [gameData, setGameData] = useState(null);
  const [diceVal, setDiceVal] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');

  const [adminData, setAdminData] = useState({ users: [], deposits: [], withdrawals: [], config: {} });
  const [selectedUser, setSelectedUser] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  useEffect(() => {
    socket.on('balance_synced', (newBalance) => {
      setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    });

    socket.on('system_config_updated', (config) => {
      if (config.notice) setNotice(config.notice);
    });

    socket.on('game_started', (game) => {
      setGameData(game);
      setSearchStatus('');
      setView('game');
    });

    socket.on('dice_rolled', ({ val }) => {
      setDiceVal(val);
    });

    return () => {
      socket.off('balance_synced');
      socket.off('system_config_updated');
      socket.off('game_started');
      socket.off('dice_rolled');
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('https://ludo-arena.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      setView('home');
    } else {
      alert(data.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('https://ludo-arena.onrender.com/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      setView('home');
    } else {
      alert(data.message);
    }
  };

  const handleGuestLogin = async () => {
    const res = await fetch('https://ludo-arena.onrender.com/api/guest-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      setView('home');
    }
  };

  const submitDeposit = async () => {
    const res = await fetch('https://ludo-arena.onrender.com/api/wallet/submit-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: user.phone, amount: depositAmount, utr })
    });
    const data = await res.json();
    alert(data.message);
    setDepositAmount('');
    setUtr('');
  };

  const submitWithdraw = async () => {
    const res = await fetch('https://ludo-arena.onrender.com/api/wallet/submit-withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: user.phone, amount: withdrawAmount, upi })
    });
    const data = await res.json();
    if (data.success) {
      setUser({ ...user, balance: data.balance });
      alert("Withdrawal request submitted successfully!");
      setWithdrawAmount('');
      setUpi('');
    } else {
      alert(data.message);
    }
  };

  const findMatch = (mode, stake) => {
    if (user.balance < stake) return alert("Insufficient balance!");
    setSearchStatus('Searching for opponent (Bot matchmaking active after 15-20s if queue empty)...');
    socket.emit('find_match', { mode, stake, phone: user.phone });
  };

  const loadAdminDashboard = async () => {
    const res = await fetch('https://ludo-arena.onrender.com/api/admin/full-overview');
    const data = await res.json();
    setAdminData(data);
    setView('admin');
  };

  const modifyUserFund = async (action) => {
    if (!fundAmount || fundAmount <= 0) return alert("Valid amount daalo!");
    const res = await fetch('https://ludo-arena.onrender.com/api/admin/update-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: selectedUser.phone, amount: fundAmount, action })
    });
    const data = await res.json();
    if (data.success) {
      alert("Balance successfully updated!");
      setSelectedUser({ ...selectedUser, balance: data.newBalance });
      setFundAmount('');
      loadAdminDashboard();
    } else {
      alert(data.message);
    }
  };

  if (view === 'login') {
    return (
      <div style={{ background: '#121212', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '10px', width: '350px', boxShadow: '0 4px 15px rgba(0,0,0,0.6)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#ffc107' }}>Ludo Supreme VIP</h2>
          
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Mobile Number" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '10px', margin: '8px 0', background: '#2c2c2c', border: '1px solid #444', color: '#fff', borderRadius: '5px', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', margin: '8px 0', background: '#2c2c2c', border: '1px solid #444', color: '#fff', borderRadius: '5px', boxSizing: 'border-box' }} />
            <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold', marginTop: '10px' }}>Login</button>
          </form>

          <hr style={{ borderColor: '#444', margin: '20px 0' }} />

          <button onClick={handleGuestLogin} style={{ width: '100%', padding: '10px', background: '#ffc107', color: '#000', border: 'none', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold', marginBottom: '10px' }}>Play as Guest</button>
          
          <button onClick={loadAdminDashboard} style={{ width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold' }}>Admin Dashboard</button>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div style={{ background: '#121212', color: '#fff', padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Admin Dashboard</h2>
          <button onClick={() => setView('login')} style={{ padding: '8px 15px', background: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Logout / Home</button>
        </div>

        <h3>Registered Users (Click to view profile & manage funds)</h3>
        <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse', textAlign: 'center', background: '#1e1e1e' }}>
          <thead>
            <tr style={{ background: '#2c2c2c' }}>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Name</th>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Phone</th>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Balance</th>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {adminData.users.map(u => (
              <tr key={u.phone} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px', border: '1px solid #444' }}>{u.name}</td>
                <td style={{ padding: '10px', border: '1px solid #444' }}>{u.phone}</td>
                <td style={{ padding: '10px', border: '1px solid #444' }}>₹{u.balance}</td>
                <td style={{ padding: '10px', border: '1px solid #444' }}>
                  <button onClick={() => setSelectedUser(u)} style={{ padding: '5px 10px', background: '#ffc107', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedUser && (
          <div style={{ position: 'fixed', top: '25%', left: '35%', background: '#222', padding: '25px', border: '2px solid #555', width: '360px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 5px 15px rgba(0,0,0,0.7)' }}>
            <span onClick={() => setSelectedUser(null)} style={{ float: 'right', cursor: 'pointer', color: 'red', fontWeight: 'bold', fontSize: '20px' }}>&times;</span>
            <h3 style={{ marginBottom: '15px' }}>User Profile</h3>
            <p><strong>Name:</strong> {selectedUser.name}</p>
            <p><strong>Phone:</strong> {selectedUser.phone}</p>
            <p><strong>Password:</strong> {selectedUser.password}</p>
            <p><strong>Balance:</strong> ₹{selectedUser.balance}</p>
            
            <hr style={{ borderColor: '#444', margin: '15px 0' }} />
            <h4>Manage Funds</h4>
            <input type="number" placeholder="Enter Amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px', marginBottom: '15px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => modifyUserFund('add')} style={{ background: '#28a745', color: '#fff', padding: '8px 15px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Add Fund (+)</button>
              <button onClick={() => modifyUserFund('deduct')} style={{ background: '#dc3545', color: '#fff', padding: '8px 15px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Deduct (-)</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'game') {
    return (
      <div style={{ background: '#121212', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <h2>Active Ludo Match</h2>
        <p style={{ color: '#28a745', margin: '10px 0' }}>Prize Pool: ₹{gameData?.prize}</p>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', textAlign: 'center', width: '300px', border: '1px solid #444' }}>
          <h3>Dice Value: {diceVal !== null ? diceVal : '-'}</h3>
          <button onClick={() => socket.emit('roll_dice', { gameId: gameData.id })} style={{ padding: '10px 20px', background: '#ffc107', color: '#000', border: 'none', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold', marginTop: '15px' }}>Roll Dice</button>
        </div>
        <button onClick={() => setView('home')} style={{ marginTop: '25px', padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Leave Game</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#121212', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e1e1e', padding: '15px', borderRadius: '8px' }}>
        <h3>Ludo Supreme VIP</h3>
        <div>
          <span><b>{user?.name}</b> ({user?.phone}) | Balance: <b>₹{user?.balance}</b></span>
          <button onClick={() => setView('login')} style={{ marginLeft: '15px', background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ background: '#2c2c2c', padding: '10px', borderRadius: '5px', margin: '15px 0', textAlign: 'center', color: '#ffc107' }}>
        {notice}
      </div>

      {searchStatus && <p style={{ textAlign: 'center', color: '#007bff', fontWeight: 'bold' }}>{searchStatus}</p>}

      <h2 style={{ textAlign: 'center', margin: '20px 0' }}>Select Battle Mode</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', width: '250px', textAlign: 'center', border: '1px solid #444' }}>
          <h4>1v1 Battle (2 Players)</h4>
          <p>Stake: ₹100 | Win: ₹180</p>
          <button onClick={() => findMatch(2, 100)} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>Play ₹100</button>
        </div>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', width: '250px', textAlign: 'center', border: '1px solid #444' }}>
          <h4>1v1 Battle (2 Players)</h4>
          <p>Stake: ₹500 | Win: ₹900</p>
          <button onClick={() => findMatch(2, 500)} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>Play ₹500</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', flexWrap: 'wrap' }}>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', width: '320px', border: '1px solid #444' }}>
          <h4>Deposit Money</h4>
          <input type="number" placeholder="Amount" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#2c2c2c', border: '1px solid #555', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
          <input type="text" placeholder="UTR / Transaction ID" value={utr} onChange={e => setUtr(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#2c2c2c', border: '1px solid #555', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
          <button onClick={submitDeposit} style={{ width: '100%', padding: '8px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>Submit Deposit</button>
        </div>

        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', width: '320px', border: '1px solid #444' }}>
          <h4>Withdraw Money</h4>
          <input type="number" placeholder="Amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#2c2c2c', border: '1px solid #555', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
          <input type="text" placeholder="UPI ID (e.g. user@paytm)" value={upi} onChange={e => setUpi(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#2c2c2c', border: '1px solid #555', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
          <button onClick={submitWithdraw} style={{ width: '100%', padding: '8px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>Withdraw</button>
        </div>
      </div>
    </div>
  );
}