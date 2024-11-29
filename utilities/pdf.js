const PDFDocument = require('pdfkit');

const generatePDF = async (orders) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffer => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // PDF Title and Header
        doc.fontSize(20).text('Comprehensive Sales Report', { align: 'center' });
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary Statistics
        const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

        doc.fontSize(12)
            .text(`Total Sales: ₹${totalSales.toFixed(2)}`)
            .text(`Total Discount: ₹${totalDiscount.toFixed(2)}`)
            .text(`Total Orders: ${orders.length}`)
            .moveDown();

        // Detailed Order Table
        const tableTop = doc.y;
        const columnWidths = [200, 100, 100, 150];
        const headers = ['Order ID', 'Final Amount', 'Discount', 'Created On'];

        headers.forEach((header, i) => {
            doc.text(header, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop);
        });

        doc.moveDown();
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, doc.y).lineTo(500, doc.y).stroke();

        // Order Details
        orders.forEach((order, index) => {
            doc.text(order.orderId, 50, doc.y)
               .text(`₹${order.finalAmount.toFixed(2)}`, 250)
               .text(`₹${(order.discount || 0).toFixed(2)}`, 350)
               .text(new Date(order.createdOn).toLocaleString(), 450);
            doc.moveDown();
        });

        doc.end();
    });
};



module.exports = { generatePDF };