// pages/returns/create.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import ReturnForm from '../../components/Returns/ReturnForm';
import apiClient from '../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

export default function CreateReturn() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        poId: '',
        returnDate: '',
        quantity: 1,
        reason: '',
        description: '',
        status: 'pending'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await apiClient.createReturn(formData);
            if (response.success) router.push('/returns');
            else setError(response.error?.message || 'Failed to create return');
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
                    <button onClick={() => router.push('/returns')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Return</h1>
                        <p className="text-gray-600 mt-1">Initiate a product return</p>
                    </div>
                </div>
                <ReturnForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} loading={loading} error={error} submitText="Create Return" />
            </div>
        </Layout>
    );
}
