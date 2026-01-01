// pages/vendors/index.js
// Vendors List Page

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import ExcelImportWithAPI from '../../components/Common/ExcelImportWithAPI';
import { Building2, Plus, Search, Eye, Edit, Star, MapPin, Phone, Mail } from 'lucide-react';
import { ListSkeleton } from '../../components/Common/LoadingSkeleton';

export default function Vendors() {
    const router = useRouter();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchVendors = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.getVendors({ limit: 50, _t: Date.now() });
            if (response.success) {
                setVendors(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            setVendors([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);



    const handleBulkImport = async (data) => {
        try {
            const results = [];
            for (const row of data) {
                try {
                    const vendorData = {
                        vendorName: row.vendorName,
                        contactPerson: row.contactPerson,
                        email: row.email,
                        phone: row.phone,
                        website: row.website || '',
                        gstNumber: row.gstNumber || '',
                        address: {
                            street: row.street,
                            city: row.city,
                            state: row.state,
                            pincode: row.pincode
                        },
                        isActive: true
                    };
                    const response = await apiClient.createVendor(vendorData);
                    results.push({ success: response.success, row });
                } catch (err) {
                    results.push({ success: false, row, error: err.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            await fetchVendors(); // Refresh list

            return {
                success: true,
                message: `Imported ${successCount} out of ${data.length} vendors`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    };

    const filteredVendors = vendors.filter(vendor =>
        vendor.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between sticky top-16 bg-gray-50 z-10 py-4 -mt-6 -mx-6 px-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
                        <p className="text-gray-600 mt-1">Manage your vendor relationships</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ExcelImportWithAPI
                            onImport={handleBulkImport}
                            moduleName="Vendors"
                            fetchTemplateData={async () => {
                                const response = await apiClient.getVendors({ limit: 5 });
                                return response.success ? response.data : [];
                            }}
                            templateFields={[
                                'vendorName',
                                'contactPerson',
                                'email',
                                'phone',
                                'website',
                                'gstNumber',
                                'address.street',
                                'address.city',
                                'address.state',
                                'address.pincode'
                            ]}
                        />
                        <button
                            onClick={() => router.push('/vendors/create')}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Vendor</span>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search vendors..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Vendors Grid */}
                {loading ? (
                    <ListSkeleton rows={6} />
                ) : filteredVendors.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
                        <p className="text-gray-500 mb-6">Add your first vendor to get started</p>
                        <button
                            onClick={() => router.push('/vendors/create')}
                            className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Vendor</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVendors.map((vendor) => (
                            <div
                                key={vendor.vendorId}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                                onClick={() => router.push(`/vendors/${vendor.vendorId}`)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {vendor.rating || '0.0'}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {vendor.vendorName}
                                </h3>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{vendor.phone}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{vendor.email}</span>
                                    </div>
                                    {vendor.address && (
                                        <div className="flex items-start space-x-2">
                                            <MapPin className="w-4 h-4 mt-0.5" />
                                            <span className="line-clamp-2">
                                                {vendor.address.city}, {vendor.address.state}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">
                                        {vendor.totalOrders || 0} orders
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${vendor.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {vendor.isActive ? 'Active' : 'Inactive'}
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
