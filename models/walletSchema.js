const mongoose= require('mongoose');
const { default: items } = require('razorpay/dist/types/items');
const { default: products } = require('razorpay/dist/types/products');
const { default: refunds } = require('razorpay/dist/types/refunds');
const {Schema}= mongoose;

const walletSchema= new Schema({
    userId:{
        types:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
        },
        quantity:Number,
        price:Number,
    }],
    totalAmount:{
        type:Number,
        required:true,
    },
    status:{
        type:String,
        enum:['Pending', 'Completed', 'Cancelled'],
        default:'Pending',
    },
    refund:{
        isRefunded:{
            type:String,
            default:false,
        },
        refundMethod:{
            type:String,
            enum:['Wallet', 'Bank'],
            default:null,
        },
        refundDate:{
            typeL:Date,
        }
    }
});
const Wallet= mongoose.model("Wallet",walletSchema);
module.exports= Wallet;