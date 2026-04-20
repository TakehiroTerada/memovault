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


app.listen(PORT, () => {
    console.log(`サーバーが起動しました。 ${PORT}`);
});