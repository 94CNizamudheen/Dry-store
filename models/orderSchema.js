const mongoose= require("mongoose");
const {Schema}= mongoose;
const {v4:uuidv4}=require("uuid");


const orderSchema= new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true,
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true,
        },
        price:{
            type:Number,
            default:0,
        },
    }],
    totalPrice:{
        type:Number,
        required:true,
    },
    discount:{
        type:Number,
        default:0,
    },
    finalAmount:{
        type:Number,
        required:true,
    },
    shippingAddress:{
        addressType: { type: String, required: true },
        name: { type: String, required: true },
        pincode: { type: Number, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        landmark: { type: String },
        phone: { type: Array, required: true },
        altPhone: {type: Array, required: true },
       
    },
    invoiceDate:{
        type:Date,
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Retern Request','Returned']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true,
    },
    coupenApplid:{
        type:Boolean,
        default:false,
        
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
})
const Order = mongoose.model ("Order",orderSchema);
module.exports = Order;