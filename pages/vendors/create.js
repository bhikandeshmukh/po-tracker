// pages/vendors/create.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import VendorForm from '../../components/Vendors/VendorForm';
import apiClient from '../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

export default function CreateVendor() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        vendorName: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        gstNumber: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        isActive: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.createVendor(formData);
            if (response.success) {
                router.push('/vendors');
            } else {
                setError(response.error?.message || 'Failed to create vendor');
            }
        } catch (err) {
            setError(err.message || 'Failed to create vendor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push('/vendors')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Add New Vendor</h1>
                        <p className="text-gray-600 mt-1">Create a new vendor profile</p>
                    </div>
                </div>

                <VendorForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                    submitText="Create Vendor"
                />
            </div>
        </Layout>
    );
}
