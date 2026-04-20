require('dotenv').config({path: '.env'});

const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const NODE_ENV = process.env.NODE_ENV;
const PORT = process.env.PORT;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});

db.getConnection().then((connection) => {
    console.log("DB 接続成功");
    connection.release();
}).catch((err) => {
    console.log("DB 接続失敗:", err);
});

app.post("/register", async (req, res) => {
    const { email, userName, password } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: "メールアドレスを入力してください" });
    }
    if (!userName) {
        return res.status(400).json({ message: "ユーザー名を入力してください" });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "パスワードは6文字以上必要です" });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
        const [results] = await db.query(sql, [email, password_hash, userName]);
        
        res.status(201).json({ message: "アカウント登録が完了しました。" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: '既に登録済みのユーザーです' });
        }
        return res.status(500).json({ message: "サーバーエラー", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`サーバーが起動しました。 ${PORT}`);
});