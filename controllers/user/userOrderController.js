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


const razorpay= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET,

})



const loadCheckOutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userId });
        const cartedProducts = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            model: "Product",
            select: "productName productImage salePrice description",
        });

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) {
            return res.status(404).json({ error: "Cart not Found" });
        }
        const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

        const shipping = 0;
        const total = subtotal + shipping;

        res.render('check-out', {
            user: userData,
            userAddress: addressData,
            cart: cartedProducts,
            isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            total: total,
            subtotal: subtotal,
            selectedAddress: req.session.selectedAddress || null, 
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


const selectAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.query.id;

        req.session.selectedAddress = addressId;
        console.log("selected AddressId: ",req.session.selectedAddress)
        if (!addressId) {
            return res.status(400).json({ success: false, error: "Address ID is required." });
        }

        res.status(200).json({ success: true, selectedAddress: addressId });
    } catch (error) {
        console.error("Error selecting address:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};


const handlePaymentMethod = async (req, res) => {
    try {
        console.log("Processing payment method");

        const userId = req.session.user;
        const { paymentOption } = req.body;
        
        console.log("paymentOption selected:",paymentOption);

        const validPaymentOption = ['COD', 'ONLINE'];
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


const placeOrder = async (req, res) => {
    try {
        console.log("Place Order initiated");

        const userId = req.session.user;
        const selectedAddressId = req.session.selectedAddress;
        const paymentMethod = req.session.paymentMethod;
        const shippingAddress = await Address.find({"address._id":selectedAddressId});

        console.log("User ID:", userId);
        console.log("Selected Address:", selectedAddressId);
        console.log("Payment Method:", paymentMethod);

        if (!selectedAddressId) {
            return res.status(400).json({ error: "Please select a delivery address" });
        }

        if (!paymentMethod) {
            return res.status(400).json({ error: "Please select a payment method" });
        }

         
        

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }
        for (const item of cart.items) {
            if (item.productId.quantity < item.quantity) {
                return res.status(400).json({ 
                    error: `${item.productId.productName} has insufficient stock. Available: ${item.productId.quantity}`
                });
            }
        }
        const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        const shipping = 0;
        const finalAmount = subtotal + shipping;

        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.totalPrice / item.quantity,
        }));

        
        const newOrder = new Order({
            orderedItems,
            totalPrice: subtotal,
            finalAmount,
            shippingAddress: {
                addressType: shippingAddress[0].address[0].addressType,
                name: shippingAddress[0].address[0].name,
                pincode: shippingAddress[0].address[0].pincode,
                city: shippingAddress[0].address[0].city,
                state: shippingAddress[0].address[0].state,
                landmark: shippingAddress[0].address[0].landmark || "",
                phone: shippingAddress[0].address[0].phone || [],
                altPhone: shippingAddress[0].address[0].altPhone || [],
            },
            paymentDetails:{
                method:paymentMethod,
                paymentStatus:"Pending",
            },
            status: 'Pending',
            invoiceDate: new Date(),
            user: userId,
        });

        await newOrder.save();
        await Cart.deleteOne({ userId });

        console.log("Order saved successfully:", newOrder);

        for (const item of cart.items) {
            const product= await Product.findById(item.productId._id);
            const newQuantity= product.quantity - item.quantity;
            await Product.findByIdAndUpdate(item.productId._id,{
                $set:{quantity: newQuantity, status: newQuantity<1 ? "Out of stock" : "Available" }, },{new:true});
        }

        

        delete req.session.selectedAddress;
        delete req.session.paymentMethod;

        res.status(200).json({ success: true, redirectURL: `/order-success-page` });
    } catch (error) {
        console.error("Error occurred in Place Order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



const loadOrderSuccessPage=async(req,res)=>{
    try {
        console.log("object");
        res.render('order-success-page')
    } catch (error) {
        console.error('error for load order success page');
        res.status(500).json({error:"Internal server error"});
    }
};

const cancelOrder = async (req, res) => {
    try {

        const { orderId } = req.query;  
        

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        console.log('Attempting to cancel order:', orderId);
        
        const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');
        
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

const createRazorpayOrder=async(req,res)=>{
    try {
    
        const {amount,paymentOption}=req.body;
        console.log('amount:',amount)
        if(!amount||isNaN(amount)||amount<=0){
            return res.status(400).json({error:"Invalid amount",success:false})
        }

        const order=  razorpay.orders.create({
            amount:Math.round(amount*100),
            currency:'INR',
            receipt:`order_${Date.now()}`,
            payment_capture:1
        });
        
        const userId=req.session.user;
        const user= await User.findOne(userId)
        res.json({
            success:true,
            key_id:process.env.RAZORPAY_KEY_ID,
            order,
            customerName:user.name,
            customerEmail:user.email,
            customerPhone:user.phone

        });
        
    } catch (error) {
        console.error("Error for creating Razorpay order:",error);
        res.status(500).json({
            success:false,
            error:"Failed to create payment order"
        })
    }
};
const verifyPayment= async(req,res)=>{
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        }=req.body;
        const sign=razorpay_order_id +'|'+ razorpay_order_id;
        const expectedSign=crypto
                                .createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
                                .update(sign)
                                .digest("hex")

        if(razorpay_signature===expectedSign){
            await Order.findByIdAndUpdate(
                {orderId:razorpay_order_id},
                {
                    'paymentDetails.paymentStatus':'Completed',
                    'paymentDetails.paymentId':razorpay_payment_id,
                    
                },{returnDocument:'after'}
            );
            res.json({
                success:true,
                redirectURL:'/order-success-page'
            });
        }else{
            res.status(400).json({
                success:false,
                error:"Payment veryfication Failed"
            });
        }
        
    } catch (error) {
        console.error('Payment verification Failed error : ',error);
        res.status(500).json({
            success:false,
            error:"Payment verification Failed"
        })
    }
}



module.exports={
    loadCheckOutPage,
    postAddAddress,
    selectAddress,
    handlePaymentMethod,
    placeOrder,
   loadOrderSuccessPage,
   cancelOrder,
   createRazorpayOrder,
   verifyPayment

}
