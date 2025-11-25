// pages/shipments/create.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import ShipmentForm from '../../components/Shipments/ShipmentForm';
import apiClient from '../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

export default function CreateShipment() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        trackingNumber: '',
        transporterId: '',
        origin: '',
        destination: '',
        expectedDelivery: '',
        status: 'pending'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await apiClient.createShipment(formData);
            if (response.success) router.push('/shipments');
            else setError(response.error?.message || 'Failed to create shipment');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push('/shipments')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Shipment</h1>
                        <p className="text-gray-600 mt-1">Add a new shipment</p>
                    </div>
                </div>
                <ShipmentForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} loading={loading} error={error} submitText="Create Shipment" />
            </div>
        </Layout>
    );
}
