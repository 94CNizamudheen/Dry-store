const Excel = require('exceljs');
const generateExcel = async (reportData) => {
    try {
        const workbook = new Excel.Workbook();
        
        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric' },
            { header: 'Value', key: 'value' }
        ];

        summarySheet.addRows([
            { metric: 'Total Orders', value: reportData.summary.total_orders },
            { metric: 'Gross Sales', value: reportData.summary.total_gross },
            { metric: 'Total Discounts', value: reportData.summary.total_discounts },
            { metric: 'Net Sales', value: reportData.summary.net_sales }
        ]);

        // Daily Sales Sheet
        const salesSheet = workbook.addWorksheet('Daily Sales');
        salesSheet.columns = [
            { header: 'Date', key: 'date' },
            { header: 'Orders', key: 'order_count' },
            { header: 'Gross Sales', key: 'gross_sales' },
            { header: 'Discounts', key: 'total_discounts' },
            { header: 'Coupons', key: 'total_coupons' },
            { header: 'Net Sales', key: 'net_sales' }
        ];

        salesSheet.addRows(reportData.sales);

        // Format currency columns
        const currencyColumns = ['C', 'D', 'E', 'F'];
        currencyColumns.forEach(col => {
            salesSheet.getColumn(col).numFmt = '"$"#,##0.00';
        });

        // Discounts Sheet
        const discountsSheet = workbook.addWorksheet('Discounts');
        discountsSheet.columns = [
            { header: 'Discount Type', key: 'discount_type' },
            { header: 'Usage Count', key: 'usage_count' },
            { header: 'Total Amount', key: 'total_amount' }
        ];

        discountsSheet.addRows(reportData.discounts);
        discountsSheet.getColumn('C').numFmt = '"$"#,##0.00';

        // Coupons Sheet
        const couponsSheet = workbook.addWorksheet('Coupons');
        couponsSheet.columns = [
            { header: 'Coupon Code', key: 'coupon_code' },
            { header: 'Redemptions', key: 'redemptions' },
            { header: 'Total Savings', key: 'total_savings' }
        ];

        couponsSheet.addRows(reportData.coupons);
        couponsSheet.getColumn('C').numFmt = '"$"#,##0.00';

        // Style all sheets
        [summarySheet, salesSheet, discountsSheet, couponsSheet].forEach(sheet => {
            // Style headers
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Auto-fit columns
            sheet.columns.forEach(column => {
                column.width = Math.max(
                    ...sheet.getColumn(column.key).values
                        .map(v => String(v).length)
                );
            });
        });

        return await workbook.xlsx.writeBuffer();
    } catch (error) {
        throw error;
    }
};

module.exports = { generateExcel };
