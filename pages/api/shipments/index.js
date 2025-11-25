// pages/api/shipments/index.js
// Get all shipments and create new shipment

import { db } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth, requireRole } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method === 'GET') {
            return await getShipments(req, res);
        } else if (req.method === 'POST') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await createShipment(req, res, user);
        } else {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function getShipments(req, res) {
    const { poId, status, transporterId, limit = 10, page = 1 } = req.query;

    let query = db.collection('shipments').orderBy('shipmentDate', 'desc');

    // Fetch all and filter in memory to avoid composite index requirement
    const snapshot = await query.get();
    
    let shipments = snapshot.docs.map(doc => ({
        id: doc.id,
        shipmentId: doc.id,
        ...doc.data(),
        shipmentDate: doc.data().shipmentDate?.toDate?.()?.toISOString() || doc.data().shipmentDate,
        expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate?.()?.toISOString() || doc.data().expectedDeliveryDate,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));

    // Apply filters in memory
    if (poId) {
        shipments = shipments.filter(s => s.poId === poId);
    }
    if (status) {
        shipments = shipments.filter(s => s.status === status);
    }
    if (transporterId) {
        shipments = shipments.filter(s => s.transporterId === transporterId);
    }

    const total = shipments.length;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Apply pagination
    const paginatedShipments = shipments.slice(skip, skip + limitNum);

    return res.status(200).json({
        success: true,
        data: paginatedShipments,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
        }
    });
}

async function createShipment(req, res, user) {
    const {
        appointmentNumber,
        poId,
        transporterId,
        invoiceNumber,
        shipmentDate,
        expectedDeliveryDate,
        shippingAddress,
        items,
        notes
    } = req.body;

    if (!appointmentNumber || !poId || !transporterId || !items || items.length === 0) {
        const missingFields = [];
        if (!appointmentNumber) missingFields.push('appointmentNumber');
        if (!poId) missingFields.push('poId');
        if (!transporterId) missingFields.push('transporterId');
        if (!items || items.length === 0) missingFields.push('items');
        
        return res.status(400).json({
            success: false,
            error: { 
                code: 'VALIDATION_ERROR', 
                message: `Missing required fields: ${missingFields.join(', ')}`,
                details: { missingFields }
            }
        });
    }

    const shipmentId = appointmentNumber; // Same as appointment ID

    // Validate poId format (should not be empty or just whitespace)
    if (!poId || typeof poId !== 'string' || poId.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: { 
                code: 'INVALID_PO_ID', 
                message: 'Invalid poId format. Expected a valid document ID, not a PO number.',
                details: { receivedPoId: poId }
            }
        });
    }

    // Check if shipment already exists
    const existingShipment = await db.collection('shipments').doc(shipmentId).get();
    if (existingShipment.exists) {
        return res.status(409).json({
            success: false,
            error: { code: 'SHIPMENT_EXISTS', message: 'Shipment already exists' }
        });
    }

    // Get PO details
    let poDoc;
    try {
        poDoc = await db.collection('purchaseOrders').doc(poId).get();
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: { 
                code: 'INVALID_PO_ID', 
                message: `Invalid poId: ${error.message}. Make sure you're passing the document ID, not the PO number.`,
                details: { receivedPoId: poId }
            }
        });
    }
    
    if (!poDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { 
                code: 'PO_NOT_FOUND', 
                message: `Purchase order with ID '${poId}' not found. Make sure you're using the document ID, not the PO number.`,
                details: { receivedPoId: poId }
            }
        });
    }

    const poData = poDoc.data();

    // Auto-calculate expected delivery date if not provided
    let calculatedDeliveryDate = expectedDeliveryDate;
    if (!calculatedDeliveryDate && poData.vendorWarehouseId) {
        // Get warehouse details to check location
        const warehouseDoc = await db.collection('vendors')
            .doc(poData.vendorId)
            .collection('warehouses')
            .doc(poData.vendorWarehouseId)
            .get();
        
        if (warehouseDoc.exists) {
            const warehouseData = warehouseDoc.data();
            const warehouseName = (warehouseData.name || warehouseData.warehouseName || '').toLowerCase();
            const addressCity = (warehouseData.address?.city || '').toLowerCase();
            const location = warehouseName || addressCity;
            
            // Calculate delivery days based on location
            let deliveryDays = 8; // Default for other locations
            if (location.includes('mumbai') || location.includes('bhiwandi')) {
                deliveryDays = 4;
            }
            
            // Add delivery days to shipment date
            const shipDate = new Date(shipmentDate);
            calculatedDeliveryDate = new Date(shipDate);
            calculatedDeliveryDate.setDate(shipDate.getDate() + deliveryDays);
            calculatedDeliveryDate = calculatedDeliveryDate.toISOString();
            
            console.log(`Auto-calculated delivery date: ${location} -> ${deliveryDays} days -> ${calculatedDeliveryDate}`);
        }
    }
    
    // Fallback to PO expected delivery date if still not set
    if (!calculatedDeliveryDate) {
        calculatedDeliveryDate = poData.expectedDeliveryDate || shipmentDate;
    }

    // Get transporter details
    const transporterDoc = await db.collection('transporters').doc(transporterId).get();
    const transporterData = transporterDoc.exists ? transporterDoc.data() : {};

    // Calculate totals
    let totalQuantity = 0;
    let totalAmount = 0;

    const processedItems = items.map(item => {
        const itemTotal = item.shippedQuantity * item.unitPrice;
        const gstAmount = (itemTotal * item.gstRate) / 100;

        totalQuantity += item.shippedQuantity;
        totalAmount += itemTotal + gstAmount;

        return {
            ...item,
            itemId: item.sku,
            receivedQuantity: 0,
            damagedQuantity: 0,
            gstAmount,
            totalAmount: itemTotal + gstAmount,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });

    // Calculate GST
    const totalGST = processedItems.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
    
    // Create shipment
    const shipmentData = {
        shipmentId,
        shipmentNumber: shipmentId,
        poId,
        poNumber: poData.poNumber,
        vendorId: poData.vendorId,
        vendorName: poData.vendorName,
        vendorWarehouseId: poData.vendorWarehouseId,
        transporterId,
        transporterName: transporterData.transporterName || '',
        invoiceNumber: invoiceNumber || '',
        status: 'created',
        shipmentDate: new Date(shipmentDate),
        expectedDeliveryDate: new Date(calculatedDeliveryDate),
        totalItems: processedItems.length,
        totalQuantity,
        totalAmount,
        totalGST,
        invoiceValue: totalAmount,
        shippingAddress: shippingAddress || {},
        notes: notes || '',
        appointmentId: appointmentNumber,
        appointmentScheduled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid
    };

    await db.collection('shipments').doc(shipmentId).set(shipmentData);

    // Save shipment items and update PO items
    const batch = db.batch();
    
    for (const item of processedItems) {
        // Save shipment item
        const shipmentItemRef = db.collection('shipments')
            .doc(shipmentId)
            .collection('items')
            .doc(item.sku);
        batch.set(shipmentItemRef, item);
        
        // Get current PO item to calculate new values
        const poItemRef = db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .doc(item.sku);
        
        const poItemDoc = await poItemRef.get();
        if (poItemDoc.exists) {
            const poItemData = poItemDoc.data();
            const currentShipped = poItemData.shippedQuantity || 0;
            const newShipped = currentShipped + (item.shippedQuantity || 0);
            const newPending = (poItemData.poQuantity || 0) - newShipped;
            
            batch.update(poItemRef, {
                shippedQuantity: newShipped,
                pendingQuantity: Math.max(0, newPending),
                updatedAt: new Date()
            });
        }
    }
    
    await batch.commit();

    // Update PO document totals
    console.log('Updating PO totals for:', poId);
    const poRefForUpdate = db.collection('purchaseOrders').doc(poId);
    const poDocForUpdate = await poRefForUpdate.get();
    
    if (!poDocForUpdate.exists) {
        console.error('PO not found for update:', poId);
    } else {
        const currentPOData = poDocForUpdate.data();
        console.log('Current PO shipped qty:', currentPOData.shippedQuantity || 0);
        console.log('Adding shipped qty:', totalQuantity);
        
        const newPOShippedQty = (currentPOData.shippedQuantity || 0) + totalQuantity;
        const newPOPendingQty = (currentPOData.totalQuantity || 0) - newPOShippedQty;
        
        console.log('New PO shipped qty:', newPOShippedQty);
        console.log('New PO pending qty:', newPOPendingQty);
        
        // Determine new PO status based on shipped quantity and expiry
        let newPOStatus = currentPOData.status;
        const totalQty = currentPOData.totalQuantity || 0;
        const expectedDeliveryDate = currentPOData.expectedDeliveryDate?.toDate?.() || new Date(currentPOData.expectedDeliveryDate);
        const isExpired = expectedDeliveryDate && new Date() > expectedDeliveryDate;
        
        if (newPOShippedQty >= totalQty) {
            // All items shipped
            newPOStatus = 'completed';
        } else if (newPOShippedQty > 0) {
            // Some items shipped
            if (isExpired) {
                // PO expired with partial shipment
                newPOStatus = 'partial_completed';
            } else {
                // PO active with partial shipment
                newPOStatus = 'partial_sent';
            }
        }
        
        await poRefForUpdate.update({
            shippedQuantity: newPOShippedQty,
            pendingQuantity: Math.max(0, newPOPendingQty),
            status: newPOStatus,
            updatedAt: new Date()
        });
        
        console.log('PO totals and status updated successfully. New status:', newPOStatus);
    }

    // Create appointment
    await db.collection('appointments').doc(appointmentNumber).set({
        appointmentId: appointmentNumber,
        appointmentNumber,
        shipmentId: shipmentId,
        shipmentNumber: shipmentId,
        poId,
        poNumber: poData.poNumber,
        vendorId: poData.vendorId,
        vendorName: poData.vendorName,
        transporterId,
        transporterName: transporterData.transporterName || '',
        totalQuantity,
        totalItems: processedItems.length,
        status: 'scheduled',
        scheduledDate: new Date(calculatedDeliveryDate),
        scheduledTimeSlot: '09:00-12:00',
        deliveryLocation: shippingAddress || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid
    });

    // Create audit log with predictable ID
    const auditLogId = `SHIPMENT_CREATED_${shipmentId}`;
    await db.collection('auditLogs').doc(auditLogId).set({
        logId: auditLogId,
        entityType: 'SHIPMENT',
        entityId: shipmentId,
        entityNumber: shipmentId,
        action: 'created',
        userId: user.uid,
        userName: user.name || user.email,
        userRole: user.role || 'user',
        timestamp: new Date(),
        metadata: {
            poNumber: poData.poNumber,
            totalQuantity,
            totalAmount,
            transporterName: transporterData.transporterName || '',
            invoiceNumber: invoiceNumber || ''
        }
    });

    // Create recent activity with predictable ID
    const recentActivityId = `SHIPMENT_CREATED_${shipmentId}`;
    await db.collection('recentActivities').doc(recentActivityId).set({
        activityId: recentActivityId,
        type: 'SHIPMENT_CREATED',
        title: 'Shipment Created',
        description: `${shipmentId} created for PO ${poData.poNumber}`,
        entityType: 'SHIPMENT',
        entityId: shipmentId,
        entityNumber: shipmentId,
        userId: user.uid,
        userName: user.name || user.email,
        metadata: {
            poNumber: poData.poNumber,
            totalQuantity,
            invoiceNumber: invoiceNumber || '',
            transporterName: transporterData.transporterName || ''
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    return res.status(201).json({
        success: true,
        data: {
            shipmentId,
            appointmentId: appointmentNumber,
            message: 'Shipment and appointment created successfully'
        }
    });
}
