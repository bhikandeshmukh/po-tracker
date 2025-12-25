import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../services/firebase_repository.dart';
import '../widgets/po_card.dart';
import '../widgets/shipment_card.dart';
import '../widgets/appointment_card.dart';
import 'po_detail_screen.dart';
import 'shipment_detail_screen.dart';
import 'appointment_detail_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _repository = FirebaseRepository();
  
  List<PurchaseOrder> _purchaseOrders = [];
  List<Shipment> _shipments = [];
  List<Appointment> _appointments = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _repository.getPurchaseOrders(),
        _repository.getShipments(),
        _repository.getAppointments(),
      ]);
      setState(() {
        _purchaseOrders = results[0] as List<PurchaseOrder>;
        _shipments = results[1] as List<Shipment>;
        _appointments = results[2] as List<Appointment>;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PO Tracker'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthService>().logout(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'POs'),
            Tab(text: 'Shipments'),
            Tab(text: 'Appointments'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildPOList(),
                  _buildShipmentList(),
                  _buildAppointmentList(),
                ],
              ),
      ),
    );
  }

  Widget _buildPOList() {
    if (_purchaseOrders.isEmpty) {
      return const Center(child: Text('No Purchase Orders'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _purchaseOrders.length,
      itemBuilder: (context, index) {
        final po = _purchaseOrders[index];
        return POCard(
          po: po,
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => PODetailScreen(poId: po.id)),
            );
            _loadData();
          },
        );
      },
    );
  }

  Widget _buildShipmentList() {
    if (_shipments.isEmpty) {
      return const Center(child: Text('No Shipments'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _shipments.length,
      itemBuilder: (context, index) {
        final shipment = _shipments[index];
        return ShipmentCard(
          shipment: shipment,
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ShipmentDetailScreen(shipmentId: shipment.id)),
            );
            _loadData();
          },
        );
      },
    );
  }

  Widget _buildAppointmentList() {
    if (_appointments.isEmpty) {
      return const Center(child: Text('No Appointments'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _appointments.length,
      itemBuilder: (context, index) {
        final appointment = _appointments[index];
        return AppointmentCard(
          appointment: appointment,
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => AppointmentDetailScreen(appointmentId: appointment.id)),
            );
            _loadData();
          },
          onEmailToggle: (value) async {
            await _repository.updateAppointmentEmailSent(appointment.id, value);
            _loadData();
          },
        );
      },
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}
