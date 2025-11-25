// pages/transporters/create.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import TransporterForm from '../../components/Transporters/TransporterForm';
import apiClient from '../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

export default function CreateTransporter() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        gstNumber: '',
        vehicleType: '',
        isActive: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Map form data to API expected format
            const transporterData = {
                transporterName: formData.companyName,
                contactPerson: formData.contactPerson,
                email: formData.email,
                phone: formData.phone,
                gstNumber: formData.gstNumber,
                vehicleTypes: formData.vehicleType ? [formData.vehicleType] : [],
                isActive: formData.isActive
            };
            
            const response = await apiClient.createTransporter(transporterData);
            if (response.success) {
                router.push('/transporters');
            } else {
                setError(response.error?.message || 'Failed to create transporter');
            }
        } catch (err) {
            setError(err.message || 'Failed to create transporter');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push('/transporters')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Add New Transporter</h1>
                        <p className="text-gray-600 mt-1">Create a new transporter profile</p>
                    </div>
                </div>
                <TransporterForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} loading={loading} error={error} submitText="Create Transporter" />
            </div>
        </Layout>
    );
}
