// pages/vendors/[vendorId]/edit.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import VendorForm from '../../../components/Vendors/VendorForm';
import apiClient from '../../../lib/api-client';
import { ArrowLeft } from 'lucide-react';
import { FormSkeleton } from '../../../components/Common/LoadingSkeleton';

function EditVendor() {
    const router = useRouter();
    const { vendorId } = router.query;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        vendorName: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        gstNumber: '',
        address: { street: '', city: '', state: '', pincode: '' },
        isActive: true
    });

    useEffect(() => {
        if (vendorId) fetchVendor();
    }, [vendorId]);

    const fetchVendor = async () => {
        try {
            const response = await apiClient.getVendorById(vendorId);
            if (response.success) {
                setFormData(response.data);
            }
        } catch (err) {
            setError('Failed to load vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const response = await apiClient.updateVendor(vendorId, formData);
            if (response.success) {
                router.push(`/vendors/${vendorId}`);
            } else {
                setError(response.error?.message || 'Failed to update vendor');
            }
        } catch (err) {
            setError(err.message || 'Failed to update vendor');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <FormSkeleton />
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push(`/vendors/${vendorId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Vendor</h1>
                        <p className="text-gray-600 mt-1">Update vendor information</p>
                    </div>
                </div>

                <VendorForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    loading={saving}
                    error={error}
                    submitText="Update Vendor"
                />
            </div>
        </Layout>
    );
}

export default EditVendor;
