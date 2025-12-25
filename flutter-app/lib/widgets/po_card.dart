import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';

class POCard extends StatelessWidget {
  final PurchaseOrder po;
  final VoidCallback onTap;

  const POCard({super.key, required this.po, required this.onTap});

  Color _getStatusColor(String status) {
    switch (status) {
      case 'approved': return Colors.green;
      case 'cancelled': return Colors.red;
      case 'draft': return Colors.grey;
      default: return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        title: Row(
          children: [
            Expanded(child: Text(po.poNumber, style: const TextStyle(fontWeight: FontWeight.bold))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _getStatusColor(po.status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                po.status.toUpperCase(),
                style: TextStyle(fontSize: 10, color: _getStatusColor(po.status), fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(po.vendorName.isNotEmpty ? po.vendorName : po.vendorId),
            Text(
              'Qty: ${po.totalQuantity} | Shipped: ${po.shippedQuantity} | Pending: ${po.pendingQuantity}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            if (po.expectedDeliveryDate != null)
              Text(
                'Expected: ${DateFormat('dd MMM yyyy').format(po.expectedDeliveryDate!)}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
