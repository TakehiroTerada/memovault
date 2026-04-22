const jwt = require('jsonwebtoken');
const authenticate  = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        return res.status(401).json({ message: "トークンがありません" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'トークンが無効です' });
        }
        req.user = user;
        next();
    });
};
// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJOYW1lIjoidGVzdG5hbWUiLCJpYXQiOjE3NzY4NTk4NzcsImV4cCI6MTc3Njg2MzQ3N30.mKtgY4dPg6KgAz7N6l5V-_t2In4MOvpS62dK29brab8
module.exports = authenticate;