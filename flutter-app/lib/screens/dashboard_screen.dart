import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../models/models.dart';
import '../services/firebase_repository.dart';
import '../widgets/dashboard/stat_card_modern.dart';
import '../widgets/dashboard/sales_chart_widget.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _repository = FirebaseRepository();
  DashboardMetrics? _metrics;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMetrics();
  }

  Future<void> _loadMetrics() async {
    setState(() => _isLoading = true);
    final metrics = await _repository.getDashboardMetrics();
    if (mounted) {
      setState(() {
        _metrics = metrics;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return _buildLoading();
    }

    if (_metrics == null) {
      return const Center(child: Text('Failed to load dashboard'));
    }

    return RefreshIndicator(
      onRefresh: _loadMetrics,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Overview',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          _buildStatsGrid(),
          const SizedBox(height: 24),
          SalesChartWidget(
            totalOrder: _metrics!.totalOrderQty,
            totalShipped: _metrics!.totalShippedQty,
            totalDelivered: _metrics!.totalDeliveredQty,
          ),
          const SizedBox(height: 24),
          _buildQuickStats(),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        StatCardModern(
          title: 'Total Order Qty',
          value: _metrics!.totalOrderQty.toString(),
          change: '+12.5%',
          trendUp: true,
          icon: Icons.inventory_2_outlined,
          baseColor: Colors.blue,
        ),
        StatCardModern(
          title: 'Shipped Qty',
          value: _metrics!.totalShippedQty.toString(),
          change: '+8.2%',
          trendUp: true,
          icon: Icons.local_shipping_outlined,
          baseColor: Colors.green,
        ),
        StatCardModern(
          title: 'Pending Qty',
          value: _metrics!.totalPendingQty.toString(),
          change: '-3.1%',
          trendUp: false,
          icon: Icons.pending_actions_outlined,
          baseColor: Colors.orange,
        ),
        StatCardModern(
          title: 'Delivered Qty',
          value: _metrics!.totalDeliveredQty.toString(),
          change: '+15.3%',
          trendUp: true,
          icon: Icons.check_circle_outline,
          baseColor: Colors.purple,
        ),
      ],
    );
  }

  Widget _buildQuickStats() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'PO Status Breakdown',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          _buildStatusRow('Total POs', _metrics!.totalPOs, Colors.blue),
          _buildStatusRow('Active POs', _metrics!.activePOs, Colors.orange),
          _buildStatusRow('Completed POs', _metrics!.completedPOs, Colors.green),
          _buildStatusRow('In-Transit Shipments', _metrics!.inTransitShipments, Colors.indigo),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, int value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
          Text(
            value.toString(),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoading() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(height: 30, width: 150, color: Colors.white),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            shrinkWrap: true,
            children: List.generate(4, (_) => Container(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
