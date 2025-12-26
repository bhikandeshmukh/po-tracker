package com.potracker.acpl.data.model

data class DashboardResponse(
    val success: Boolean,
    val data: DashboardData?
)

data class DashboardData(
    val totalPOs: Int,
    val activePOs: Int,
    val completedPOs: Int,
    val totalOrderQty: Int,
    val totalShippedQty: Int,
    val totalDeliveredQty: Int,
    val totalPendingQty: Int,
    val inTransitShipments: Int,
    val deliveredShipments: Int,
    val pendingShipments: Int
)
