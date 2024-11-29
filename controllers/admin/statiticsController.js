const User= require('../../models/userSchema');
const Order= require('../../models/orderSchema');
const Coupon= require('../../models/couponSchema');

const {generatePDF}= require('../../utilities/pdf');
const {generateExcel}= require('../../utilities/excel');



const LoadReportsPage=async(req,res)=>{
    try {
        const orders= await Order.find();
        const coupon= await Coupon.find();
        const overAllSale= orders.reduce((sum, order) => sum + order.totalPrice, 0);
        const totalRevenue= orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscounts= orders.reduce((sum, order) => sum + (order.discount || 0), 0);
        const totalOrders= await Order.countDocuments();


        res.render('reports',{totalRevenue,totalOrders,totalDiscounts,overAllSale})
    } catch (error) {
        console.error('error for load reports page',error);
        res.redirect('/pageError')
    }
}
//===========================================================

const generateReports = async (req, res) => {
    try {
        const { startDate, endDate, reportType, quickSelect } = req.body;
        const filters = {};

        const today = new Date();
        switch (reportType) {
            case 'daily':
                filters.createdOn = {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                };
                break;
            case 'weekly':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                filters.createdOn = { $gte: weekAgo, $lte: today };
                break;
            case 'monthly':
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() - 1);
                filters.createdOn = { $gte: monthAgo, $lte: today };
                break;
            case 'yearly':
                const yearAgo = new Date(today);
                yearAgo.setFullYear(today.getFullYear() - 1);
                filters.createdOn = { $gte: yearAgo, $lte: today };
                break;
            case 'custom':
                if (startDate && endDate) {
                    filters.createdOn = {
                        $gte: new Date(startDate),
                        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                    };
                }
                break;
        }

        if (quickSelect) {
            const days = parseInt(quickSelect);
            const quickSelectDate = new Date(today);
            quickSelectDate.setDate(today.getDate() - days);
            filters.createdOn = { $gte: quickSelectDate, $lte: today };
        }

        const orders = await Order.find(filters)
            .sort({ createdOn: -1 })
            .lean(); 


        const stats = {
            totalSales: orders.reduce((sum, order) => sum + order.finalAmount, 0),
            totalOrders: orders.length,
            totalDiscounts: orders.reduce((sum, order) => sum + (order.discount || 0), 0),
            averageOrderValue: orders.length 
                ? (orders.reduce((sum, order) => sum + order.finalAmount, 0) / orders.length).toFixed(2) 
                : 0,
            discountPercentage: orders.length 
                ? ((orders.reduce((sum, order) => sum + (order.discount || 0), 0) / 
                    orders.reduce((sum, order) => sum + order.finalAmount, 0)) * 100).toFixed(2) 
                : 0
        };

        res.json({
            success: true, 
            stats, 
            orders: orders.map(order => ({
                ...order,
                createdOn: order.createdOn.toISOString()
            }))
        });

    } catch (error) {
        console.error('Error generating Reports', error);
        res.status(500).json({
            success: false, 
            error: "Failed to generate reports",
            details: error.message
        });
    }
};
// ==============================================================
const downloadReports = async (req, res) => {
    try {
        const { type } = req.params;
        
        const orders = await Order.find().sort({ createdOn: -1 });

        if (type === 'pdf') {
            const pdfBuffer = await generatePDF(orders);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="Sales_Report.pdf"');
            res.send(pdfBuffer);
        } else if (type === 'excel') {
            const excelBuffer = await generateExcel(orders);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Sales_Report.xlsx"');
            res.send(excelBuffer);
        } else {
            res.status(400).json({ 
                success: false, 
                error: "Invalid file type" 
            });
        }
    } catch (error) {
        console.error('Error downloading report', error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to download report",
            details: error.message 
        });
    }
};

module.exports={
    LoadReportsPage,
    generateReports,
    downloadReports
}