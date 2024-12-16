const mongoose= require('mongoose');
const {Schema}=mongoose;

const reviewSchema= new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product', 
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5 
    },
    comment: {
        type: String,
        required: true,
        maxlength: 500 
    },
    date: {
        type: Date,
        default: Date.now
    }
});
const ReviewSchema= mongoose.model("Review",reviewSchema);
module.exports= ReviewSchema;