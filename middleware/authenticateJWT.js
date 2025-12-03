const jwt = require('jsonwebtoken');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const secretKey = process.env.SESSION_SECRET;
const checkAuthenticated = (req, res, next) => {
    try {
        const token = req.cookies.token;
        const isJsonRequest = req.headers['content-type'] === 'application/json' || req.xhr || req.path.includes('/api/');

        if (!token) {
            if (isJsonRequest) {
                return res.status(401).json({ error: "Unauthorized, Please Login to continue" });
            }
            return res.render('login.ejs', { messages: { error: "Unauthorized, Please Login to continue" } });
        }

        jwt.verify(token, secretKey, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (user.exp < currentTimestamp) {
                if (isJsonRequest) {
                    return res.status(401).json({ error: "Session Timeout, Please Login to continue" });
                }
                return res.render('login.ejs', { messages: { error: "Session Timeout, Please Login to continue" } });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        console.error("Error Authentication:", error);
        const isJsonRequest = req.headers['content-type'] === 'application/json' || req.xhr || req.path.includes('/api/');
        if (isJsonRequest) {
            return res.status(500).json({ error: "Authentication error occurred" });
        }
        return res.status(500).render('login.ejs', { messages: { error: "Authentication error occurred" } });
    }
};

module.exports = checkAuthenticated;