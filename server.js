const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// የCORS ችግርን ለመፍታት (ሁሉንም ጥያቄዎች እንዲቀበል)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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

db.connect((err) => {
    if (err) {
        console.error('የዳታቤዝ ግንኙነት ስህተት:', err);
    } else {
        console.log('✅ ዳታቤዝ በተሳካ ሁኔታ ተገናኝቷል!');
    }
});

// መረጃ ለማምጣት
app.get('/api/copy-shop', (req, res) => {
    const sql = 'SELECT * FROM copy_logs ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// መረጃ ለመመዝገብ
app.post('/api/copy-shop', (req, res) => {
    const { memberId, status, quantity } = req.body;
    const sql = 'INSERT INTO copy_logs (member_id, status, quantity) VALUES (?, ?, ?)';
    db.query(sql, [memberId, status, quantity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'መረጃው ተመዝግቧል!' });
    });
});

// ለVercel እና ለኮምፒውተር የሚሰራ ሰርቨር ማስነሻ
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 ሰርቨሩ በወደብ ${PORT} ላይ ሥራ ጀምሯል!`);
});

// ለVercel ስራ አስፈላጊ ነው
module.exports = app;