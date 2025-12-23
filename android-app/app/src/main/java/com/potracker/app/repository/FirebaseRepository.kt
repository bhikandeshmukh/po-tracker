package com.potracker.app.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.potracker.app.models.*
import kotlinx.coroutines.tasks.await

class FirebaseRepository {
    private val db = FirebaseFirestore.getInstance()
    
    // Purchase Orders
    suspend fun getPurchaseOrders(): List<PurchaseOrder> {
        return db.collection("purchaseOrders")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get().await()
            .toObjects(PurchaseOrder::class.java)
    }
    
    suspend fun getPOById(poId: String): PurchaseOrder? {
        return db.collection("purchaseOrders").document(poId)
            .get().await()
            .toObject(PurchaseOrder::class.java)
    }
    
    suspend fun updatePOStatus(poId: String, status: String) {
        db.collection("purchaseOrders").document(poId)
            .update(mapOf("status" to status, "updatedAt" to Timestamp.now()))
            .await()
    }
    
    // Shipments
    suspend fun getShipments(): List<Shipment> {
        return db.collection("shipments")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get().await()
            .toObjects(Shipment::class.java)
    }
    
    suspend fun getShipmentsByPO(poId: String): List<Shipment> {
        return db.collection("shipments")
            .whereEqualTo("poId", poId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get().await()
            .toObjects(Shipment::class.java)
    }
    
    suspend fun getShipmentById(shipmentId: String): Shipment? {
        return db.collection("shipments").document(shipmentId)
            .get().await()
            .toObject(Shipment::class.java)
    }
    
    suspend fun updateShipmentStatus(shipmentId: String, status: String) {
        db.collection("shipments").document(shipmentId)
            .update(mapOf("status" to status, "updatedAt" to Timestamp.now()))
            .await()
        // Also update appointment
        db.collection("appointments").document(shipmentId)
            .update(mapOf("status" to status, "updatedAt" to Timestamp.now()))
            .await()
    }
    
    suspend fun updateShipmentDetails(shipmentId: String, lrDocket: String, invoice: String) {
        val updates = mapOf(
            "lrDocketNumber" to lrDocket,
            "invoiceNumber" to invoice,
            "updatedAt" to Timestamp.now()
        )
        db.collection("shipments").document(shipmentId).update(updates).await()
        db.collection("appointments").document(shipmentId).update(updates).await()
    }
    
    // Appointments
    suspend fun getAppointments(): List<Appointment> {
        return db.collection("appointments")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get().await()
            .toObjects(Appointment::class.java)
    }
    
    suspend fun getAppointmentById(appointmentId: String): Appointment? {
        return db.collection("appointments").document(appointmentId)
            .get().await()
            .toObject(Appointment::class.java)
    }
    
    suspend fun updateAppointmentEmailSent(appointmentId: String, emailSent: Boolean) {
        db.collection("appointments").document(appointmentId)
            .update(mapOf("emailSent" to emailSent, "updatedAt" to Timestamp.now()))
            .await()
    }
    
    // Comments
    suspend fun getComments(poId: String): List<Comment> {
        return db.collection("purchaseOrders").document(poId)
            .collection("comments")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get().await()
            .toObjects(Comment::class.java)
    }
    
    suspend fun addComment(poId: String, text: String, userName: String) {
        val comment = hashMapOf(
            "text" to text,
            "createdBy" to userName,
            "createdAt" to Timestamp.now()
        )
        db.collection("purchaseOrders").document(poId)
            .collection("comments")
            .add(comment).await()
    }
    
    // Vendors & Transporters
    suspend fun getVendors(): List<Vendor> {
        return db.collection("vendors").get().await()
            .toObjects(Vendor::class.java)
    }
    
    suspend fun getTransporters(): List<Transporter> {
        return db.collection("transporters").get().await()
            .toObjects(Transporter::class.java)
    }
}
