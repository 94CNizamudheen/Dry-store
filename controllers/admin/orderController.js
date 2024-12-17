const Order= require('../../models/orderSchema');
const Product= require('../../models/productSchema')
const User= require('../../models/userSchema');
const Category= require('../../models/categorySchema');
const Address= require('../../models/addressSchema');


const loadOrderDetails = async (req, res) => {
    try {
            const page= parseInt(req.query.page)||1;
            const limit= parseInt(req.query.limit)||5;
            const skip= (page-1)*limit;
            const totalOrders= await Order.countDocuments();

            const orders = await Order.find()
                .populate({
                    path: 'orderedItems.product',
                    select: 'productName productImage '
                })
                .populate({
                    path: 'user',
                    select: 'name email' 
                })
                .sort({ createdOn: -1 }).skip(skip).limit(limit); 
            

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
                    price: item.price,
                    returnDetails: item.returnDetails,
                    productId: item.product ? item.product._id : null,
                })),
                couponApplied: order.coupenApplid,
         
            }));
        

            res.render('orderList', { 
                orders: formattedOrders,
                statusOptions: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
                totalPages:Math.ceil(totalOrders/limit),
                currentPage:page,
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
        if(order.status==="Delivered"){
            order.deliveredOn= new Date();
            await order.save();
        };

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
        const order= await Order.findOne({orderId:orderId}).populate('orderedItems.product');
        if(!order){
            return res.status(404).json({message:"Order not fount",success:false});
        }
        if (order.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: "Only pending orders can be cancelled"
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
        };
        order.status = 'Cancelled';
        await order.save();

        return res.status(200).json({ success: true, message: 'Order has been cancelled successfully' });


    } catch (error) {
        console.error('Error for cancelling order',error);
        res.status('500').json({message:"Internal server Error"});
    }
}

const handleReturnRequest = async (req, res) => {
    try {
      const { orderId, itemId, returnAction } = req.body;
      console.log({ orderId, itemId, returnAction } )
      if (!orderId || !itemId || !returnAction) {
        return res.status(400).json({ success: false, message: 'Invalid request data' });
      }
  
      const updateFields = {};
      switch (returnAction) {
        case 'approve':
          updateFields["orderedItems.$.returnDetails.status"] = 'Approved';
          break;
        case 'reject':
          updateFields["orderedItems.$.returnDetails.status"] = 'Rejected';
          break;
        case 'complete':
          updateFields["orderedItems.$.returnDetails.status"] = 'Refunded';
          updateFields["orderedItems.$.returnDetails.returnedOn"] = new Date();
          break;
        default:
          return res.status(400).json({ success: false, message: 'Invalid action' });
      }
  
      const order = await Order.findOneAndUpdate(
        { orderId, "orderedItems.product": itemId },
        { $set: updateFields },
        { new: true }
      );
  
      if (order) {
        return res.status(200).json({ success: true, message: 'Action performed successfully' });
      } else {
        return res.status(404).json({ success: false, message: 'Order or item not found' });
      }
    } catch (error) {
      console.error('Error handling return request:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

module.exports={
    loadOrderDetails,
    getOrderDetails,
    updateOrderStatus,
    cancelOrder,
    handleReturnRequest

}