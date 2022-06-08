const express = require('express');
const router = express.Router();

// auth.js or user.js에서 module.exports를 {}를 사용하여 선언해 주면 받는 곳에서도 {}으로 받아야 한다.
const { User } = require('../models/user');
const { Product } = require('../models/product');
const { Payment } = require('../models/Payment');
const { auth } = require('../middleware/auth');
const async = require('async');

//=================================
//             User
//=================================

// Auth 설정 (token을 이용)
router.get('/auth', auth, (req, res) => {
  // Middleware인 auth.js에서 넘겨 준 정보를 받았다는 것은 error없이 진해이 되었다는 의미. Authentication이 true라는 말.
  // 여기에서의 req는 middleware에서 받아 온 req이다.
  // role이 0이면 일반 유저, O이 아니면 관리자
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
    cart: req.user.cart,
    history: req.user.history
  });
});

router.post('/register', (req, res) => {
  // 회원 가입 할 때 필요한 정보들을 client에서 가져오면 그것들을 database에 넣어 준다.
  const user = new User(req.body);
  // console.log("user: ",user);

  user.save((err, userInfo) => {
    if(err) return res.json({ registerSuccess: false, err });
    return res.status(200).json({ 
      registerSuccess: true
    });
  });
});

router.post('/login', (req, res) => {
  // 1. 요청된 email을 Database에서 찾는다.
  User.findOne({ email: req.body.email }, (err, user) => {
    if(!user) {
      return res.json({
        loginSuccess: false,
        message: "There is no email you are looking for."
      })
    };

    // 2. email이 같다면 password가 일치하는지 확인
    user.comparePassword(req.body.password, (err, isMatch) => {
      if(!isMatch) {
        return res.json({
          loginSuccess: false, 
          message: "Something wrong!"
        })
      }

      // 3. password까지 확인이 되면, token을 생성
      user.generateToken((err, user) => {
        if(err) return res.status(400).send(err);

        // token을 저장. 어디에 저장할지? Cookie, Session, or LocalStorage
        // token은 권한이 있는 사용자인지 아닌지를 페이지 이동 때마다 지속적으로 check한다.
        res.cookie("x_auth", user.token)
          .status(200)
          .json({
            loginSuccess: true,
            userId: user._id
          })
      })   
    });
  });  
});

router.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "", tokenExp: "" }, (err, doc) => {
      if (err) return res.json({ success: false, err });
      return res.status(200).send({
          success: true
      });
  });
});

router.post("/addToCart", auth, (req, res) => {
  // 1. User Collection에 해당 User 정보 가져오기
  // 여기서 req.user는 auth에서 받아 오는 것이다.
  User.findOne({ _id: req.user._id }, 
    (err, userInfo) => {
      // 2. 가져 온 정보에서 카트에다 넣으려 하는 상품이 이미 들어 있는지 확인
      let duplicate = false;
      userInfo.cart.forEach((item) => {
        if(item.id === req.body.productId) {
          duplicate = true;
        }
      }
    )
      
    // { _id: req.user._id, "cart.id": req.body.productId }, => 이 두개의 조건으로 해당 정보를 찾아 업데이트 시킴
    // { $inc: { "cart.$.quantity": 1 } }, => 원하는 field값을 1 증가 
    // cart.$.quantity => 여기서 $의 역할은 Cart라는 Array안의 quantity 중에서 업데이트할 요소를 식별해줍니다 ~ ! 
    // { new: true } => update된 정보를 받기 위한 설정
    if(duplicate) { // 2-1. 상품이 이미 있을 때      
      User.findOneAndUpdate(
        { _id: req.user._id, "cart.id": req.body.productId },
        { $inc: { "cart.$.quantity": 1 } },
        { new: true },
        (err, userInfo) => {
          if(err) return res.status(400).json({ success: false, err });          
          res.status(200).send(userInfo.cart);
        }
      )
    } else { // 2-2. 상품이 있지 않을 때      
      User.findOneAndUpdate(        
        { _id: req.user._id },
        {
          $push: {
            cart: {
              id: req.body.productId,
              quantity: 1,
              date: Date.now()
            }
          }
        },
        { new: true },
        (err, userInfo) => {
          if(err) return res.status(400).json({ success: false, err });          
          res.status(200).send(userInfo.cart);
        }
      )
    }
  })  
});


// 카트에 있는 Item 지우기
router.get('/removeFromCart', auth, (req, res) => {
  // 1. Cart안에 있는 item 지우기
  User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $pull: {
        cart: {
          id: req.query.id
        }
      }
    },
    { new: true },
    (err, userInfo) => {
      let cart = userInfo.cart;
      let array = cart.map(item => {
        return item.id
      })

      // 2. product collection에서 현재 남아 있는 상품들의 정보를 가져오기
      Product.find({ _id: { $in: array } })
        .populate('writer')
        .exec((err, productInfo) => {
          return res.status(200).json({
            productInfo,
            cart
          })
        })
    }
  )  
});

// Cart Payment
router.post('/successBuy', auth, (req, res) => {  
  let history = [];
  let transactionData = {};

  // 1. User Collection 안에 History필드 안에 간단한 결제 정보 넣어 주기
  req.body.cartDetail.forEach((item) => {
    history.push({
      dateOfPurchase: Date.now(),
      name: item.title,
      id: item._id,
      price: item.price,
      quantity: item.quantity,
      paymentId: req.body.paymentData.paymentID
    })
  });

  // 2. Payment Collection 안에 자세한 정보 넣어 주기
  transactionData.user = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email
  }

  transactionData.data = req.body.paymentData;
  transactionData.product = history;

  // User Collection의 history field에 정보 저장
  User.findOneAndUpdate(
    { _id: req.user._id },
    { $push: { history: history }, $set: { cart: []} },
    { new: true },
    (err, user) => {
      if(err) return res.status(400).json({ success: false, err });

      // payment에 transactionData 정보 저장
      const payment = new Payment(transactionData);
      payment.save((err, doc) => {
        if(err) return res.status(400).json({ success: false, err });

        // 3. Product Collection에 있는 sold 필드 업데이트


        // 상품 당 몇개의 quantity를 샀는지
        let products = [];
        doc.product.forEach(item => {
          products.push({ id: item.id, quantity: item.quantity })
        })

        async.eachSeries(products, (item, callback) => {
          Product.update(
            { _id: item.id },
            {
              $inc: {
                sold : item.quantity
              }
            },
            { new: false },
            callback
          )
        }, (err) => {
          if(err) return res.status(400).json({ success: false, err })
          res.status(200).json({ 
            success: true, 
            cart: user.cart, 
            cartDetail: []
          })
        });
      });
    }
  )
});

module.exports = router;