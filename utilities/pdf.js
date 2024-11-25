const PDFDocument = require('pdfkit');

const generatePDF = async (reportData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const chunks = [];

            // Collect PDF data chunks
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Header
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveDown();

            // Date Range
            doc.fontSize(12).text(`Report Period: ${reportData.dateRange.startDate} to ${reportData.dateRange.endDate}`);
            doc.moveDown();

            // Summary Section
            doc.fontSize(16).text('Summary', { underline: true });
            doc.fontSize(12);
            doc.text(`Total Orders: ${reportData.summary.total_orders}`);
            doc.text(`Gross Sales: $${reportData.summary.total_gross.toFixed(2)}`);
            doc.text(`Total Discounts: $${reportData.summary.total_discounts.toFixed(2)}`);
            doc.text(`Net Sales: $${reportData.summary.net_sales.toFixed(2)}`);
            doc.moveDown();

            // Sales Table
            doc.fontSize(16).text('Daily Sales Breakdown', { underline: true });
            doc.moveDown();
            
            // Table headers
            const tableTop = doc.y;
            const columns = {
                date: 50,
                orders: 150,
                gross: 250,
                discounts: 350,
                net: 450
            };

            doc.fontSize(10);
            doc.text('Date', columns.date, tableTop);
            doc.text('Orders', columns.orders, tableTop);
            doc.text('Gross Sales', columns.gross, tableTop);
            doc.text('Discounts', columns.discounts, tableTop);
            doc.text('Net Sales', columns.net, tableTop);

            let y = tableTop + 20;
            
            // Table rows
            reportData.sales.forEach(sale => {
                if (y > 700) { // New page if near bottom
                    doc.addPage();
                    y = 50;
                }
                
                doc.text(sale.date, columns.date, y);
                doc.text(sale.order_count.toString(), columns.orders, y);
                doc.text(`$${sale.gross_sales.toFixed(2)}`, columns.gross, y);
                doc.text(`$${sale.total_discounts.toFixed(2)}`, columns.discounts, y);
                doc.text(`$${sale.net_sales.toFixed(2)}`, columns.net, y);
                
                y += 20;
            });

            // Discount Analysis
            doc.addPage();
            doc.fontSize(16).text('Discount Analysis', { underline: true });
            doc.moveDown();
            
            reportData.discounts.forEach(discount => {
                doc.fontSize(12).text(`${discount.discount_type}:`);
                doc.fontSize(10)
                    .text(`Usage Count: ${discount.usage_count}`)
                    .text(`Total Amount: $${discount.total_amount.toFixed(2)}`)
                    .moveDown();
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};


module.exports = { generatePDF };