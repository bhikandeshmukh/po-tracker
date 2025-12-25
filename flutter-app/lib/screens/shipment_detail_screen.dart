import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/firebase_repository.dart';

class ShipmentDetailScreen extends StatefulWidget {
  final String shipmentId;
  const ShipmentDetailScreen({super.key, required this.shipmentId});

  @override
  State<ShipmentDetailScreen> createState() => _ShipmentDetailScreenState();
}

class _ShipmentDetailScreenState extends State<ShipmentDetailScreen> {
  final _repository = FirebaseRepository();
  Shipment? _shipment;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      _shipment = await _repository.getShipmentById(widget.shipmentId);
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateStatus(String status) async {
    try {
      await _repository.updateShipmentStatus(widget.shipmentId, status);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to $status')));
      _loadData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showEditDialog() {
    final lrController = TextEditingController(text: _shipment?.lrDocketNumber);
    final invoiceController = TextEditingController(text: _shipment?.invoiceNumber);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: lrController, decoration: const InputDecoration(labelText: 'LR/Docket Number')),
            const SizedBox(height: 16),
            TextField(controller: invoiceController, decoration: const InputDecoration(labelText: 'Invoice Number')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _repository.updateShipmentDetails(widget.shipmentId, lrController.text, invoiceController.text);
              _loadData();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'delivered': return Colors.green;
      case 'in_transit': return Colors.blue;
      case 'cancelled': return Colors.red;
      default: return Colors.orange;
    }
  }

  String _formatDate(DateTime? date) => date == null ? '-' : DateFormat('dd MMM yyyy').format(date);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_shipment?.shipmentNumber ?? 'Shipment Detail'),
        actions: [
          IconButton(icon: const Icon(Icons.edit), onPressed: _showEditDialog),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _shipment == null
              ? const Center(child: Text('Shipment not found'))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInfoCard(),
                        const SizedBox(height: 16),
                        _buildStatusButtons(),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_shipment!.shipmentNumber, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(_shipment!.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _shipment!.status.toUpperCase(),
                    style: TextStyle(color: _getStatusColor(_shipment!.status), fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            _infoRow('PO Number', _shipment!.poNumber),
            _infoRow('Vendor', _shipment!.vendorName),
            _infoRow('Warehouse', _shipment!.warehouseName),
            _infoRow('Transporter', _shipment!.transporterName),
            _infoRow('Shipment Date', _formatDate(_shipment!.shipmentDate)),
            _infoRow('Expected Delivery', _formatDate(_shipment!.expectedDeliveryDate)),
            _infoRow('LR/Docket', _shipment!.lrDocketNumber.isNotEmpty ? _shipment!.lrDocketNumber : '-'),
            _infoRow('Invoice', _shipment!.invoiceNumber.isNotEmpty ? _shipment!.invoiceNumber : '-'),
            _infoRow('Quantity', '${_shipment!.totalQuantity}'),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildStatusButtons() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _statusButton('In Transit', 'in_transit', Colors.blue),
        _statusButton('Delivered', 'delivered', Colors.green),
        _statusButton('Cancelled', 'cancelled', Colors.red),
      ],
    );
  }

  Widget _statusButton(String label, String status, Color color) {
    final isActive = _shipment?.status == status;
    return ElevatedButton(
      onPressed: isActive ? null : () => _updateStatus(status),
      style: ElevatedButton.styleFrom(
        backgroundColor: isActive ? color : Colors.grey[200],
        foregroundColor: isActive ? Colors.white : Colors.black87,
      ),
      child: Text(label),
    );
  }
}
