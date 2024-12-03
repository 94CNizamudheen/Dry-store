const PDFDocument = require('pdfkit');
const path= require('path');
const fs= require('fs');

const generatePDF = async (orders) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffer => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Title and Header
        doc.fontSize(20).text('Dry Store Sales Report', { align: 'center' });
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary
        const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

        doc.fontSize(12)
            .text(`Total Sales: RS ${totalSales.toFixed(2)}`)
            .text(`Total Discount: RS ${totalDiscount.toFixed(2)}`)
            .text(`Total Orders: ${orders.length}`)
            .moveDown(1.5);

        // Table Headers
        const tableTop = doc.y;
        const columnXPositions = [50, 200, 300, 400]; // X positions for each column
        const columnTitles = ['Order ID', 'Final Amount', 'Discount', 'Created On'];

        doc.fontSize(12).font('Helvetica-Bold');
        columnTitles.forEach((title, i) => {
            doc.text(title, columnXPositions[i], tableTop, { width: 100, align: 'left' });
        });

        doc.moveDown(0.5).strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, doc.y).lineTo(500, doc.y).stroke();

        // Table Content
        doc.font('Helvetica').fillColor('#333333');
        orders.forEach((order) => {
            const rowY = doc.y;

            doc.text(order.orderId, columnXPositions[0], rowY, { width: 150, align: 'left' });
            doc.text(`RS ${order.finalAmount.toFixed(2)}`, columnXPositions[1], rowY, { width: 100, align: 'left' });
            doc.text(`RS ${(order.discount || 0).toFixed(2)}`, columnXPositions[2], rowY, { width: 100, align: 'left' });
            doc.text(new Date(order.createdOn).toLocaleString(), columnXPositions[3], rowY, { width: 150, align: 'left' });

            doc.moveDown(1); // Space between rows
        });

        doc.end();
    });
};
const generateOrderInvoice = async (order) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffer => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Invoice Header
        doc.fontSize(20).text('Order Invoice', { align: 'center' });
        doc.fontSize(12).text(`Order ID: ${order.orderId}`, { align: 'center' });
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Customer Details
        doc.fontSize(12)
            .text(`Customer Name: ${order.shippingAddress.name}`)
            .text(`Address: ${order.shippingAddress.addressType}, ${order.shippingAddress.city}, ${order.shippingAddress.state}`)
            .text(`Phone: ${order.shippingAddress.phone.join(', ')}`)
            .moveDown(1.5);

        // Order Summary
        doc.fontSize(12)
            .text(`Total Amount: ₹${order.totalPrice.toFixed(2)}`)
            .text(`Discount: ₹${order.discount.toFixed(2)}`)
            .text(`Final Amount: ₹${order.finalAmount.toFixed(2)}`)
            .text(`Payment Method: ${order.paymentDetails.method}`)
            .moveDown(2);

        // Order Items Table Header
        const tableTop = doc.y;
        const columnXPositions = [50, 250, 350, 450]; // Adjust as needed
        const columnTitles = ['Product', 'Quantity', 'Price', 'Total'];

        doc.fontSize(12).font('Helvetica-Bold');
        columnTitles.forEach((title, i) => {
            doc.text(title, columnXPositions[i], tableTop, { width: 100, align: 'left' });
        });

        doc.moveDown(0.5).strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        // Order Items Table Content
        doc.font('Helvetica').fillColor('#333333');
        order.orderedItems.forEach((item) => {
            const rowY = doc.y;
            const totalPrice = item.quantity * item.price;

            doc.text(item.product.productName, columnXPositions[0], rowY, { width: 200, align: 'left' });
            doc.text(item.quantity, columnXPositions[1], rowY, { width: 50, align: 'left' });
            doc.text(`₹${item.price.toFixed(2)}`, columnXPositions[2], rowY, { width: 100, align: 'left' });
            doc.text(`₹${totalPrice.toFixed(2)}`, columnXPositions[3], rowY, { width: 100, align: 'left' });

            doc.moveDown(1); // Space between rows
        });

        // Save and Resolve
        doc.end();
    });
};


module.exports = { generatePDF,generateOrderInvoice};
