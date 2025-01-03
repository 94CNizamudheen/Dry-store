const mongoose= require('mongoose');
const{Schema}= mongoose;

const productSchema= new Schema({
    productName:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    brand:{
        type:String,
        required:true,
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        
    },
    taxRate:{
        type:Number,
        required:false,
    },
    productOffer:{
        type:Number,
        default:0,
    },
    quantity:{
        type:Number,
        default:0,
    },
    productImage:{
        type:[String],
        required:true,
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    status:{
        type:String,
        enum:["Available","Out of stock"],
        required:true,
        default:"Available",
    },
    reviews: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
     }] ,

    stockHistory: [
        {
            date: { type: Date, default: Date.now },
            quantity: { type: Number, required: true },
            reason: { type: String, required: true },
            notes: { type: String },
        }
    ],

},{timestamps:true});

productSchema.pre('save', function (next) {
    if (this.isNew && !this.salePrice) {
        this.salePrice = this.regularPrice;
    }
    next();
});
const Product=mongoose.model("Product",productSchema);
module.exports=Product;