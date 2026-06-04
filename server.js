const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// የዳታቤዝ ግንኙነት
const db = mysql.createConnection({
    host: 'mysql-8cd4ee7-habtamutsegaye40-e36f.l.aivencloud.com',
    port: 19632,
    user: 'avnadmin',
    password: 'AVNS_E_BKbKqdv4rFej5ikWW',
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

// መረጃ ለማምጣት (GET)
app.get('/api/copy-shop', (req, res) => {
    db.query('SELECT * FROM copy_logs ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// መረጃ ለመመዝገብ (POST)
app.post('/api/copy-shop', (req, res) => {
    const { memberId, status, quantity } = req.body;
    db.query('INSERT INTO copy_logs (member_id, status, quantity) VALUES (?, ?, ?)', 
    [memberId, status, quantity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'ተመዝግቧል!' });
    });
});

module.exports = app;