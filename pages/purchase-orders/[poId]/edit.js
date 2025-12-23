// pages/purchase-orders/[poId]/edit.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import POForm from '../../../components/PurchaseOrders/POForm';
import apiClient from '../../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

function EditPurchaseOrder() {
    const router = useRouter();
    const { poId } = router.query;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        poNumber: '',
        vendorId: '',
        vendorWarehouseId: '',
        poDate: '',
        expectedDelivery: '',
        cancelledDate: '',
        status: 'draft',
        notes: '',
        items: []
    });

    useEffect(() => {
        let isMounted = true;

        const fetchPO = async () => {
            try {
                const [poResponse, itemsResponse] = await Promise.all([
                    apiClient.getPOById(poId),
                    apiClient.getPOItems(poId)
                ]);
                
                if (isMounted && poResponse.success && itemsResponse.success) {
                    const po = poResponse.data;
                    const items = itemsResponse.data.map(item => ({
                        poQty: item.poQuantity,
                        qtySent: item.shippedQuantity || 0,
                        qtyPending: item.pendingQuantity || item.poQuantity,
                        deliveredQty: item.deliveredQuantity || 0
                    }));
                    
                    setFormData({
                        poNumber: po.poNumber,
                        vendorId: po.vendorId,
                        vendorWarehouseId: po.vendorWarehouseId,
                        poDate: po.poDate?.split('T')[0] || '',
                        expectedDelivery: po.expectedDeliveryDate?.split('T')[0] || '',
                        cancelledDate: po.cancelledDate?.split('T')[0] || '',
                        status: po.status,
                        notes: po.notes || '',
                        items: items
                    });
                }
            } catch (err) {
                if (isMounted) setError('Failed to load PO');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (poId) fetchPO();

        return () => {
            isMounted = false;
        };
    }, [poId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const apiData = {
                poNumber: formData.poNumber,
                vendorId: formData.vendorId,
                vendorWarehouseId: formData.vendorWarehouseId,
                poDate: formData.poDate,
                expectedDeliveryDate: formData.expectedDelivery,
                notes: formData.notes || '',
                items: formData.items.map(item => ({
                    poQuantity: parseInt(item.poQty, 10) || 0,
                    shippedQuantity: parseInt(item.qtySent, 10) || 0,
                    pendingQuantity: parseInt(item.qtyPending, 10) || 0,
                    deliveredQuantity: parseInt(item.deliveredQty, 10) || 0
                }))
            };

            const response = await apiClient.updatePO(poId, apiData);
            if (response.success) {
                router.push(`/purchase-orders/${poId}`);
            } else {
                setError(response.error?.message || 'Failed to update PO');
            }
        } catch (err) {
            setError(err.message || 'Failed to update PO');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push(`/purchase-orders/${poId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Purchase Order</h1>
                        <p className="text-gray-600 mt-1">Update PO details and items</p>
                    </div>
                </div>
                <POForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} loading={saving} error={error} submitText="Update Purchase Order" />
            </div>
        </Layout>
    );
}

export default EditPurchaseOrder;
