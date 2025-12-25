import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/firebase_repository.dart';
import '../widgets/shipment_card.dart';
import 'shipment_detail_screen.dart';

class PODetailScreen extends StatefulWidget {
  final String poId;
  const PODetailScreen({super.key, required this.poId});

  @override
  State<PODetailScreen> createState() => _PODetailScreenState();
}

class _PODetailScreenState extends State<PODetailScreen> {
  final _repository = FirebaseRepository();
  final _commentController = TextEditingController();
  
  PurchaseOrder? _po;
  List<Shipment> _shipments = [];
  List<Comment> _comments = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _repository.getPOById(widget.poId),
        _repository.getShipmentsByPO(widget.poId),
        _repository.getComments(widget.poId),
      ]);
      setState(() {
        _po = results[0] as PurchaseOrder?;
        _shipments = results[1] as List<Shipment>;
        _comments = results[2] as List<Comment>;
      });
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
      await _repository.updatePOStatus(widget.poId, status);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Status updated to $status')),
      );
      _loadData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _addComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    
    try {
      await _repository.addComment(widget.poId, text, 'User');
      _commentController.clear();
      _loadData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'approved': return Colors.green;
      case 'cancelled': return Colors.red;
      case 'draft': return Colors.grey;
      default: return Colors.orange;
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '-';
    return DateFormat('dd MMM yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_po?.poNumber ?? 'PO Detail')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _po == null
              ? const Center(child: Text('PO not found'))
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
                        _buildQuantityCard(),
                        const SizedBox(height: 16),
                        if (_po!.status == 'draft') _buildActionButtons(),
                        const SizedBox(height: 16),
                        _buildShipmentsSection(),
                        const SizedBox(height: 16),
                        _buildCommentsSection(),
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
                Text(_po!.poNumber, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(_po!.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _po!.status.toUpperCase(),
                    style: TextStyle(color: _getStatusColor(_po!.status), fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            _infoRow('Vendor', _po!.vendorName.isNotEmpty ? _po!.vendorName : _po!.vendorId),
            _infoRow('Warehouse', _po!.vendorWarehouseName.isNotEmpty ? _po!.vendorWarehouseName : _po!.vendorWarehouseId),
            _infoRow('PO Date', _formatDate(_po!.poDate)),
            _infoRow('Expected Delivery', _formatDate(_po!.expectedDeliveryDate)),
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

  Widget _buildQuantityCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _quantityItem('Total', _po!.totalQuantity, Colors.blue),
            _quantityItem('Shipped', _po!.shippedQuantity, Colors.green),
            _quantityItem('Pending', _po!.pendingQuantity, Colors.orange),
          ],
        ),
      ),
    );
  }

  Widget _quantityItem(String label, int value, Color color) {
    return Column(
      children: [
        Text('$value', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => _updateStatus('approved'),
            icon: const Icon(Icons.check),
            label: const Text('Approve'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _showCancelDialog(),
            icon: const Icon(Icons.close),
            label: const Text('Cancel'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
          ),
        ),
      ],
    );
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel PO'),
        content: const Text('Are you sure you want to cancel this PO?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('No')),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _updateStatus('cancelled');
            },
            child: const Text('Yes', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildShipmentsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Shipments (${_shipments.length})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (_shipments.isEmpty)
          const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No shipments')))
        else
          ..._shipments.map((s) => ShipmentCard(
            shipment: s,
            onTap: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => ShipmentDetailScreen(shipmentId: s.id)));
              _loadData();
            },
          )),
      ],
    );
  }

  Widget _buildCommentsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Comments (${_comments.length})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _commentController,
                decoration: const InputDecoration(hintText: 'Add comment...', border: OutlineInputBorder()),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(onPressed: _addComment, icon: const Icon(Icons.send), color: Colors.blue),
          ],
        ),
        const SizedBox(height: 8),
        ..._comments.map((c) => Card(
          child: ListTile(
            title: Text(c.text),
            subtitle: Text('${c.createdBy} • ${_formatDate(c.createdAt)}'),
          ),
        )),
      ],
    );
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }
}
