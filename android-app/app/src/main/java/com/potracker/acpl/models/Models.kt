package com.potracker.acpl.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.PropertyName

data class PurchaseOrder(
    @DocumentId val id: String = "",
    val poNumber: String = "",
    val vendorId: String = "",
    val vendorName: String = "",
    val vendorWarehouseId: String = "",
    val vendorWarehouseName: String = "",
    val status: String = "draft",
    val poDate: Timestamp? = null,
    val expectedDeliveryDate: Timestamp? = null,
    val totalQuantity: Int = 0,
    val shippedQuantity: Int = 0,
    val deliveredQuantity: Int = 0,
    val notes: String = "",
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
) {
    val pendingQuantity: Int get() = totalQuantity - shippedQuantity
}

data class Shipment(
    @DocumentId val id: String = "",
    val shipmentId: String = "",
    val shipmentNumber: String = "",
    val poId: String = "",
    val poNumber: String = "",
    val transporterId: String = "",
    val transporterName: String = "",
    val status: String = "created",
    val shipmentDate: Timestamp? = null,
    val expectedDeliveryDate: Timestamp? = null,
    val lrDocketNumber: String = "",
    val invoiceNumber: String = "",
    val totalQuantity: Int = 0,
    val deliveredQuantity: Int = 0,
    val vendorName: String = "",
    val warehouseName: String = "",
    val notes: String = "",
    val createdAt: Timestamp? = null
)

data class Appointment(
    @DocumentId val id: String = "",
    val appointmentId: String = "",
    val appointmentNumber: String = "",
    val shipmentId: String = "",
    val poId: String = "",
    val poNumber: String = "",
    val status: String = "created",
    val scheduledDate: Timestamp? = null,
    val scheduledTimeSlot: String = "",
    val lrDocketNumber: String = "",
    val invoiceNumber: String = "",
    val totalQuantity: Int = 0,
    val vendorName: String = "",
    val warehouseName: String = "",
    val transporterName: String = "",
    val emailSent: Boolean = false,
    val notes: String = "",
    val createdAt: Timestamp? = null
)

data class Comment(
    @DocumentId val id: String = "",
    val text: String = "",
    val createdBy: String = "",
    val createdAt: Timestamp? = null
)

data class Vendor(
    @DocumentId val id: String = "",
    val vendorId: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = ""
)

data class Transporter(
    @DocumentId val id: String = "",
    val transporterId: String = "",
    val name: String = "",
    val phone: String = ""
)
