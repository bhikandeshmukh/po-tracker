// lib/pdf-export.js
// PDF export functionality for POs

/**
 * Generate PDF for a Purchase Order
 * Uses browser's print functionality with custom styling
 */
export function exportPOToPDF(po, items) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
    }

    const html = generatePOHTML(po, items);
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
}

/**
 * Generate HTML for PO PDF
 */
function generatePOHTML(po, items) {
    const subtotal = items.reduce((sum, item) => sum + (item.poQuantity * item.unitPrice), 0);
    const totalGST = items.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
    const grandTotal = subtotal + totalGST;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Purchase Order - ${po.poNumber}</title>
    <style>
        @media print {
            @page {
                size: A4;
                margin: 20mm;
            }
            body {
                margin: 0;
                padding: 0;
            }
            .no-print {
                display: none;
            }
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #4F46E5;
        }
        
        .header p {
            margin: 5px 0;
            color: #666;
        }
        
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .info-box {
            width: 48%;
        }
        
        .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #4F46E5;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 5px;
        }
        
        .info-label {
            font-weight: bold;
            width: 140px;
            color: #666;
        }
        
        .info-value {
            flex: 1;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-draft { background: #f3f4f6; color: #374151; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        th {
            background: #4F46E5;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
        }
        
        tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals {
            margin-left: auto;
            width: 300px;
            margin-top: 20px;
        }
        
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
        }
        
        .totals-row.grand-total {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            margin-top: 10px;
            color: #4F46E5;
        }
        
        .notes {
            margin-top: 30px;
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid #4F46E5;
        }
        
        .notes h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 11px;
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #4F46E5;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .print-button:hover {
            background: #4338CA;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
    
    <div class="header">
        <h1>PURCHASE ORDER</h1>
        <p>PO Number: ${po.poNumber}</p>
        <p>Date: ${new Date(po.poDate).toLocaleDateString()}</p>
    </div>
    
    <div class="info-section">
        <div class="info-box">
            <h3>Order Information</h3>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">
                    <span class="status-badge status-${po.status}">${po.status}</span>
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">PO Date:</span>
                <span class="info-value">${new Date(po.poDate).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Expected Delivery:</span>
                <span class="info-value">${new Date(po.expectedDeliveryDate).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Total Items:</span>
                <span class="info-value">${items.length}</span>
            </div>
        </div>
        
        <div class="info-box">
            <h3>Vendor Information</h3>
            <div class="info-row">
                <span class="info-label">Vendor:</span>
                <span class="info-value">${po.vendorName || po.vendorId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Vendor ID:</span>
                <span class="info-value">${po.vendorId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Warehouse:</span>
                <span class="info-value">${po.vendorWarehouseName || po.vendorWarehouseId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Warehouse ID:</span>
                <span class="info-value">${po.vendorWarehouseId}</span>
            </div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th style="width: 5%">#</th>
                <th style="width: 15%">SKU</th>
                <th style="width: 30%">Item Name</th>
                <th style="width: 10%" class="text-right">Quantity</th>
                <th style="width: 12%" class="text-right">Unit Price</th>
                <th style="width: 10%" class="text-right">GST %</th>
                <th style="width: 12%" class="text-right">GST Amount</th>
                <th style="width: 15%" class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.sku || item.itemId}</td>
                    <td>${item.itemName}</td>
                    <td class="text-right">${item.poQuantity}</td>
                    <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">${item.gstRate}%</td>
                    <td class="text-right">₹${(item.gstAmount || 0).toFixed(2)}</td>
                    <td class="text-right">₹${((item.poQuantity * item.unitPrice) + (item.gstAmount || 0)).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="totals">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Total GST:</span>
            <span>₹${totalGST.toFixed(2)}</span>
        </div>
        <div class="totals-row grand-total">
            <span>Grand Total:</span>
            <span>₹${grandTotal.toFixed(2)}</span>
        </div>
    </div>
    
    ${po.notes ? `
        <div class="notes">
            <h3>Notes</h3>
            <p>${po.notes}</p>
        </div>
    ` : ''}
    
    <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Generated on ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
    </div>
</body>
</html>
    `;
}

/**
 * Export multiple POs to CSV
 */
export function exportPOsToCSV(orders) {
    const headers = [
        'PO Number',
        'Vendor',
        'Warehouse',
        'Status',
        'PO Date',
        'Expected Delivery',
        'Total Items',
        'Grand Total',
        'Created At'
    ];

    const rows = orders.map(po => [
        po.poNumber,
        po.vendorName || po.vendorId,
        po.vendorWarehouseName || po.vendorWarehouseId,
        po.status,
        new Date(po.poDate).toLocaleDateString(),
        new Date(po.expectedDeliveryDate).toLocaleDateString(),
        po.totalItems || 0,
        po.grandTotal || 0,
        new Date(po.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
