package com.potracker.app.data.model

data class ShipmentResponse(
    val success: Boolean,
    val data: List<Shipment>,
    val error: ErrorDetail? = null
)

data class Shipment(
    val shipmentId: String,
    val shipmentNumber: String,
    val poNumber: String,
    val vendorName: String?,
    val totalQuantity: Int?,
    val status: String,
    val shippedDate: String?,
    val expectedDeliveryDate: String?
)
