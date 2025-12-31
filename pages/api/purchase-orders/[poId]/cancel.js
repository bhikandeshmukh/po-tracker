// pages/api/purchase-orders/[poId]/cancel.js
// Cancel a purchase order
// FIXED: Status transition validation, transaction-based, activity subcollection

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../lib/auth-middleware';
import { validateStatusTransition, sanitizeInput } from '../../../../lib/validation-schemas';
import { addPOActivity } from '../../../../lib/po-helpers';
import { incrementMetric } from '../../../../lib/metrics-service';
import { logAction, getIpAddress, getUserAgent } from '../../../../lib/audit-logger';

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
                error: { code: 'FORBIDDEN', message: 'Manager access required' }
            });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        const { poId } = req.query;
        const { reason, notes } = sanitizeInput(req.body);

        // Validation
        const cancellationReason = reason || notes || '';
        if (!cancellationReason.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Cancellation reason is required'
                }
            });
        }

        // Use transaction for atomic operation
        const result = await db.runTransaction(async (transaction) => {
            const poRef = db.collection('purchaseOrders').doc(poId);
            const poDoc = await transaction.get(poRef);

            if (!poDoc.exists) {
                throw new Error('PO_NOT_FOUND');
            }

            const poData = poDoc.data();
            const currentStatus = poData.status;

            // Check if already cancelled
            if (currentStatus === 'cancelled') {
                throw new Error('ALREADY_CANCELLED');
            }

            // FIXED: Validate status transition
            const transitionValidation = validateStatusTransition(currentStatus, 'cancelled');

            if (!transitionValidation.valid) {
                throw new Error(`INVALID_TRANSITION:${transitionValidation.error}`);
            }

            // Update PO status
            transaction.update(poRef, {
                status: 'cancelled',
                cancelledBy: user.uid,
                cancelledByName: user.name || user.email,
                cancelledAt: new Date(),
                cancellationReason: cancellationReason,
                updatedAt: new Date()
            });

            return {
                currentStatus,
                poNumber: poData.poNumber,
                totalQuantity: poData.totalQuantity || 0,
                shippedQuantity: poData.shippedQuantity || 0,
                pendingQuantity: poData.pendingQuantity || 0
            };
        });

        // Sync metrics (O(1) update)
        const metricsToUpdate = [
            incrementMetric('totalOrderQty', -result.totalQuantity),
            incrementMetric('totalShippedQty', -result.shippedQuantity),
            incrementMetric('totalPendingQty', -result.pendingQuantity)
        ];

        // Status counts
        const oldStatus = result.currentStatus;
        if (['approved', 'partial_sent'].includes(oldStatus)) metricsToUpdate.push(incrementMetric('activePOs', -1));
        else if (['pending', 'draft'].includes(oldStatus)) metricsToUpdate.push(incrementMetric('pendingPOs', -1));

        await Promise.all(metricsToUpdate);

        // FIXED: Add activity to subcollection (no array growth issue)
        await addPOActivity(poId, {
            action: 'cancelled',
            performedBy: user.uid,
            performedByName: user.name || user.email,
            performedByRole: user.role,
            changes: [{
                field: 'status',
                oldValue: result.currentStatus,
                newValue: 'cancelled'
            }],
            metadata: {
                reason: cancellationReason,
                previousStatus: result.currentStatus,
                cancellationDate: new Date().toISOString()
            }
        });

        // Create audit log using centralized logger
        await logAction(
            'UPDATE',
            user.uid,
            'PO',
            poId,
            { before: { status: result.currentStatus }, after: { status: 'cancelled' } },
            {
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req),
                userRole: user.role,
                extra: { action: 'cancelled', poNumber: result.poNumber, reason: cancellationReason }
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Purchase order cancelled successfully',
            data: {
                previousStatus: result.currentStatus,
                newStatus: 'cancelled',
                reason: cancellationReason
            }
        });

    } catch (error) {
        if (error.message === 'PO_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }

        if (error.message === 'ALREADY_CANCELLED') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_CANCELLED',
                    message: 'Purchase order is already cancelled'
                }
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

        console.error('Cancel PO Error:', {
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
