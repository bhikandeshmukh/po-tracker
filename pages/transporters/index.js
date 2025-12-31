// pages/transporters/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import ExcelImport from '../../components/Common/ExcelImport';
import { Users, Plus, Search, Truck, Phone, Mail, MapPin } from 'lucide-react';
import { ListSkeleton } from '../../components/Common/LoadingSkeleton';

export default function Transporters() {
    const router = useRouter();
    const [transporters, setTransporters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransporters();
    }, []);

    const fetchTransporters = async () => {
        try {
            const response = await apiClient.getTransporters({ limit: 50 });
            if (response.success) setTransporters(response.data);
        } catch (error) {
            console.error('Failed to fetch transporters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkImport = async (data) => {
        try {
            const results = [];
            for (const row of data) {
                try {
                    const response = await apiClient.createTransporter({
                        companyName: row.companyName,
                        contactPerson: row.contactPerson,
                        email: row.email,
                        phone: row.phone,
                        gstNumber: row.gstNumber || '',
                        vehicleType: row.vehicleType || '',
                        isActive: true
                    });
                    results.push({ success: response.success });
                } catch (err) {
                    results.push({ success: false });
                }
            }
            const successCount = results.filter(r => r.success).length;
            await fetchTransporters();
            return { success: true, message: `Imported ${successCount} out of ${data.length} transporters` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Transporters</h1>
                        <p className="text-gray-600 mt-1">Manage shipping and logistics partners</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ExcelImport
                            onImport={handleBulkImport}
                            moduleName="Transporters"
                            templateColumns={{
                                companyName: 'ABC Transport',
                                contactPerson: 'John Doe',
                                email: 'john@transport.com',
                                phone: '+919876543210',
                                gstNumber: '29ABCDE1234F1Z5',
                                vehicleType: 'truck'
                            }}
                            sampleData={[
                                {
                                    companyName: 'ABC Transport',
                                    contactPerson: 'John Doe',
                                    email: 'john@transport.com',
                                    phone: '+919876543210',
                                    gstNumber: '29ABCDE1234F1Z5',
                                    vehicleType: 'truck'
                                }
                            ]}
                        />
                        <button
                            onClick={() => router.push('/transporters/create')}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Transporter</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <ListSkeleton rows={6} />
                ) : transporters.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No transporters found</h3>
                        <p className="text-gray-500">Add transporters to manage shipments</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {transporters.map((transporter) => (
                            <div
                                key={transporter.transporterId}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                                onClick={() => router.push(`/transporters/${transporter.transporterId}`)}
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
                                    <Truck className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    {transporter.transporterName}
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{transporter.phone}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{transporter.email}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        transporter.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {transporter.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
