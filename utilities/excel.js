const Excel = require('exceljs');

const generateExcel = async (orders) => {
    const workbook = new Excel.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    // Custom styling
    sheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 25 },
        { header: 'Final Amount', key: 'finalAmount', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
        { header: 'Created On', key: 'createdOn', width: 20 }
    ];

    // Add summary row
    sheet.insertRow(1, [
        'Sales Report',
        `Generated: ${new Date().toLocaleString()}`
    ]);

    const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    
    sheet.insertRow(2, [
        'Total Sales', 
        `₹${totalSales.toFixed(2)}`,
        'Total Discount',
        `₹${totalDiscount.toFixed(2)}`
    ]);

    sheet.addRows(orders.map(order => ({
        orderId: order.orderId,
        finalAmount: order.finalAmount,
        discount: order.discount || 0,
        couponDiscount: order.couponDiscount || 0,
        createdOn: new Date(order.createdOn).toLocaleString()
    })));

    // Auto-filter
    sheet.autoFilter = {
        from: 'A3',
        to: 'E3'
    };

    return await workbook.xlsx.writeBuffer();
};

module.exports = { generateExcel };
