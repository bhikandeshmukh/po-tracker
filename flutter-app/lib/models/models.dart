import 'package:cloud_firestore/cloud_firestore.dart';

class PurchaseOrder {
  final String id;
  final String poNumber;
  final String vendorId;
  final String vendorName;
  final String vendorWarehouseId;
  final String vendorWarehouseName;
  final String status;
  final DateTime? poDate;
  final DateTime? expectedDeliveryDate;
  final int totalQuantity;
  final int shippedQuantity;
  final int deliveredQuantity;
  final String notes;
  final DateTime? createdAt;

  PurchaseOrder({
    required this.id,
    this.poNumber = '',
    this.vendorId = '',
    this.vendorName = '',
    this.vendorWarehouseId = '',
    this.vendorWarehouseName = '',
    this.status = 'draft',
    this.poDate,
    this.expectedDeliveryDate,
    this.totalQuantity = 0,
    this.shippedQuantity = 0,
    this.deliveredQuantity = 0,
    this.notes = '',
    this.createdAt,
  });

  int get pendingQuantity => totalQuantity - shippedQuantity;

  factory PurchaseOrder.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return PurchaseOrder(
      id: doc.id,
      poNumber: data['poNumber'] ?? '',
      vendorId: data['vendorId'] ?? '',
      vendorName: data['vendorName'] ?? '',
      vendorWarehouseId: data['vendorWarehouseId'] ?? '',
      vendorWarehouseName: data['vendorWarehouseName'] ?? '',
      status: data['status'] ?? 'draft',
      poDate: (data['poDate'] as Timestamp?)?.toDate(),
      expectedDeliveryDate: (data['expectedDeliveryDate'] as Timestamp?)?.toDate(),
      totalQuantity: data['totalQuantity'] ?? 0,
      shippedQuantity: data['shippedQuantity'] ?? 0,
      deliveredQuantity: data['deliveredQuantity'] ?? 0,
      notes: data['notes'] ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}

class Shipment {
  final String id;
  final String shipmentNumber;
  final String poId;
  final String poNumber;
  final String transporterId;
  final String transporterName;
  final String status;
  final DateTime? shipmentDate;
  final DateTime? expectedDeliveryDate;
  final String lrDocketNumber;
  final String invoiceNumber;
  final int totalQuantity;
  final String vendorName;
  final String warehouseName;
  final DateTime? createdAt;

  Shipment({
    required this.id,
    this.shipmentNumber = '',
    this.poId = '',
    this.poNumber = '',
    this.transporterId = '',
    this.transporterName = '',
    this.status = 'created',
    this.shipmentDate,
    this.expectedDeliveryDate,
    this.lrDocketNumber = '',
    this.invoiceNumber = '',
    this.totalQuantity = 0,
    this.vendorName = '',
    this.warehouseName = '',
    this.createdAt,
  });

  factory Shipment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Shipment(
      id: doc.id,
      shipmentNumber: data['shipmentNumber'] ?? '',
      poId: data['poId'] ?? '',
      poNumber: data['poNumber'] ?? '',
      transporterId: data['transporterId'] ?? '',
      transporterName: data['transporterName'] ?? '',
      status: data['status'] ?? 'created',
      shipmentDate: (data['shipmentDate'] as Timestamp?)?.toDate(),
      expectedDeliveryDate: (data['expectedDeliveryDate'] as Timestamp?)?.toDate(),
      lrDocketNumber: data['lrDocketNumber'] ?? '',
      invoiceNumber: data['invoiceNumber'] ?? '',
      totalQuantity: data['totalQuantity'] ?? 0,
      vendorName: data['vendorName'] ?? '',
      warehouseName: data['warehouseName'] ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}

class Appointment {
  final String id;
  final String appointmentNumber;
  final String shipmentId;
  final String poId;
  final String poNumber;
  final String status;
  final DateTime? scheduledDate;
  final String scheduledTimeSlot;
  final String lrDocketNumber;
  final String invoiceNumber;
  final int totalQuantity;
  final String vendorName;
  final String warehouseName;
  final String transporterName;
  final bool emailSent;
  final DateTime? createdAt;

  Appointment({
    required this.id,
    this.appointmentNumber = '',
    this.shipmentId = '',
    this.poId = '',
    this.poNumber = '',
    this.status = 'created',
    this.scheduledDate,
    this.scheduledTimeSlot = '',
    this.lrDocketNumber = '',
    this.invoiceNumber = '',
    this.totalQuantity = 0,
    this.vendorName = '',
    this.warehouseName = '',
    this.transporterName = '',
    this.emailSent = false,
    this.createdAt,
  });

  factory Appointment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Appointment(
      id: doc.id,
      appointmentNumber: data['appointmentNumber'] ?? '',
      shipmentId: data['shipmentId'] ?? '',
      poId: data['poId'] ?? '',
      poNumber: data['poNumber'] ?? '',
      status: data['status'] ?? 'created',
      scheduledDate: (data['scheduledDate'] as Timestamp?)?.toDate(),
      scheduledTimeSlot: data['scheduledTimeSlot'] ?? '',
      lrDocketNumber: data['lrDocketNumber'] ?? '',
      invoiceNumber: data['invoiceNumber'] ?? '',
      totalQuantity: data['totalQuantity'] ?? 0,
      vendorName: data['vendorName'] ?? '',
      warehouseName: data['warehouseName'] ?? '',
      transporterName: data['transporterName'] ?? '',
      emailSent: data['emailSent'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}

class Comment {
  final String id;
  final String text;
  final String createdBy;
  final DateTime? createdAt;

  Comment({required this.id, this.text = '', this.createdBy = '', this.createdAt});

  factory Comment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Comment(
      id: doc.id,
      text: data['text'] ?? '',
      createdBy: data['createdBy'] ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}
