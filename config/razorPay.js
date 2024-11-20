const Razorpay = require('razorpay');


const razorpayConfig = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
});


module.exports=razorpayConfig;
