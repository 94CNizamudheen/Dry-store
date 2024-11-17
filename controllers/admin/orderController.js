const Order= require('../../models/orderSchema');
const Product= require('../../models/productSchema')
const User= require('../../models/userSchema');
const Category= require('../../models/categorySchema');
const Address= require('../../models/addressSchema');


const loadOrderDetails = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage '
            })
            .populate({
                path: 'user',
                select: 'name email' 
            })
            .sort({ createdOn: -1 }); 

        const formattedOrders = orders.map(order => ({
            orderId: order.orderId,
            customerName: order.user.name,
            customerEmail: order.user.email,
            totalPrice: order.totalPrice,
            finalAmount: order.finalAmount,
            discount: order.discount,
            status: order.status,
            createdOn: order.createdOn.toLocaleDateString(),
            shippingAddress: order.shippingAddress,
            items: order.orderedItems.map(item => ({
                productName: item.product.productName,
                quantity: item.quantity,
                price: item.price
            })),
            couponApplied: order.coupenApplid
        }));

        res.render('orderList', { 
            orders: formattedOrders,
            statusOptions: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Retern Request', 'Returned']
        });

    } catch (error) {
        console.error('Error loading order details:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findOne({ orderId: orderId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage'
            })
            .populate({
                path: 'user',
                select: 'name email'
            });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const orderDetails = {
            orderId: order.orderId,
            customer: {
                name: order.user.name,
                email: order.user.email
            },
            items: order.orderedItems.map(item => ({
                product: item.product.productName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price
            })),
            pricing: {
                totalPrice: order.totalPrice,
                discount: order.discount,
                finalAmount: order.finalAmount
            },
            shipping: order.shippingAddress,
            status: order.status,
            orderDate: order.createdOn,
            invoiceDate: order.invoiceDate,
            couponApplied: order.coupenApplid
        };

        res.json(orderDetails);

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        console.log("updation initiated");
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "Order ID and status are required" });
        }


        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.status = status;
        await order.save();

        return res.json({
            success: true,
            message: "Order status updated successfully",
            newStatus: status
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const cancelOrder=async(req,res)=>{
    try {
        console.log("cancel order initiated");
        const {orderId}= req.params;
        const order= await Order.findOne({orderId:orderId}).populate('orderItems.product');
        if(!order){
            return res.status(404).json({message:"Order not fount",success:false});
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
        };
        order.status = 'Cancelled';
        await order.save();

        return res.status(200).json({ success: true, message: 'Order has been cancelled successfully' });


    } catch (error) {
        console.error('Error for cancelling order',error);
        res.status('500').json({message:"Internal server Error"});
    }
}




module.exports={
    loadOrderDetails,
    getOrderDetails,
    updateOrderStatus,
    cancelOrder

}