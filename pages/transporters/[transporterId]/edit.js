// pages/transporters/[transporterId]/edit.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import TransporterForm from '../../../components/Transporters/TransporterForm';
import apiClient from '../../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

function EditTransporter() {
    const router = useRouter();
    const { transporterId } = router.query;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    useEffect(() => {
        if (transporterId) fetchTransporter();
    }, [transporterId]);

    const fetchTransporter = async () => {
        try {
            const response = await apiClient.getTransporterById(transporterId);
            if (response.success) setFormData(response.data);
        } catch (err) {
            setError('Failed to load transporter');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const response = await apiClient.updateTransporter(transporterId, formData);
            if (response.success) {
                router.push(`/transporters/${transporterId}`);
            } else {
                setError(response.error?.message || 'Failed to update transporter');
            }
        } catch (err) {
            setError(err.message || 'Failed to update transporter');
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
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push(`/transporters/${transporterId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Transporter</h1>
                        <p className="text-gray-600 mt-1">Update transporter information</p>
                    </div>
                </div>

                <TransporterForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    loading={saving}
                    error={error}
                    submitText="Update Transporter"
                />
            </div>
        </Layout>
    );
}

export default EditTransporter;
