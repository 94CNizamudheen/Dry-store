const mongoose= require('mongoose');
const {Schema}= mongoose;


const shippingData= new Schema({

state:{
    type:String,
    required:true,
    uniq:true,
    trim:true,
},
charge:{
    type:Number,
    required:true,
    min:0,
},

},{Timestamp:true});

const ShippinData= mongoose.model("ShippingCharge",shippingData);
module.exports=ShippinData;