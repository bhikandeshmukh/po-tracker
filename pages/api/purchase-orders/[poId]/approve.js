// pages/api/purchase-orders/[poId]/approve.js
// Approve a purchase order
// FIXED: Status transition validation, transaction-based, activity subcollection

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../lib/auth-middleware';
import { validateStatusTransition } from '../../../../lib/validation-schemas';
import { addPOActivity } from '../../../../lib/po-helpers';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Manager access required to approve PO' }
            });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        const { poId } = req.query;
        const { notes } = req.body;

        // Use transaction for atomic operation
        const result = await db.runTransaction(async (transaction) => {
            const poRef = db.collection('purchaseOrders').doc(poId);
            const poDoc = await transaction.get(poRef);
            
            if (!poDoc.exists) {
                throw new Error('PO_NOT_FOUND');
            }

            const poData = poDoc.data();
            const currentStatus = poData.status;

            // FIXED: Validate status transition
            const transitionValidation = validateStatusTransition(currentStatus, 'approved');
            
            if (!transitionValidation.valid) {
                throw new Error(`INVALID_TRANSITION:${transitionValidation.error}`);
            }

            // Update PO status
            transaction.update(poRef, {
                status: 'approved',
                approvedBy: user.uid,
                approvedByName: user.name || user.email,
                approvedAt: new Date(),
                updatedAt: new Date()
            });

            return { currentStatus, poNumber: poData.poNumber };
        });

        // FIXED: Add activity to subcollection (no array growth issue)
        await addPOActivity(poId, {
            action: 'approved',
            performedBy: user.uid,
            performedByName: user.name || user.email,
            performedByRole: user.role,
            changes: [{
                field: 'status',
                oldValue: result.currentStatus,
                newValue: 'approved'
            }],
            metadata: { 
                notes: notes || '',
                approvalDate: new Date().toISOString()
            }
        });

        // Create audit log
        await db.collection('auditLogs').doc().set({
            entityType: 'PO',
            entityId: poId,
            entityNumber: result.poNumber,
            action: 'approved',
            userId: user.uid,
            userName: user.name || user.email,
            userRole: user.role || 'user',
            timestamp: new Date(),
            metadata: {
                previousStatus: result.currentStatus,
                notes: notes || ''
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Purchase order approved successfully',
            data: {
                previousStatus: result.currentStatus,
                newStatus: 'approved'
            }
        });

    } catch (error) {
        if (error.message === 'PO_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }

        if (error.message.startsWith('INVALID_TRANSITION:')) {
            const errorMessage = error.message.replace('INVALID_TRANSITION:', '');
            return res.status(400).json({
                success: false,
                error: { 
                    code: 'INVALID_STATUS_TRANSITION', 
                    message: errorMessage 
                }
            });
        }

        console.error('Approve PO Error:', {
            message: error.message,
            poId: req.query.poId,
            user: user?.uid
        });
        
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Internal server error' }
        });
    }
}
