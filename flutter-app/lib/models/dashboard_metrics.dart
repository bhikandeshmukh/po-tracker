class DashboardMetrics {
  final int totalOrderQty;
  final int totalShippedQty;
  final int totalPendingQty;
  final int totalDeliveredQty;
  final int totalPOs;
  final int activePOs;
  final int completedPOs;
  final int inTransitShipments;

  DashboardMetrics({
    required this.totalOrderQty,
    required this.totalShippedQty,
    required this.totalPendingQty,
    required this.totalDeliveredQty,
    required this.totalPOs,
    required this.activePOs,
    required this.completedPOs,
    required this.inTransitShipments,
  });

  factory DashboardMetrics.empty() {
    return DashboardMetrics(
      totalOrderQty: 0,
      totalShippedQty: 0,
      totalPendingQty: 0,
      totalDeliveredQty: 0,
      totalPOs: 0,
      activePOs: 0,
      completedPOs: 0,
      inTransitShipments: 0,
    );
  }
}
