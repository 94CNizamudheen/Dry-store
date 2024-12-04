const User= require('../../models/userSchema');
const Product= require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Address= require('../../models/addressSchema');
const Cart =require('../../models/cartScema');
const { closeDelimiter } = require('ejs');
const Razorpay= require('razorpay');
const crypto= require('crypto');
const env = require('dotenv').config();
const { error } = require('console');
const Coupon= require('../../models/couponSchema');
const { session } = require('passport');
const ShippingData= require('../../models/shippingData')





const loadCheckOutPage = async (req, res) => {

    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const coupons= await Coupon.find();
        const addressData = await Address.findOne({ userId: userId });
        const cartedProducts = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            model: "Product",
            select: "productName productImage salePrice description regularPrice",
        });
        
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) {
            return res.render('cart',{
                isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            })
        }
        const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

        const shipping = 0;
        const total = subtotal + shipping;
        const discount=req.session.discount ||0;
        const discountedTotal=req.session.discountedTotal||0;
        const regularTotal= cart.items.reduce((sum,item)=>(sum+item.productId?.regularPrice||0)*item.quantity,0);
        const totalDiscount = cart.items.reduce((sum, item) => {
            const regularPrice = item.productId?.regularPrice || 0;
            const salePrice = item.productId?.salePrice || 0;
            return sum + ((regularPrice - salePrice) * item.quantity);
        }, 0);


        res.render('check-out', {
            user: userData,
            userAddress: addressData,
            cart: cartedProducts,
            isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            total: total,
            subtotal: subtotal,
            selectedAddress: req.session.selectedAddress || null, 
            discount:discount,
            discountedTotal:discountedTotal,
            coupons,
            totalDiscount,
            regularTotal
        });
    } catch (error) {
        console.error('Error loading checkout page:', error);
        res.redirect('/pageNotFound').status(500).json({ error: "Internal server error" });
    }
};

const postAddAddress=async(req,res)=>{
    try {
        const userId= req.session.user;
        const userData= await User.findOne({_id:userId});
        const {addressType, name, city, landmark, state, pincode, phone, altPhone}=req.body;
        const userAddress= await Address.findOne({userId:userData._id})
        if(!userAddress){
            const newAddress= new Address({
                userId:userData._id,
                address:{addressType, name, city, landmark, state, pincode, phone, altPhone}
            });
            await newAddress.save();
        }else{
            userAddress.address.push({addressType, name, city, landmark, state, pincode, phone, altPhone});
            await userAddress.save();
        }
        res.redirect('/check-out');
    } catch (error) {
        console.error("Error for adding Address",error);
        res.redirect('/pageNotFound')
    }
};

//=============================================================================================

const selectAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.query.id;

        req.session.selectedAddress = addressId;
        console.log("selected AddressId: ",req.session.selectedAddress)
        if (!addressId) {
            return res.status(400).json({ success: false, error: "Address ID is required." });
        }
        const addressDoc = await Address.findOne(
            { userId, 'address._id': addressId },
            { 'address.$': 1 }
        );
        const state= addressDoc.address[0].state;
        const shipping= await ShippingData.findOne({state:state});
        if (!shipping) {
            return res.status(404).json({ success: false, error: "Shipping data not found for the selected state." });
        }
        const shippingCharge=shipping.charge;
        req.session.shippingCharge= shippingCharge;

        res.status(200).json({ success: true, selectedAddress: addressId, shippingCharge:shippingCharge });
    } catch (error) {
        console.error("Error selecting address:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};
//===============================================================================================
    const handlePaymentMethod = async (req, res) => {
        try {
            console.log("Processing payment method");

            const userId = req.session.user;
            const { paymentOption } = req.body;
            const user= await User.findById(userId);
            const code= req.session.couponCode
            const coupon= await Coupon.findOne({code});
            const cart = await Cart.findOne({ userId }).populate('items.productId');
            const selectedAddressId = req.session.selectedAddress;
            if (!selectedAddressId) {
                return res.status(400).json({ error: "Please select a delivery address" });
            }   

        
            const total = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

            let finalAmount=0;
            const shipping = req.session.shippingCharge;
            if(coupon){
                finalAmount = req.session.discountedTotal;
            }else{
                finalAmount =total+shipping;
            } 
            if(paymentOption==="COD" && finalAmount<1000){
                return res.status(400).json({error:"Minimum amount for Cash On Delivery is ₹1000/- "})
            };

            console.log("paymentOption selected:",paymentOption);
            const validPaymentOption = ['COD', 'ONLINE',"WALLET"];
            if (paymentOption === 'WALLET') {
                if (user.wallet.balance < finalAmount) {
                    return res.status(400).json({ error: `Insufficient wallet balance. Balance ₹-${user.wallet.balance.toFixed(2)}`});
                }
            }

            if (!validPaymentOption.includes(paymentOption)) {
                return res.status(400).json({ error: "Invalid Payment Option" });
            }
            req.session.paymentMethod = paymentOption;
            console.log("pay mthd in sesion:", req.session.paymentMethod );
            res.json({ success: true });
        } catch (error) {
            console.error("Error for handling payment method:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    };
//================================================================================================  

const placeOrderForCODandWALLET = async (req, res) => {
    try {
        console.log("Place Order initiated");

        const userId = req.session.user;
        const selectedAddressId = req.session.selectedAddress;
        const paymentMethod = req.session.paymentMethod;
        
        if (!selectedAddressId) {
            return res.status(400).json({ error: "Please select a delivery address" });
        }

        if (!paymentMethod) {
            return res.status(400).json({ error: "Please select a payment method" });
        }
        const addressDoc = await Address.findOne({ "address._id": selectedAddressId });
        const shippingAddress = addressDoc.address.find(addr => addr._id.toString() === selectedAddressId);

        const code=req.session.couponCode;
        const coupon= await Coupon.findOne({code});
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        console.log("Selected shippingAddress:",selectedAddressId);

        const total = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        const discount= req.session.discount;
        let finalAmount=0;
        const shipping = req.session.shippingCharge;
        if(coupon){
             finalAmount = req.session.discountedTotal;
        }else{
            finalAmount =total+shipping;
        };
       
        if (paymentMethod === 'WALLET') {
            const user = await User.findById(userId);
            if (user.wallet.balance < finalAmount) {
                return res.status(400).json({ error: "Insufficient wallet balance." });
            }
           let points= user.rewardPoints += Math.floor(finalAmount * 0.02);
           console.log('Revard points:',points);
            user.wallet.balance -= finalAmount;
            await user.save();
        }
        
        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.totalPrice / item.quantity,
        }));
        
        const newOrder = new Order({
            orderedItems,
            totalPrice: total,
            finalAmount,
            shippingAddress: {
                addressType: shippingAddress.addressType,
                name: shippingAddress.name,
                pincode: shippingAddress.pincode,
                city: shippingAddress.city,
                state: shippingAddress.state,
                landmark: shippingAddress.landmark || "",
                phone: shippingAddress.phone || [],
                altPhone: shippingAddress.altPhone || [],
            },
            paymentDetails:{
                method:paymentMethod,
                paymentStatus:paymentMethod==="WALLET"?'Completed':'Pending',
            },
            status: 'Pending',
            invoiceDate: new Date(),
            user: userId,
            coupenApplid: !!coupon,
            discount:discount,
            couponCode:code,
            shippingCharge:shipping,
        });

        await newOrder.save();
        
        await Cart.deleteOne({ userId });
        
        if (coupon) {
            const userCouponUsage = coupon.userUsage.find(u => u.userId.toString() === userId.toString());
            if (userCouponUsage) {
                if (userCouponUsage.usageCount >= coupon.usageLimit) {
                    return res.status(400).json({ error: "Coupon usage limit exceeded for this user." });
                }
                userCouponUsage.usageCount += 1;
            } else {
                coupon.userUsage.push({ userId, usageCount: 1 });
            }
        
            await coupon.save();
        }
        
        for (const item of cart.items) {
            const product= await Product.findById(item.productId._id);
            const newQuantity= product.quantity - item.quantity;
            await Product.findByIdAndUpdate(item.productId._id,{
                $set:{quantity: newQuantity, status: newQuantity<1 ? "Out of stock" : "Available" }, },{new:true});
        }

        delete req.session.selectedAddress;
        delete req.session.paymentMethod;
        delete req.session.couponCode;
        delete req.session.discount;
        delete req.session.discountedTotal;
        delete req.session.shippingCharge;

        res.status(200).json({ success: true, redirectURL: `/order-success-page` });
    } catch (error) {
        console.error("Error occurred in Place Order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
//===============================================================================================
const loadOrderSuccessPage=async(req,res)=>{
    try {
        res.render('order-success-page')
    } catch (error) {
        console.error('error for load order success page');
        res.status(500).json({error:"Internal server error"});
    }
};
//=============================================================================================

const cancelOrder = async (req, res) => {
    try {
        const { orderId ,refundMethod} = req.query;  
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }
        console.log('Attempting to cancel order:', orderId);
        
        const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product user');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Order is already cancelled"
            });
        }
        const allowedStatusForCancel = ['Pending', 'Processing'];
        if (!allowedStatusForCancel.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order in ${order.status} status`
            });
        }
        for (const item of order.orderedItems) {
            const product = item.product;
            if (product) {
                product.quantity += item.quantity;
                if (product.status === 'Out of stock' && product.quantity > 0) {
                    product.status = 'Available';
                }
                await product.save();
            }
        }
        if((order.paymentDetails.method==='ONLINE'||order.paymentDetails.method==='WALLET') && order.paymentDetails.paymentStatus==="Completed"){
            console.log(`Processing refund for Order ${orderId}`);

            const user = await User.findById(order.user._id);

            if(!user){
                return res.status(404).json({
                    success:false,
                    message:"User not found"
                });
            }

            if (!user.wallet || typeof user.wallet !== 'object') {
                user.wallet = { balance: 0, transaction: [] };
            }

            if(refundMethod==="WALLET"){
                user.wallet.balance+=order.paymentDetails.paidAmount;
                user.wallet.transaction.push({
                    type:'credit',
                    amount:order.finalAmount,
                    description:`Refunded for cancelled order ${orderId}`,
                });
                await user.save();
                console.log(`Refund of ₹${order.finalAmount} added to user's Wallet  `);
            }else if(refundMethod==="BANK"){
                return res.status(500).json({
                    success:false,
                    message:"Bank transfer Currently un available. Sorry for the inconvenience "
                });
            }
          
        };
        
        order.status = 'Cancelled';
        await order.save();

        console.log(`Order ${orderId} cancelled and products restocked`);
        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            redirectUrl: '/user-profile'  
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel order",
            error: error.message
        });
    }
};
//===================================================================
const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, productId, refundMethod } = req.query;

        if (!orderId || !productId) {
            return res.status(400).json({
                success: false,
                message: "OrderId and ProductId are required",
            });
        }

        const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product user');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const itemIndex = order.orderedItems.findIndex(item => item.product._id.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in order",
            });
        }

        const item = order.orderedItems[itemIndex];
        const user = order.user;
        let cancelledItemValue=0;
        if ((order.paymentDetails.method === 'ONLINE' || order.paymentDetails.method === 'WALLET') && order.paymentDetails.paymentStatus === "Completed") {

             cancelledItemValue = item.price * item.quantity;
            user.wallet.balance += cancelledItemValue;
            user.wallet.transaction.push({
                type: "credit",
                amount: cancelledItemValue,
                description: `Refund for cancelled item: ${item.product.productName}`
            });
            await user.save();
        }

        item.product.quantity += item.quantity;
        if (item.product.status === "Out of stock" && item.product.quantity > 0) {
            item.product.status = "Available";
        }
        await item.product.save();

        order.partialCancelledDetails.push({
            product:item.product._id,
            quantity:item.quantity,
            originalQuantity:item.quantity,
            price:item.price,
            cancelledOn: new Date(),
            refundAmount:cancelledItemValue,
            refundMethod:refundMethod||null
            
        })

        const remainingItems = order.orderedItems.filter(orderItem => orderItem.product._id.toString() !== productId);
        const newTotalPrice = remainingItems.reduce((total, orderItem) => {
            return total + (orderItem.price * orderItem.quantity);
        }, 0);

        // Coupon handling
        let newDiscount = 0;
        let newFinalAmount = newTotalPrice;
        let couponRemoved = false;

        if (order.coupenApplid && order.couponCode) {
            const coupon = await Coupon.findOne({ code: order.couponCode });
        
            if (coupon) {
                if (newTotalPrice >= coupon.minimumPrice) {
                    if (coupon.discountType === 'percentage') {
                        newDiscount = Math.min(
                            (coupon.discountValue / 100) * newTotalPrice, 
                            newTotalPrice
                        );
                    } else if (coupon.discountType === 'flat') {
                        newDiscount = Math.min(coupon.discountValue, newTotalPrice);
                    }
                    newFinalAmount = newTotalPrice - newDiscount;
                } else {
                    
                    order.coupenApplid = false;
                    order.couponCode = null;
                    couponRemoved = true;
        
                    await Coupon.findOneAndUpdate(
                        { code: coupon.code },
                        { 
                            $pull: { userId: user._id },  
                            $inc: { timesUsed: -1 }     
                        }
                    );
                }
            }
        }
        

        order.orderedItems = remainingItems;
        order.totalPrice = newTotalPrice;
        order.discount = newDiscount;
        order.finalAmount = newFinalAmount;
        order.status = remainingItems.length > 0 ? 'Partially Cancelled' : "Cancelled";
        
        await order.save();

        return res.status(200).json({
            success: true,
            message: couponRemoved 
                ? "Item cancelled. Coupon removed due to insufficient order total." 
                : "Item cancelled",
            redirectUrl: '/user-profile'
        });

    } catch (error) {
        console.error('Error cancelling order item:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel order item",
            error: error.message
        });
    }
};


//===================================================================================================
const checkOrderPayment=async(req,res)=>{
    try {
        const {orderId}=req.query;
        const order = await Order.findOne({orderId});
        if(!order){
            return res.status(404).json({
                success:false,
                message:"Order not found",
            });
        }
        return res.status(200).json({
            success:true,
            isOnlinePayment:order.paymentDetails.method==="ONLINE" && order.paymentDetails.paymentStatus==="Completed"
        });

        
    } catch (error) {
        console.error("error for checking the order payment",error);
        res.status(500).json({
            success:false,
            message: "Failed to check payment status"
        })
    }
};
//================================================================================================
const createRazorpayOrder = async (req, res) => {
    try {
        
        const selectedAddressId = req.session.selectedAddress;
        if (!selectedAddressId) {
            return res.status(400).json({ error: "Please select a delivery address" });
        }
     
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                success: false,
                error: "Razorpay credentials are not configured"
            });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        
        const { amount } = req.body;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                error: "Invalid amount",
                success: false
            });
        }
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "User not authenticated"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
        });

        res.json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            order: {
                id: order.id,
                amount: Math.round(amount * 100),
                currency: order.currency,
            },
            customerName: user.name,
            customerEmail: user.email,
            customerPhone: user.phone
        });
        
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create Razorpay order"
        });
    }
};
//==============================================================================================
const verifyRazorpayPaymentAndPlaceOrder= async(req,res)=>{
    try {
        const userId= req.session.user;
        const { razorpay_payment_id}=req.body;
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const payment= await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status !== 'authorized') {
            return res.status(400).json({
                success: false,
                error: "Payment verification failed"
            });
            
        } else {
            const placeOrderAfterPayment = async () => {
                const selectedAddressId = req.session.selectedAddress;
                const paymentMethod = 'ONLINE';
                const user = await User.findById(userId);
                const addressDoc = await Address.findOne({ "address._id": selectedAddressId });
                const shippingAddress = addressDoc.address.find(addr => addr._id.toString() === selectedAddressId);
                const cart = await Cart.findOne({ userId }).populate('items.productId');
                const code =req.session.couponCode;
                const coupon= await Coupon.findOne({code})
                const discount= req.session.discount;
                const total = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
                const shipping = req.session.shippingCharge;
                let finalAmount=0;
                if(coupon){
                    finalAmount=req.session.discountedTotal;
                }else{
                    finalAmount = total + shipping;
                }
                
                user.rewardPoints += Math.floor(finalAmount * 0.02);
                await user.save();

                const orderedItems = cart.items.map(item => ({
                    product: item.productId._id,
                    quantity: item.quantity,
                    price: item.totalPrice / item.quantity,
                }));
                const newOrder = new Order({
                    orderedItems,
                    totalPrice: total,
                    finalAmount,
                    shippingAddress: {
                        addressType: shippingAddress.addressType,
                        name: shippingAddress.name,
                        pincode: shippingAddress.pincode,
                        city: shippingAddress.city,
                        state: shippingAddress.state,
                        landmark: shippingAddress.landmark || "",
                        phone: shippingAddress.phone || [],
                        altPhone: shippingAddress.altPhone || [],
                    },
                    paymentDetails:{
                        method: paymentMethod,
                        paymentStatus: "Completed",
                        transactionId: razorpay_payment_id,
                        paidAmount: payment.amount / 100,
                        paidAt: new Date()
                    },
                    status: 'Pending',
                    invoiceDate: new Date(),
                    user: userId,
                    coupenApplid: !!coupon,
                    discount:discount,
                    couponCode:code,
                    shippingCharge:shipping
                });

                await newOrder.save();
                if (coupon) {
                    const userCouponUsage = coupon.userUsage.find(u => u.userId.toString() === userId.toString());
                    if (userCouponUsage) {
                        if (userCouponUsage.usageCount >= coupon.usageLimit) {
                            return res.status(400).json({ error: "Coupon usage limit exceeded for this user." });
                        }
                        userCouponUsage.usageCount += 1;
                    } else {
                        coupon.userUsage.push({ userId, usageCount: 1 });
                    }
                
                    await coupon.save();
                }
                await Cart.deleteOne({ userId });

                for (const item of cart.items) {
                    const product = await Product.findById(item.productId._id);
                    const newQuantity = product.quantity - item.quantity;
                    await Product.findByIdAndUpdate(item.productId._id, {
                        $set: {
                            quantity: newQuantity, 
                            status: newQuantity < 1 ? "Out of stock" : "Available" 
                        }
                    }, { new: true });
                }

                delete req.session.selectedAddress;
                delete req.session.paymentMethod;
                delete req.session.couponCode;
                delete req.session.discount;
                delete req.session.discountedTotal;
                delete req.session.shippingCharge;
    
                return res.status(200).json({ 
                    success: true, 
                    redirectURL: `/order-success-page`,
                    orderId: newOrder._id 
                });
            };
            return await placeOrderAfterPayment();
        }
    } catch (error) {
        console.error('Payment verification Failed error : ',error);
        res.status(500).json({
            success:false,
            error:"Payment verification Failed"
        })
    }
};


module.exports={
    loadCheckOutPage,
    postAddAddress,
    selectAddress,
    handlePaymentMethod,
    placeOrderForCODandWALLET,
   loadOrderSuccessPage,
   cancelOrder,
   createRazorpayOrder,
   verifyRazorpayPaymentAndPlaceOrder,
   checkOrderPayment,
   cancelOrderItem
  
   

}
