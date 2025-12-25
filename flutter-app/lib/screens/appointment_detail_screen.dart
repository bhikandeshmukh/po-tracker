import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/firebase_repository.dart';

class AppointmentDetailScreen extends StatefulWidget {
  final String appointmentId;
  const AppointmentDetailScreen({super.key, required this.appointmentId});

  @override
  State<AppointmentDetailScreen> createState() => _AppointmentDetailScreenState();
}

class _AppointmentDetailScreenState extends State<AppointmentDetailScreen> {
  final _repository = FirebaseRepository();
  Appointment? _appointment;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      _appointment = await _repository.getAppointmentById(widget.appointmentId);
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleEmailSent(bool value) async {
    try {
      await _repository.updateAppointmentEmailSent(widget.appointmentId, value);
      _loadData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed': return Colors.green;
      case 'cancelled': return Colors.red;
      default: return Colors.orange;
    }
  }

  String _formatDate(DateTime? date) => date == null ? '-' : DateFormat('dd MMM yyyy').format(date);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_appointment?.appointmentNumber ?? 'Appointment Detail')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _appointment == null
              ? const Center(child: Text('Appointment not found'))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _buildInfoCard(),
                        const SizedBox(height: 16),
                        _buildEmailToggle(),
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
                Text(_appointment!.appointmentNumber, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(_appointment!.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _appointment!.status.toUpperCase(),
                    style: TextStyle(color: _getStatusColor(_appointment!.status), fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            _infoRow('PO Number', _appointment!.poNumber),
            _infoRow('Vendor', _appointment!.vendorName),
            _infoRow('Warehouse', _appointment!.warehouseName),
            _infoRow('Transporter', _appointment!.transporterName),
            _infoRow('Scheduled Date', _formatDate(_appointment!.scheduledDate)),
            _infoRow('Time Slot', _appointment!.scheduledTimeSlot.isNotEmpty ? _appointment!.scheduledTimeSlot : '-'),
            _infoRow('LR/Docket', _appointment!.lrDocketNumber.isNotEmpty ? _appointment!.lrDocketNumber : '-'),
            _infoRow('Invoice', _appointment!.invoiceNumber.isNotEmpty ? _appointment!.invoiceNumber : '-'),
            _infoRow('Quantity', '${_appointment!.totalQuantity}'),
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

  Widget _buildEmailToggle() {
    return Card(
      child: SwitchListTile(
        title: const Text('Email Sent'),
        subtitle: Text(_appointment!.emailSent ? 'Email has been sent' : 'Email not sent yet'),
        value: _appointment!.emailSent,
        onChanged: _toggleEmailSent,
      ),
    );
  }
}
