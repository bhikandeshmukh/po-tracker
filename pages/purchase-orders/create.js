// pages/purchase-orders/create.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import POForm from '../../components/PurchaseOrders/POForm';
import TemplateSelector from '../../components/PurchaseOrders/TemplateSelector';
import apiClient from '../../lib/api-client';
import { withOptimisticUpdate, createOptimisticPO } from '../../lib/optimistic-updates';
import { ArrowLeft } from 'lucide-react';

export default function CreatePurchaseOrder() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        poNumber: '',
        vendorId: '',
        vendorWarehouseId: '',
        poDate: new Date().toISOString().substring(0, 10),
        expectedDelivery: '',
        status: 'draft',
        notes: '',
        items: []
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Transform form data to match API expectations
        const apiData = {
            poNumber: formData.poNumber,
            vendorId: formData.vendorId,
            vendorWarehouseId: formData.vendorWarehouseId,
            poDate: formData.poDate,
            expectedDeliveryDate: formData.expectedDelivery,
            notes: formData.notes || '',
            termsAndConditions: '',
            items: formData.items.map(item => ({
                poQuantity: parseInt(item.poQty) || 0,
                shippedQuantity: parseInt(item.qtySent) || 0,
                pendingQuantity: parseInt(item.qtyPending) || 0,
                deliveredQuantity: parseInt(item.deliveredQty) || 0
            }))
        };
        
        // Use optimistic update
        await withOptimisticUpdate({
            optimisticUpdate: () => {
                setLoading(true);
                // Could store optimistic PO in context/state if needed
            },
            apiCall: () => apiClient.createPO(apiData),
            onSuccess: (response) => {
                if (response.success) {
                    // Navigate to PO list with success message
                    router.push('/purchase-orders?created=true');
                } else {
                    setError(response.error?.message || 'Failed to create purchase order');
                    setLoading(false);
                }
            },
            onError: (err) => {
                setError(err.message || 'Failed to create purchase order');
                setLoading(false);
            },
            rollback: () => {
                setLoading(false);
            }
        });
    };

    const handleLoadTemplate = (templateData) => {
        setFormData(templateData);
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/purchase-orders')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Create Purchase Order</h1>
                            <p className="text-gray-600 mt-1">Add a new purchase order with items</p>
                        </div>
                    </div>
                    <TemplateSelector 
                        onLoadTemplate={handleLoadTemplate}
                        currentFormData={formData}
                    />
                </div>
                <POForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} loading={loading} error={error} submitText="Create Purchase Order" />
            </div>
        </Layout>
    );
}
