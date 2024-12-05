const User = require("../../models/userSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("dotenv").config();


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const loadWalletPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("wallet", { userData });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};
//===================================================


const createRechargeOrder = async (req, res) => {
    try {
        const amount = req.body.amount * 100;
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`,
        };
        console.log("amount in recharge",amount);
        const order = await razorpay.orders.create(options);

        res.status(200).json({
            key: process.env.RAZORPAY_KEY_ID,
            amount: amount,
            currency: "INR",
            order_id: order.id,
            prefill: {
                name: req.session.user.name,
                email: req.session.user.email,
                contact: req.session.user.phone,
            },
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Error creating Razorpay order" });
    }
};

const verifyAndrecharge = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log('in veryfy recieved amount is :',req.body.amount);
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature,amount } = req.body;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing payment details" 
            });
        }
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const hmac = crypto.createHmac('sha256', `${process.env.RAZORPAY_KEY_SECRET}`);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({success:false, error: 'Invalid signature' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const amountInRupees = parseFloat(amount) / 100; 
        if (isNaN(amountInRupees) || amountInRupees <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        user.wallet.balance += amountInRupees; 
        await user.save();
        res.status(200).json({
            success:true,
            message:"Wallet recharged Successfully",
        })
    } catch (error) { 
        console.error('error for verifying recharge',error);
        res.status(500).json({
            success:false,
            error:"Payment verification Failed",
        })
    }
};
module.exports = {
    createRechargeOrder,
    loadWalletPage,
    verifyAndrecharge,
};
