
const ExcelJS = require('exceljs');

const generateExcel = async (orders) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Define columns
    worksheet.columns = [
        { header: 'Order ID', key: '_id', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 30 },
        { header: 'Final Amount', key: 'finalAmount', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Created On', key: 'createdOn', width: 20 },
        { header: 'Status', key: 'status', width: 15 }
    ];

    // Add rows
    orders.forEach(order => {
        worksheet.addRow({
            _id: order._id.toString(),
            customerName: order.customerName,
            finalAmount: order.finalAmount.toFixed(2),
            discount: order.discount ? order.discount.toFixed(2) : '0.00',
            createdOn: new Date(order.createdOn).toLocaleString(),
            status: order.status
        });
    });

    // Apply styles (optional)
    worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    // Auto-filter
    worksheet.autoFilter = {
        from: 'A1',
        to: 'F1'
    };

    // Return as buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};


module.exports = { generateExcel };
