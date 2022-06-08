const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const secretKey = "secretToken";

const userSchema = mongoose.Schema({
    name: {
        type: String,
        maxlength: 50
    },
    email: {
        type: String,
        trim: true,
        unique: 1
    },
    password: {
        type: String,
        minlength: 5
    },
    lastname: {
        type: String,
        maxlength: 50
    },
    role: {
        type: Number,
        default: 0
    },
    cart: {
        type: Array,
        default: []
    },
    history: {
        type: Array,
        default: []
    },
    image: String,
    token: {
        type: String
    },
    tokenExp: {
        type: Number
    }
})


// Mongoose에서 지원하는 함수 pre를 이용하여 'save'함수가 진행 되기 전에 설정해 준 함수를 먼저 실행 시키라는 의미
// next함수를 이용하는 의미는 해당 함수가 끝나면 save함수로 연결 시켜 주라는 의미
userSchema.pre('save', function(next){
    //이렇게 하면 현재 받아 온 user 정보 자신을 받아 온다.
    var user = this;

    // 이것을 안 해 주면 다른 field값이 변경되도 이 함수를 실행 시키기 때문에 
    // password에 대한 부분만을 위한 조건을 준다.
    if(user.isModified('password')) {
        // password 암호화
        bcrypt.genSalt(saltRounds, function(err, salt) {       
            if(err) return next(err);      
            
            bcrypt.hash(user.password, salt, function(err, hash) {  // hash는 암호화된 password
                if(err) return next(err);
                
                // 암화화된 password에 Error가 없으면 현재 password를 hash password로 바꿔 준다.
                user.password = hash;
                next();
            })
        });    
    } else {    // Password가 아니 다른 field를 변경 시키면 여리로..
        next();
    }
});


// User가 login시에 password가 일히하는지 확인
userSchema.methods.comparePassword = function(plainPassword, cb) {
    // 입력받은 password와 암화화된 DB에 있는 password 비교
    bcrypt.compare(plainPassword, this.password, function(err, isMatch) {
        if(err) return cb(err);
        cb(null, isMatch);
    });    
}

userSchema.methods.generateToken = function(cb) {
    const user = this;

    // jwt를 이용해서 token을 생성
    var generatedToken = jwt.sign(user._id.toHexString(), secretKey);

    user.token = generatedToken;
    user.save(function(err, user) {
        if(err) return cb(err);
        cb(null, user);
    });
} 
                   
userSchema.statics.findByToken = function(token, cb) {
    const user = this;

    // Token을 decode한다.
    jwt.verify(token, secretKey, function(err, decoded) {
        // User id를 이용해서 User를 찾은 다음, Client에서 가져 온 token과 DB에 보관된 Token이 일치하는지 확인
        user.findOne({"_id": decoded, "token": token}, function(err, user) {
            if(err) return cb(err);
            cb(null, user);
        });
    })
}

const User = mongoose.model('User', userSchema);

module.exports = { User };