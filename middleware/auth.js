const { User } = require('../models/user');

let auth = (req, res, next) => {

    // 인증처리를 하는 곳

    // Client의 Cookie에서 Token을 가져온다.
    let token = req.cookies.x_auth;

    // Token을 복호화해서 user를 찾는다.
    User.findByToken(token, (err, user) => {
        if(err) throw err;
        if(!user) 
            return res.json({ 
                isAuth: false, 
                error: true 
            });

        // Middleware인  여기에서 받아 온 user 정보를 넘겨 주기 위한 것
        req.token = token;
        req.user = user; 
        next();
    });
}

module.exports = { auth };