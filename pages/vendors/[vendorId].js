// pages/vendors/[vendorId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import WarehouseModal from '../../components/Vendors/WarehouseModal';
import { ArrowLeft, Edit, Trash2, Building2, Phone, Mail, MapPin, Globe, FileText, Warehouse, Plus } from 'lucide-react';
import { DetailSkeleton, ListSkeleton } from '../../components/Common/LoadingSkeleton';

export default function VendorDetail() {
    const router = useRouter();
    const { vendorId } = router.query;
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [warehousesLoading, setWarehousesLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchVendor = async () => {
            try {
                const response = await apiClient.getVendorById(vendorId);
                if (isMounted && response.success) {
                    setVendor(response.data);
                    // Set warehouses from vendor data
                    if (response.data.warehouses) {
                        setWarehouses(response.data.warehouses);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch vendor:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const loadWarehouses = async () => {
            try {
                const response = await apiClient.getVendorWarehouses(vendorId);
                if (isMounted && response.success) {
                    setWarehouses(response.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch warehouses:', error);
            }
        };

        if (vendorId) {
            fetchVendor();
            loadWarehouses();
        }

        return () => {
            isMounted = false;
        };
    }, [vendorId]);

    const fetchWarehouses = async () => {
        setWarehousesLoading(true);
        try {
            const response = await apiClient.getVendorWarehouses(vendorId);
            if (response.success) {
                setWarehouses(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        } finally {
            setWarehousesLoading(false);
        }
    };

    const handleDeleteWarehouse = async (warehouseId) => {
        if (!confirm('Are you sure you want to delete this warehouse?')) return;
        
        try {
            const response = await apiClient.deleteWarehouse(vendorId, warehouseId);
            if (response.success) {
                setWarehouses(warehouses.filter(w => w.id !== warehouseId));
            }
        } catch (error) {
            console.error('Failed to delete warehouse:', error);
            alert('Failed to delete warehouse');
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await apiClient.deleteVendor(vendorId);
            if (response.success) {
                router.push('/vendors');
            }
        } catch (error) {
            console.error('Failed to delete vendor:', error);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <DetailSkeleton />
            </Layout>
        );
    }

    if (!vendor) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Vendor not found</h2>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/vendors')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{vendor.vendorName}</h1>
                            <p className="text-gray-600 mt-1">Vendor Details</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.push(`/vendors/${vendorId}/edit`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>

                {/* Vendor Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Contact Person</p>
                                <p className="font-medium text-gray-900">{vendor.contactPerson}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium text-gray-900">{vendor.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{vendor.email}</p>
                            </div>
                        </div>
                        {vendor.website && (
                            <div className="flex items-start space-x-3">
                                <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Website</p>
                                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                                        {vendor.website}
                                    </a>
                                </div>
                            </div>
                        )}
                        {vendor.gstNumber && (
                            <div className="flex items-start space-x-3">
                                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">GST Number</p>
                                    <p className="font-medium text-gray-900">{vendor.gstNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Address */}
                {vendor.address && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-gray-900">{vendor.address.street}</p>
                                <p className="text-gray-900">{vendor.address.city}, {vendor.address.state} - {vendor.address.pincode}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warehouses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Warehouse className="w-5 h-5" />
                            <span>Warehouses</span>
                        </h3>
                        <button
                            onClick={() => setShowWarehouseModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Warehouse</span>
                        </button>
                    </div>

                    {warehousesLoading ? (
                        <ListSkeleton rows={3} />
                    ) : warehouses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Warehouse className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p>No warehouses added yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {warehouses.map((warehouse) => (
                                <div key={warehouse.id || warehouse.warehouseId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{warehouse.name || warehouse.warehouseName}</h4>
                                        {warehouse.address && (warehouse.address.city || warehouse.address.state) && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                {[warehouse.address.city, warehouse.address.state].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {warehouse.contactPerson && (
                                            <p className="text-sm text-gray-600">Contact: {warehouse.contactPerson}</p>
                                        )}
                                        {warehouse.phone && (
                                            <p className="text-sm text-gray-600">Phone: {warehouse.phone}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => {
                                                setEditingWarehouse(warehouse);
                                                setShowWarehouseModal(true);
                                            }}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                            title="Edit warehouse"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWarehouse(warehouse.id || warehouse.warehouseId)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete warehouse"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Warehouse Modal */}
                {showWarehouseModal && (
                    <WarehouseModal
                        vendorId={vendorId}
                        warehouse={editingWarehouse}
                        onClose={() => {
                            setShowWarehouseModal(false);
                            setEditingWarehouse(null);
                        }}
                        onSuccess={async (updatedWarehouse) => {
                            console.log('Warehouse updated:', updatedWarehouse);
                            // Refresh warehouses from API
                            await fetchWarehouses();
                            setShowWarehouseModal(false);
                            setEditingWarehouse(null);
                        }}
                    />
                )}

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Vendor</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to delete this vendor? This action cannot be undone.</p>
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
