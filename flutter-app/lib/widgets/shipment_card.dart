import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';

class ShipmentCard extends StatelessWidget {
  final Shipment shipment;
  final VoidCallback onTap;

  const ShipmentCard({super.key, required this.shipment, required this.onTap});

  Color _getStatusColor(String status) {
    switch (status) {
      case 'delivered': return Colors.green;
      case 'in_transit': return Colors.blue;
      case 'cancelled': return Colors.red;
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
            Expanded(child: Text(shipment.shipmentNumber, style: const TextStyle(fontWeight: FontWeight.bold))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _getStatusColor(shipment.status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                shipment.status.toUpperCase().replaceAll('_', ' '),
                style: TextStyle(fontSize: 10, color: _getStatusColor(shipment.status), fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text('PO: ${shipment.poNumber}'),
            Text(
              '${shipment.transporterName} | Qty: ${shipment.totalQuantity}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            if (shipment.expectedDeliveryDate != null)
              Text(
                'Expected: ${DateFormat('dd MMM yyyy').format(shipment.expectedDeliveryDate!)}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
