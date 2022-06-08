const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = mongoose.Schema({
    writer: {
        type: Schema.Types.ObjectId,
        ref:'User'
    },
    title: {
        type:String,
        maxlength: 50
    },
    description: {
      type:String,  
    },
    price: {
        type:Number,
        default: 0
    },
    continents: {
      type:Number,
      default: 1
    },
    images: {
        type: Array,
        default: []
    },
    sold: {
      type: Number,
      maxlength: 100,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
}, { timestamps: true })

// 검색시에 keyward가 관련 있는 field 설정
// weights : 검색시 더 중요도 설정
productSchema.index({
    title: 'text',
    description: 'text'
}, {
    weights: {
      title: 5,
      description: 1
    }
})

const Product = mongoose.model('Product', productSchema);
module.exports = { Product }