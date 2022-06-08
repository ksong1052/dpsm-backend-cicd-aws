const express = require('express');
const router = express.Router();
const multer = require('multer');

const { Product } = require('../models/product');

//=================================
//             Product
//=================================

// 이미지 upload를 위한 Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {      
      cb(null, `${Date.now()}_${file.originalname}`)
    }
}); 
const upload = multer({ storage: storage }).single("file");

router.post('/image', (req, res) => {
    // 가져온 이미지 저장
    upload(req, res, err => {
        if(err) {
            return req.json({ success: false, err });
        }         
        return res.json({ success: true, filePath: res.req.file.path, fileName: res.req.file.filename });
    })
});

router.post('/', (req, res) => {  
  // 받아 온 정보를 DB에 저장
  const product = new Product(req.body);
  product.save((err) => {
    if(err) return res.status(400).json({success: false, err});
    return res.status(200).json({success: true});
  });
});

// 모든 product를 가져오기
router.post('/allproducts', (req, res) => {  

  // Product collection에 들어 있는 모든 상품 가져오기
  // 특정 field를 이용해서 특정 schema의 모든 정보를 가져올 수 있다.
  // 해당 wdbpage에서 정해져 있는 숫자만큼의 image만 display되게...skip과 limit를 사용한다.
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;
  let limit = req.body.limit ? parseInt(req.body.limit) : 20;
  let term = req.body.searchTerm;

  // Filtering 검색하기 위한 조건 만들기 - continents and price
  let findArgs = {};

  // Continent and Price Conditions
  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      // console.log({key});

      if(key === "price") {
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1]
        }
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  // console.log({findArgs});

  // find() : 조건 없이 모든 값을 가져온다.
  // find(condition) : 조건에 맞는 값만 가져온다.

  // .find({ $text: { $search: term }}) => 검색어가 있으면 검색조건을 이것처럼 추가해 준다. schema에서도 관련 설정해 줘야 한다.
  
  //  like 검색으로 하고 싶으면
  //   .find({
  //     "title": { '$regex': term },
  //     "description": { '$regex': term },
  //  })
  if(term) {
    Product.find(findArgs)
      .find({
          "title": { '$regex': term },
          "description": { '$regex': term },
      })
      .populate("writer")
      .skip(skip)
      .limit(limit)
      .exec((err, productInfo) => {
        if(err) return res.status(400).json({ success: false, err });
        return res.status(200).json({ success: true, productInfo, postSize: productInfo.length });
      }
    ) 
  } else {
    
    Product.find(findArgs)
      .populate("writer")
      .skip(skip)
      .limit(limit)
      .exec((err, productInfo) => {
        if(err) return res.status(400).json({ success: false, err });
        return res.status(200).json({ success: true, productInfo, postSize: productInfo.length });
      }
    )  
  }  
});

// Product Detail Page
router.get('/productDetail', (req, res) => {  
  // productId를 이용해서 DB에서 해당 정보를 가져온다.
  // queryString에서 요청한 이름의 값으로 정보를 가져 올 때는 req.query를 이용해야 한다.
  let type = req.query.type;
  let productIds = req.query.id;

  if(type === "array") {
    // id=1232132,234234,4354353 이렇게 querystring으로 온 값을 
    // productIds=[1232132,234234,4354353]이렇게 바꿘줘서 DB에 query한다.
    let ids = productIds.split(',');
    productIds = ids.map(item => {
      return item;
    });
  }

  // $in : 조건에 해당 하는 값이 여러개 일 때 사용  
  // Product.find({ _id: productId }) => 조건에 해당 하는 값이 1개일 때
  Product.find({ _id: {$in: productIds} })
    .populate('writer')
    .exec((err, product) => {
      if(err) return res.status(400).send(err);
      return res.status(200).send(product);
    })

});


module.exports = router;