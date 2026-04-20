const jwt = require('jsonwebtoken');
const authenticate  = (req, res, next) => {
    const authHeder = req.headers['authorization'];
    const token = authHeder && authHeader.split(' ')[1];

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

module.exports = authenticate;