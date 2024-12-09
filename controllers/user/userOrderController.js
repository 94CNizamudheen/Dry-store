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
const { session, initialize } = require('passport');
const ShippingData= require('../../models/shippingData');





const handleFailedOrder = async (orderId) => {
    try {
        console.log(`Order ${orderId} failed. Starting 3 minute countdown for automatic cancellation.`);
        setTimeout(async () => {
            console.log(`3-minute countdown completed for Order ${orderId}. Attempting automatic cancellation.`);
            await cancelOrderAfterTimeout(orderId);
        }, 3 * 60 * 1000); //setted for  3 minutes in milliseconds for checking dont forget to set this 24 * 60 * 60 * 1000 milliseconds
       
    } catch (error) {
        console.error(`Error handling failed order ${orderId}:`, error);
    }
};
const cancelOrderAfterTimeout = async (orderId) => {
    try {
        const order= await Order.findOne({orderId});
        if(order.paymentDetails.paymentStatus!=="Failed"){
            console.log("Aborting the cancellation");
            return;
        }
        console.log(`Order id ${orderId} status still Failed Canceling the order`);
        const refundMethod = "WALLET"; 
        const req = {
            query: {
                orderId: orderId,
                refundMethod: refundMethod,
            },
        };
        const res = {
            status: (code) => ({ json: (data) => console.log(`Response: ${code}`, data), }),
        };
     await cancelOrder(req, res);
    } catch (error) {
        console.error(`Error automatically cancelling Order ${orderId}:`, error);
    }
};




const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const loadCheckOutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.query.productId; 
        const coupons = await Coupon.find();
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userId });

        let cartedProducts;
        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.redirect('/productDetails'); 
            }

            cartedProducts = {
                items: [{
                    productId: product,
                    quantity: 1,
                    totalPrice: product.salePrice || product.regularPrice,
                }],
            };
        } else {
            // Regular cart flow
            cartedProducts = await Cart.findOne({ userId }).populate({
                path: "items.productId",
                model: "Product",
                select: "productName productImage salePrice description regularPrice",
            });

            if (!cartedProducts || cartedProducts.items.length === 0) {
                return res.render('cart', { isEmpty: true });
            }
        }

       
        const subtotal = cartedProducts.items.reduce((acc, item) => acc + item.totalPrice, 0);
        const shipping = req.session.shippingCharge || 0;
        const total = subtotal + shipping;
        const discount = req.session.discount || 0;
        const discountedTotal = req.session.discountedTotal || 0;
        const regularTotal = cartedProducts.items.reduce(
            (sum, item) => sum + (item.productId?.regularPrice || 0) * item.quantity,
            0
        );
        const totalDiscount = cartedProducts.items.reduce((sum, item) => {
            const regularPrice = item.productId?.regularPrice || 0;
            const salePrice = item.productId?.salePrice || 0;
            return sum + (regularPrice - salePrice) * item.quantity;
        }, 0);

        // Render checkout page
        res.render('check-out', {
            user: userData,
            userAddress: addressData,
            cart: cartedProducts,
            isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            total,
            subtotal,
            selectedAddress: req.session.selectedAddress || null,
            discount,
            discountedTotal,
            coupons,
            totalDiscount,
            regularTotal,
            shipping,
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

        res.status(200).json({ success: true, redirectURL: `/order-success-page?message=${encodeURIComponent('Order Compleated')}`,});
    } catch (error) {
        console.error("Error occurred in Place Order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
//===============================================================================================
const loadOrderSuccessPage=async(req,res)=>{
    try {
        const message = req.query.message || 'Your order is complete!';
        res.render('order-success-page',{message })
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
        const amount = req.body.amount * 100;
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
 
        res.status(200).json({
            success:true,
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
//==============================================================================================
const verifyRazorpayPaymentAndPlaceOrder= async(req,res)=>{
    try {
        const userId= req.session.user;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, } = req.body;
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        const payment= await razorpay.payments.fetch(razorpay_payment_id);
        console.log(payment);
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing payment details" 
            });
        };
        const hmac = crypto.createHmac('sha256', `${process.env.RAZORPAY_KEY_SECRET}`);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');
        console.log(generated_signature,razorpay_signature);
        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({success:false, error: 'Invalid signature' });
        }
        else {
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
                    redirectURL: `/order-success-page?message=${encodeURIComponent('Order Compleated')}`,
                    orderId: newOrder._id ,
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
//=====================================================================================================
const failedOrderSave=async(req,res)=>{
    try {
    
        const userId=req.session.user;
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
                        paymentStatus: "Failed",
                        paymentFailedAt: new Date(),
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
                handleFailedOrder(newOrder.orderId);
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
                    redirectURL: `/order-success-page?message=${encodeURIComponent(`"We noticed an issue with your payment. Don’t worry, you have 1 day to resolve it. If the payment isn’t completed within this time, your order will be automatically canceled. Please reach out to us if you need any assistance!"`)}`,
                    orderId: newOrder._id ,
                });

    } catch (error) {
        console.error('Error for failed order saving',error);
        res.status(500).json({message:"Internal serverr error For saving order"})
    }
};
//=================================================================================
const repayPayment= async(req,res)=>{
    try {
        const userId= req.session.user;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature,orderId } = req.body;
        console.log("body data",req.body)
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        if(!orderId){
            return res.status(404).json({success:false,message:"Order id missing"})
        }
        const payment= await razorpay.payments.fetch(razorpay_payment_id);
        console.log(payment);
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing payment details" 
            });
        };
        const hmac = crypto.createHmac('sha256', `${process.env.RAZORPAY_KEY_SECRET}`);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');
        console.log(generated_signature,razorpay_signature);
        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({success:false, error: 'Invalid signature' });
        }
        const updatedOrder= await Order.findOneAndUpdate({orderId:orderId},{
            $set:{
                "paymentDetails.paymentStatus":"Completed",
                "paymentDetails.paidAmount":payment.amount/100,
                "paymentDetails.paidAt": new Date(),
                "paymentDetails.transactionId":razorpay_payment_id,
            }
        },{new:true});

        console.log("Order updated successfully", updatedOrder);
        res.status(200).json({success:true,message:" Repayment Successfull"})        

    } catch (error) {
        console.error("Error for Update and retry verification",error);
        res.status(500).json({success:false,message:"Internal Error for Updating order"});
    }
};
const initializeReturn=async(req,res)=>{
    try {
        const {orderId,productId}=req.body;
        
        const order= await Order.findOne({orderId:orderId});
        console.log('order:',order);
        if(!order){
            return res.status(404).json({success:false,message:"Order not Found"});
        }
        const orderItem=order.orderedItems.find(item=>item.product.toString()===productId);
        if(!orderItem){
            return res.status(404).json({success:false,message:"Product not found"});
        }
        if(orderItem.returnDetails.status!=="Not Requested"){
            return res.status(404).json({success:false,message:"Already requested or returned"});
        }
        console.log("ordered item",orderItem);
        const daysSinceOrder= (new Date()-order.deliveredOn)/(1000*60*60*24);
        if(daysSinceOrder>2){
            return res.status(400).json({success:false,message:'Return window has expired'});
        }
        orderItem.returnDetails.status="Return Requested";
        orderItem.returnDetails.returnRequestedOn= new Date();
        await order.save();
        res.status(200).json({success:true,})
    } catch (error) {
        console.error('error for return request',error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

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
    cancelOrderItem,
    failedOrderSave,
    repayPayment,
    initializeReturn
   

}
