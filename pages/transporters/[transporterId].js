// pages/transporters/[transporterId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { ArrowLeft, Edit, Trash2, Truck, Phone, Mail, FileText } from 'lucide-react';

export default function TransporterDetail() {
    const router = useRouter();
    const { transporterId } = router.query;
    const [transporter, setTransporter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchTransporter = async () => {
            try {
                const response = await apiClient.getTransporterById(transporterId);
                if (isMounted && response.success) setTransporter(response.data);
            } catch (error) {
                console.error('Failed to fetch transporter:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (transporterId) fetchTransporter();

        return () => {
            isMounted = false;
        };
    }, [transporterId]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await apiClient.deleteTransporter(transporterId);
            if (response.success) router.push('/transporters');
        } catch (error) {
            console.error('Failed to delete transporter:', error);
        } finally {
            setDeleting(false);
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

    if (!transporter) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Transporter not found</h2>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/transporters')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{transporter.companyName}</h1>
                            <p className="text-gray-600 mt-1">Transporter Details</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={() => router.push(`/transporters/${transporterId}/edit`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                        <button onClick={() => setShowDeleteModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Contact Person</p>
                                <p className="font-medium text-gray-900">{transporter.contactPerson}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium text-gray-900">{transporter.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{transporter.email}</p>
                            </div>
                        </div>
                        {transporter.gstNumber && (
                            <div className="flex items-start space-x-3">
                                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">GST Number</p>
                                    <p className="font-medium text-gray-900">{transporter.gstNumber}</p>
                                </div>
                            </div>
                        )}
                        {transporter.vehicleType && (
                            <div className="flex items-start space-x-3">
                                <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Vehicle Type</p>
                                    <p className="font-medium text-gray-900 capitalize">{transporter.vehicleType}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Transporter</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to delete this transporter? This action cannot be undone.</p>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
