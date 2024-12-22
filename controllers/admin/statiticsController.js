const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');

const { generatePDF } = require('../../utilities/pdf');
const { generateExcel } = require('../../utilities/excel');
const Product = require('../../models/productSchema');
const { months } = require('moment');



const LoadReportsPage = async (req, res) => {
    try {
        const orders = await Order.find();
        const coupon = await Coupon.find();
        const overAllSale = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
        const totalOrders = await Order.countDocuments();


        res.render('reports', { totalRevenue, totalOrders, totalDiscounts, overAllSale })
    } catch (error) {
        console.error('error for load reports page', error);
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

            res.status(200);
            res.send(excelBuffer);
        } else {
            res.status(400).json({
                success: false,
                error: "Invalid file type"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to download report",
            details: error.message
        });
    }
};

const getDashboardData = async (req, res) => {
    try {
        const { type, timeFilter } = req.query;

        // Base aggregation pipeline
        let aggregationPipeline;

        // Add time-based filtering
        const now = new Date();
        let timeFilterMatch = {};
        switch (timeFilter) {
            case 'daily':
                timeFilterMatch = {
                    createdOn: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                    }
                };
                break;
            case 'weekly':
                timeFilterMatch = {
                    createdOn: {
                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                        $lt: new Date()
                    }
                };
                break;
            case 'monthly':
                timeFilterMatch = {
                    createdOn: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30), // 30 days ago
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) // Start of tomorrow
                    }
                };
                break;
            case 'quarterly':
                timeFilterMatch = {
                    createdOn: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90), // 90 days ago
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) // Start of tomorrow
                    }
                };
                break;
            case 'yearly':
                timeFilterMatch = {
                    createdOn: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365), // 365 days ago
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) // Start of tomorrow
                    }
                };
                break;
            default: // all time
                timeFilterMatch = {};
        }

        switch (type) {
            case 'products':
                aggregationPipeline = [
                    { $match: timeFilterMatch },
                    { $unwind: "$orderedItems" },
                    {
                        $group: {
                            _id: "$orderedItems.product",
                            totalSales: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } },
                            totalQuantity: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    {
                        $lookup: {
                            from: "products",
                            localField: "_id",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    { $sort: { totalSales: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            productName: "$productDetails.productName",
                            totalSales: 1,
                            totalQuantity: 1
                        }
                    }
                ];
                break;

            case 'categories':
                aggregationPipeline = [
                    { $match: timeFilterMatch },
                    { $unwind: "$orderedItems" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "orderedItems.product",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    {
                        $group: {
                            _id: "$productDetails.category",
                            totalSales: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } },
                            totalQuantity: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    {
                        $lookup: {
                            from: "categories",
                            localField: "_id",
                            foreignField: "_id",
                            as: "categoryDetails"
                        }
                    },
                    { $unwind: "$categoryDetails" },
                    { $sort: { totalSales: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            name: "$categoryDetails.name",
                            totalSales: 1,
                            totalQuantity: 1
                        }
                    }
                ];
                break;

            case 'brands':
                aggregationPipeline = [
                    { $match: timeFilterMatch },
                    { $unwind: "$orderedItems" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "orderedItems.product",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    {
                        $group: {
                            _id: "$productDetails.brand",
                            totalSales: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } },
                            totalQuantity: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    { $sort: { totalSales: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            brandName: "$_id",
                            totalSales: 1,
                            totalQuantity: 1
                        }
                    }
                ];
                break;

            default:
                return res.status(400).json({ error: 'Invalid type' });
        }

        const result = await Order.aggregate(aggregationPipeline);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

const getOrderPaymentData = async (req, res) => {
    try {
        const paymentData = await Order.aggregate([
            { $group: { _id: "$paymentDetails.method", total: { $sum: 1 }, totalAmount: { $sum: "$finalAmount" } } }
        ]);

        const chartData = paymentData.map((item) => ({
            method: item._id,
            total: item.total,
            totalAmount: item.totalAmount,
        }));

        res.json(chartData);
    } catch (error) {
        res.status(500).json({ message: "Error fetching payment data" });
    }
};
const getOrderSales = async (req, res) => {
    try {
        const { time, status } = req.query;
        const now = new Date();
        let dateFilter = {};
        if (time === 'weekly') {
            dateFilter = {
                createdOn: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000), $lt: now }
            };
        } else if (time === 'monthly') {
            dateFilter = {
                createdOn: { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lt: now }
            };
        } else if (time === 'quarterly') {
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            dateFilter = {
                createdOn: { $gte: new Date(now.getFullYear(), quarterStartMonth, 1), $lt: now }
            };
        } else if (time === 'yearly') {
            dateFilter = {
                createdOn: { $gte: new Date(now.getFullYear(), 0, 1), $lt: now }
            };
        }
        const statusFilter = status && status !== 'all' ? { status } : {};

        const orders = await Order.aggregate([
            { $match: { ...dateFilter, ...statusFilter } },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$createdOn' },
                        month: { $month: '$createdOn' },
                        year: { $year: '$createdOn' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);
        const labels=orders.map(order=>`${order._id.day}-${order._id.month}-${order._id.year}`);
        const salesCounts=orders.map(order=>order.count);
        res.json({labels,salesCounts})


    } catch (error) {
        res.status(500).json({error:"failed to fetch sales data"});

    }
}

module.exports = { getOrderPaymentData };
module.exports = {
    LoadReportsPage,
    generateReports,
    downloadReports,
    getDashboardData,
    getOrderPaymentData,
    getOrderSales

}