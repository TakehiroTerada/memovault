require('dotenv').config({path: `${__dirname}/.env`});

const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const authenticateToken = require('./middleware/authToken');

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

app.post('/login', async (req,res) => {
    const {email,userName,password} = req.body;
    if(!email){
        return res.status(400).json({ message: "メールアドレスを入力してください" });
    }
    if(!userName){
        return res.status(400).json({ message: "ユーザ名を入力してください" });
    }
    if(!password){
        return res.status(400).json({ message: "パスワードを入力してください" });
    }

    try{
        const sql = 'SELECT * FROM users where email = ? ;';
        const [results] = await db.query(sql, [email]);
        if(results.length === 0){
            return res.status(401).json({ message: "登録されていないアカウントです" });
        }
        const isMatch = await bcrypt.compare(password, results[0].password);
        if(!isMatch){
            return res.status(401).json({ message: "認証失敗" });
        }

        const token = jwt.sign(
            { userId: results[0].id, userName: results[0].name },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ message: "ログイン成功", token });
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "サーバーエラー", error: error.message });
    }
});

app.post('/logout', authenticateToken, async (req,res) => {
        res.json({ message: 'ログアウトしました' });
});

app.post('/api/memos', authenticateToken, async (req,res) => {
    const userId = req.user.userId;
    const { title, content } = req.body;
    if (!title || !content){
        return res.status(400).json({ message: "未記入箇所があります" });
    }

    try{
        const sql = 'INSERT INTO memos ( user_id, title, content) VALUES ( ?, ?, ?);';
        const [results] = await db.query(sql, [userId,title,content]);
        if (results.affectedRows === 0){
            return res.status(401).json({ message: "登録に失敗しました" });
        }
        res.status(201).json({ message: "メモが作成されました" });
    }catch(error){
        console.log(error);
        res.status(500).json({ message: "サーバーエラー", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`サーバーが起動しました。 ${PORT}`);
});