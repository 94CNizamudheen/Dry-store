const mongoose= require("mongoose");
const {Schema}= mongoose;

const catogorySchema= new Schema({
    name:{
        type:String,
        required :true,
        unique:true,
    },
    description:{
        type:String,
        required :true
    },
    isListed:{
        type:Boolean,
        default :true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdOn:{
        type:Date,
        default:Date.now,
    },

});
const Category = mongoose.model("Category",catogorySchema);
module.exports= Category;