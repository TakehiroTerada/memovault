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

app.put('/api/memos/:id', authenticateToken, async (req,res) => {
    const userId = req.user.userId;
    const memoId = req.params.id;
    const { title, content } = req.body;
    
    if (!title && !content){
        return res.status(400).json({ message: "更新する内容を入力してください" });
    }

    try{
        let sql = 'UPDATE memos SET '
        let params = [];
        
        if (title){
            sql += 'title = ?, ';
            params.push(title);
        }

        if (content){
            sql += 'content = ?, ';
            params.push(content);
        }

        sql = sql.slice(0,-2);
        sql += ' WHERE user_id = ? AND memo_id = ?';
        params.push(userId, memoId);
        const [results] = await db.query(sql, params);

        if (results.affectedRows === 0){
            return res.status(404).json({ message: "更新に失敗しました" });
        }
        
        res.status(200).json({ message: "更新完了" });
    }catch(error){
        console.log(error);
        res.status(500).json({ message: "サーバーエラー" });
    }
});

app.post('/api/tag', authenticateToken, async (req,res) => {
    const { memo_id, tag_name } = req.body;
    const user_id = req.user.userId;
    if(!memo_id || !tag_name){
        return res.status(400).json({ message: "未記入箇所があります"} );
    }
    try{
        const sql = 'INSERT INTO tags (memo_id, user_id, tag_name) VALUES ( ?, ?, ?);'
        const [results] = await db.query(sql, [memo_id, user_id, tag_name]);
        
        return res.status(201).json({ message: "登録完了"});
    }catch(error){
        console.log(error)
        return res.status(500).json({ message: "サーバーエラー", error: error.message });
    }
});

app.get('/api/memos', authenticateToken, async (req,res) => {
    try{
        const userId = req.user.userId;
        const sql = 'SELECT * FROM memos where user_id = ? ;'
        const [rusults] = await db.query(sql, [userId]);
        
        res.status(200).json(rusults);
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "サーバーエラー", error: error.message});
    }
});

app.get('/api/memos/search', authenticateToken, async (req,res) => {
    const userId = req.user.userId;
    const { tagName, keyword } = req.query;
    try{
        let sql = "SELECT DISTINCT m.* FROM memos AS m JOIN tags AS t ON m.memo_id = t.memo_id WHERE m.user_id = ? "
        let params = [userId];

        if (tagName){
            const tags = tagName.split(",");
            sql += `AND t.tag_name IN (${tags.map( () => "?").join(",")}) `;
            params.push(...tags); 
        }
        if (keyword){
            sql += `AND (m.title LIKE ? OR m.content LIKE ?)`;
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        const [results] = await db.query(sql, params);
        return res.status(200).json(results);
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "サーバーエラー", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`サーバーが起動しました。 ${PORT}`);
});