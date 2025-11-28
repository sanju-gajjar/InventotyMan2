const jwt = require('jsonwebtoken');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const secretKey = process.env.SESSION_SECRET;
const checkAuthenticated = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.render('login.ejs', { messages: { error: "Unauthorized, Please Login to continue" } });
        }

        jwt.verify(token, secretKey, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (user.exp < currentTimestamp) {
                return res.render('login.ejs', { messages: { error: "Session Timeout, Please Login to continue" } });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        console.error("Error Authentication:", error);
        return res.status(500).render('login.ejs', { messages: { error: "Authentication error occurred" } });
    }
};

module.exports = checkAuthenticated;