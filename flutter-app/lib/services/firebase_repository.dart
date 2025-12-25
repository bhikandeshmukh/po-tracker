import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/models.dart';

class FirebaseRepository {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Purchase Orders
  Future<List<PurchaseOrder>> getPurchaseOrders() async {
    final snapshot = await _db
        .collection('purchaseOrders')
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => PurchaseOrder.fromFirestore(doc)).toList();
  }

  Future<PurchaseOrder?> getPOById(String poId) async {
    final doc = await _db.collection('purchaseOrders').doc(poId).get();
    return doc.exists ? PurchaseOrder.fromFirestore(doc) : null;
  }

  Future<void> updatePOStatus(String poId, String status) async {
    await _db.collection('purchaseOrders').doc(poId).update({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Shipments
  Future<List<Shipment>> getShipments() async {
    final snapshot = await _db
        .collection('shipments')
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => Shipment.fromFirestore(doc)).toList();
  }

  Future<List<Shipment>> getShipmentsByPO(String poId) async {
    final snapshot = await _db
        .collection('shipments')
        .where('poId', isEqualTo: poId)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => Shipment.fromFirestore(doc)).toList();
  }

  Future<Shipment?> getShipmentById(String shipmentId) async {
    final doc = await _db.collection('shipments').doc(shipmentId).get();
    return doc.exists ? Shipment.fromFirestore(doc) : null;
  }

  Future<void> updateShipmentStatus(String shipmentId, String status) async {
    final updates = {'status': status, 'updatedAt': FieldValue.serverTimestamp()};
    await _db.collection('shipments').doc(shipmentId).update(updates);
    await _db.collection('appointments').doc(shipmentId).update(updates);
  }

  Future<void> updateShipmentDetails(String shipmentId, String lrDocket, String invoice) async {
    final updates = {
      'lrDocketNumber': lrDocket,
      'invoiceNumber': invoice,
      'updatedAt': FieldValue.serverTimestamp(),
    };
    await _db.collection('shipments').doc(shipmentId).update(updates);
    await _db.collection('appointments').doc(shipmentId).update(updates);
  }

  // Appointments
  Future<List<Appointment>> getAppointments() async {
    final snapshot = await _db
        .collection('appointments')
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => Appointment.fromFirestore(doc)).toList();
  }

  Future<Appointment?> getAppointmentById(String appointmentId) async {
    final doc = await _db.collection('appointments').doc(appointmentId).get();
    return doc.exists ? Appointment.fromFirestore(doc) : null;
  }

  Future<void> updateAppointmentEmailSent(String appointmentId, bool emailSent) async {
    await _db.collection('appointments').doc(appointmentId).update({
      'emailSent': emailSent,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Comments
  Future<List<Comment>> getComments(String poId) async {
    final snapshot = await _db
        .collection('purchaseOrders')
        .doc(poId)
        .collection('comments')
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => Comment.fromFirestore(doc)).toList();
  }

  Future<void> addComment(String poId, String text, String userName) async {
    await _db.collection('purchaseOrders').doc(poId).collection('comments').add({
      'text': text,
      'createdBy': userName,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
  // Dashboard
  Future<DashboardMetrics> getDashboardMetrics() async {
    try {
      final poSnapshot = await _db.collection('purchaseOrders').get();
      final shipmentSnapshot = await _db.collection('shipments').get();

      final pos = poSnapshot.docs.map((doc) => PurchaseOrder.fromFirestore(doc)).toList();
      final shipments = shipmentSnapshot.docs.map((doc) => Shipment.fromFirestore(doc)).toList();

      int totalOrderQty = 0;
      int totalShippedQty = 0;
      int totalPendingQty = 0;
      int totalDeliveredQty = 0;
      int activePOs = 0;
      int completedPOs = 0;
      int inTransitShipments = 0;

      for (var po in pos) {
        totalOrderQty += po.totalQuantity;
        totalShippedQty += po.sentQuantity; // Assuming sentQuantity exists on PO model
        // Note: You might need to adjust logic if sentQuantity isn't directly on PO or calculate from items
        
        if (po.status == 'completed') {
          completedPOs++;
        } else {
          activePOs++;
        }
      }
      
      // Basic calculation if sentQuantity is maintained on PO, otherwise derivation needed
      totalPendingQty = totalOrderQty - totalShippedQty; 
      if (totalPendingQty < 0) totalPendingQty = 0;

      for (var shipment in shipments) {
         if (shipment.status == 'delivered') {
           // This is rough approximation for metrics if item-level aggregation isn't done
           // ideally we sum up items in delivered shipments
         } else if (shipment.status == 'in_transit') {
           inTransitShipments++;
         }
      }
      
      // Calculate true Delivered Qty from shipments (more accurate)
      for (var shipment in shipments) {
          if (shipment.status == 'delivered') {
              for (var item in shipment.items) {
                  totalDeliveredQty += item.quantity;
              }
          }
      }

      return DashboardMetrics(
        totalOrderQty: totalOrderQty,
        totalShippedQty: totalShippedQty,
        totalPendingQty: totalPendingQty,
        totalDeliveredQty: totalDeliveredQty,
        totalPOs: pos.length,
        activePOs: activePOs,
        completedPOs: completedPOs,
        inTransitShipments: inTransitShipments,
      );
    } catch (e) {
      print('Error fetching dashboard metrics: $e');
      return DashboardMetrics.empty();
    }
  }
}

