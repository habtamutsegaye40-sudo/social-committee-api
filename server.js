const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🗄️ 🌍 ከAiven የኢንተርኔት MySQL ዳታቤዝ ጋር ማገናኛ
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
        console.error('❌ የኢንተርኔት ዳታቤዝ ግንኙነት አልተሳካም፦ ' + err.message);
        return;
    }
    console.log('🌍 🔗 Aiven MySQL የኢንተርኔት ዳታቤዝ በተሳካ ሁኔታ ተገናኝቷል!');

    // 🏗️ 1. የአባላት ሰንጠረዥ በራስ-ሰር መፍጠሪያ
    db.query(`CREATE TABLE IF NOT EXISTS Allowed_Admins (
        admin_id VARCHAR(50) PRIMARY KEY,
        admin_name VARCHAR(100),
        role VARCHAR(50),
        password VARCHAR(100),
        phone_number VARCHAR(20)
    )`, (err) => { if (err) console.log("Admins Table Error: ", err); });

    // 🏗️ 2. የኮፒ ቤት መዛግብት ሰንጠረዥ በራስ-ሰር መፍጠሪያ
    db.query(`CREATE TABLE IF NOT EXISTS Copy_Shop_Records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id VARCHAR(50),
        wasted_papers INT,
        unsold_papers INT,
        damaged_papers INT,
        collected_cash DECIMAL(10,2),
        system_loss DECIMAL(10,2),
        record_date DATE,
        FOREIGN KEY (admin_id) REFERENCES Allowed_Admins(admin_id)
    )`, (err) => { if (err) console.log("Copy Table Error: ", err); });

    // 🏗️ 3. የፋይናንስ ገቢ/ወጪ ሰንጠረዥ በራስ-ሰር መፍጠሪያ
    db.query(`CREATE TABLE IF NOT EXISTS Committee_Finance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id VARCHAR(50),
        transaction_type VARCHAR(20),
        amount DECIMAL(10,2),
        reason TEXT,
        ref_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES Allowed_Admins(admin_id)
    )`, (err) => { if (err) console.log("Finance Table Error: ", err); });

    // 🔑 4. የሙከራ አባል (ID-04) በራስ-ሰር ማስገቢያ
    db.query(`INSERT IGNORE INTO Allowed_Admins (admin_id, admin_name, role, password, phone_number) 
              VALUES ('ID-04', 'ሀብታሙ', 'ገንዘብ ያዥ', 'cash123', '0911111111')`, 
    (err) => {
        if (!err) console.log("የሙከራ አባል መረጃ በተሳካ ሁኔታ ተዘጋጅቷል!");
    });
});

// ==========================================
// 🔑 ማዕከል 1፦ የደህንነት መስመሮች (Authentication)
// ==========================================
app.post('/api/login', (req, res) => {
    const { admin_id, password } = req.body;
    const query = "SELECT * FROM Allowed_Admins WHERE admin_id = ? AND password = ?";
    
    db.query(query, [admin_id, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: "❌ የተሳሳተ መታወቂያ (ID) ወይም የይለፍ ቃል!" });

        const user = results[0];
        res.json({ message: "✔️ በተሳካ ሁኔታ ገብተዋል", user: { id: user.admin_id, name: user.admin_name, role: user.role, phone: user.phone_number } });
    });
});

// ==========================================
// 🖨️ ማዕከል 2፦ የኮፒ ቤት ቁጥጥር መስመሮች
// ==========================================
app.post('/api/copy-shop/record', (req, res) => {
    const { admin_id, wasted_papers, unsold_papers, damaged_papers, collected_cash, record_date } = req.body;
    const loss = (parseInt(wasted_papers || 0) + parseInt(damaged_papers || 0)) * 2.00;

    const query = "INSERT INTO Copy_Shop_Records (admin_id, wasted_papers, unsold_papers, damaged_papers, collected_cash, system_loss, record_date) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    db.query(query, [admin_id, wasted_papers, unsold_papers, damaged_papers, collected_cash, loss, record_date], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "✔️ የኮፒ ቤት መረጃ በተሳካ ሁኔታ ተመዝግቧል!" });
    });
});

// ==========================================
// 💰 ማዕከል 3፦ የፋይናንስ መስመሮች
// ==========================================
app.post('/api/finance/add', (req, res) => {
    const { admin_id, transaction_type, amount, reason, ref_number, admin_phone } = req.body;
    
    const query = "INSERT INTO Committee_Finance (admin_id, transaction_type, amount, reason, ref_number) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [admin_id, transaction_type, amount, reason, ref_number], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const smsMsg = `🔔 የክፍያ ማሳወቂያ (${transaction_type})፦\nመጠን፦ ${amount} ብር\nምክንያት፦ ${reason}\nአዲስ ከተማ ማኅበራዊ ኮሚቴ`;

        axios.post('https://api.afromessage.com/api/send', {
            to: admin_phone || '0911111111',
            message: smsMsg,
            sender: 'AKGSS',
            callback: ''
        }, {
            headers: { 'Authorization': 'Bearer YOUR_AFROMESSAGE_KEY' }
        })
        .then(() => console.log("SMS ተልኳል 📱"))
        .catch((e) => console.log("SMS አልተላከም"));

        res.json({ message: "✔️ የፋይናንስ መረጃው ተመዝግቧል!" });
    });
});

// ==========================================
// 📊 ማዕከል 4፦ የሪፖርት ማሳያ መስመሮች
// ==========================================
app.get('/api/copy-shop/history', (req, res) => {
    const query = "SELECT c.*, a.admin_name FROM Copy_Shop_Records c JOIN Allowed_Admins a ON c.admin_id = a.admin_id ORDER BY c.record_date DESC";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/finance/history', (req, res) => {
    const query = "SELECT f.*, a.admin_name FROM Committee_Finance f JOIN Allowed_Admins a ON f.admin_id = a.admin_id ORDER BY f.created_at DESC";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 ሰርቨሩ በወደብ ${PORT} ላይ ሥራ ጀምሯል!`);
});

// ይህች መስመር ለVercel በጣም ወሳኝ ናት!
module.exports = app;
});