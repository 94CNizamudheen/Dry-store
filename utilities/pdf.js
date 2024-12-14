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
            .text(`Total Sales: Rs ${totalSales.toFixed(2)}`)
            .text(`Total Discount: Rs ${totalDiscount.toFixed(2)}`)
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
            doc.text(`Rs ${order.finalAmount.toFixed(2)}`, columnXPositions[1], rowY, { width: 100, align: 'left' });
            doc.text(`Rs ${(order.discount || 0).toFixed(2)}`, columnXPositions[2], rowY, { width: 100, align: 'left' });
            doc.text(new Date(order.createdOn).toLocaleString(), columnXPositions[3], rowY, { width: 150, align: 'left' });

            doc.moveDown(1); // Space between rows
        });

        doc.end();
    });
};
const generateOrderInvoice = async (order) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });
        const buffers = [];

        doc.on('data', buffer => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Color Palette
        const colors = {
            primary: '#2C3E50',    // Dark Blue-Gray
            secondary: '#34495E',  // Slightly Lighter Blue-Gray
            accent: '#E74C3C',     // Vibrant Red
            text: '#333333'        // Dark Gray
        };

        // Invoice Header
        doc.fillColor(colors.primary)
           .fontSize(25)
           .font('Helvetica-Bold')
           .text('HENZA\'S DRY STORE', { align: 'center' });
        
        doc.fillColor(colors.secondary)
           .fontSize(10)
           .text('Tax Invoice / Bill of Supply', { align: 'center' });
        
        // Divider
        doc.strokeColor(colors.accent)
           .lineWidth(1.5)
           .moveTo(50, doc.y + 10)
           .lineTo(550, doc.y + 10)
           .stroke();

        doc.moveDown(1.5);

        // Invoice Details
        const leftColumnX = 50;
        const rightColumnX = 350;
        const startY = doc.y;

        // Company Details (Left Column)
        doc.fillColor(colors.text)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('Henza\'s Dry Store', leftColumnX, startY)
           .font('Helvetica')
           .fontSize(9)
           .text('123 Dry Goods Lane')
           .text('Spice Market Area')
           .text('GSTIN: 07ABCDE1234F1Z5');

        // Invoice Details (Right Column)
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .text('Invoice Details', rightColumnX, startY)
           .font('Helvetica')
           .fontSize(9)
           .text(`Invoice No: ${order.orderId}`)
           .text(`Date: ${new Date().toLocaleDateString()}`)
           .text(`Payment Method: ${order.paymentDetails.method}`);

        doc.moveDown(2);

        // Customer Details
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(colors.primary)
           .text('Customer Information', { underline: true });

        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(colors.text)
           .text(`Name: ${order.shippingAddress.name}`)
           .text(`Address: ${order.shippingAddress.addressType}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.pincode}`)
           .text(`Phone: ${order.shippingAddress.phone.join(', ')}`);
          

        doc.moveDown(2);

        // Order Items Table
        const tableTop = doc.y;
        const columnXPositions = [50, 250, 350, 450];
        const columnTitles = ['Product', 'Quantity', 'Unit Price', 'Total'];

        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(colors.primary);

        // Table Header
        columnTitles.forEach((title, i) => {
            doc.text(title, columnXPositions[i], tableTop, { width: 100, align: 'left' });
        });

        doc.moveDown(0.5)
           .strokeColor(colors.accent)
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();

        // Table Content
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.text);
           doc.moveDown(0.5)
        order.orderedItems.forEach((item) => {
            const rowY = doc.y;
            const totalPrice = item.quantity * item.price;
           
            doc.text(item.product.productName, columnXPositions[0], rowY, { width: 200, align: 'left' });
            doc.text(item.quantity, columnXPositions[1], rowY, { width: 50, align: 'left' });
            doc.text(`Rs ${item.price.toFixed(2)}`, columnXPositions[2], rowY, { width: 100, align: 'left' });
            doc.text(`Rs${totalPrice.toFixed(2)}`, columnXPositions[3], rowY, { width: 100, align: 'left' });

            doc.moveDown(1);
        });

        // Totals Section
        doc.moveDown(1);
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(colors.primary)
           .text('Payment Summary', { align: 'right' });
           
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.text)
           .text(`Subtotal: Rs ${order.totalPrice.toFixed(2)}`, { align: 'right' })
           .text(`Discount: Rs ${order.discount.toFixed(2)}`, { align: 'right' })
           .text(`Shipping: Rs ${(order.shippingCharge || 0).toFixed(2)}`, { align: 'right' })
           .text(`Total: Rs ${order.finalAmount.toFixed(2)}`, { align: 'right' });

        // Footer
        doc.moveDown(2);
        doc.strokeColor(colors.accent)
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
           doc.moveDown(0.5)
        doc.fontSize(8)
           .fillColor(colors.secondary)
           .text('Thank you for your business!', { align: 'center' })
           .text('For any queries, contact us at support@henzasdrystore.com', { align: 'center' });

        // Save and Resolve
        doc.end();
    });
};


module.exports = { generatePDF,generateOrderInvoice};
