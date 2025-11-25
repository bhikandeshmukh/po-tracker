// pages/appointments/[appointmentId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { ArrowLeft, Calendar, MapPin, Truck, Package, Edit, CheckCircle, XCircle } from 'lucide-react';

export default function AppointmentDetail() {
    const router = useRouter();
    const { appointmentId } = router.query;
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchAppointment = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getAppointmentById(appointmentId);
            if (response.success) {
                setAppointment(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch appointment:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (appointmentId) fetchAppointment();
    }, [appointmentId]);

    const handleStatusUpdate = async (newStatus) => {
        if (!confirm(`Update appointment status to ${newStatus}?`)) return;
        
        setUpdating(true);
        try {
            let response;
            if (newStatus === 'completed') {
                response = await apiClient.completeAppointment(appointmentId, {});
            } else if (newStatus === 'cancelled') {
                response = await apiClient.cancelAppointment(appointmentId, { reason: 'Cancelled by user' });
            }
            
            if (response?.success) {
                await fetchAppointment();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setUpdating(false);
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

    if (!appointment) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Appointment not found</h2>
                </div>
            </Layout>
        );
    }

    const statusColors = {
        scheduled: 'bg-blue-100 text-blue-800',
        confirmed: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800',
        cancelled: 'bg-red-100 text-red-800'
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/appointments')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{appointment.appointmentNumber}</h1>
                            <p className="text-gray-600 mt-1">Appointment Details</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[appointment.status]}`}>
                            {appointment.status}
                        </span>
                        <button
                            onClick={() => router.push(`/appointments/${appointmentId}/edit`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                    </div>
                </div>

                {/* Appointment Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Scheduled Date</p>
                                <p className="font-medium">{new Date(appointment.scheduledDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Time Slot</p>
                                <p className="font-medium">{appointment.scheduledTimeSlot || 'Not specified'}</p>
                            </div>
                        </div>
                        {appointment.totalQuantity && (
                            <div className="flex items-start space-x-3">
                                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Total Quantity</p>
                                    <p className="font-medium text-indigo-600">{appointment.totalQuantity} units</p>
                                </div>
                            </div>
                        )}
                        {appointment.totalItems && (
                            <div className="flex items-start space-x-3">
                                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Total Items</p>
                                    <p className="font-medium">{appointment.totalItems} items</p>
                                </div>
                            </div>
                        )}
                        {appointment.lrDocketNumber && (
                            <div className="flex items-start space-x-3">
                                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">LR Docket Number</p>
                                    <p className="font-medium">{appointment.lrDocketNumber}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Shipment</p>
                                <button
                                    onClick={() => router.push(`/shipments/${appointment.shipmentId}`)}
                                    className="font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    {appointment.shipmentNumber} →
                                </button>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Purchase Order</p>
                                <button
                                    onClick={() => router.push(`/purchase-orders/${appointment.poId}`)}
                                    className="font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    {appointment.poNumber} →
                                </button>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Transporter</p>
                                <p className="font-medium">{appointment.transporterName || appointment.transporterId}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Vendor</p>
                                <p className="font-medium">{appointment.vendorName || appointment.vendorId}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Location */}
                {appointment.deliveryLocation && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Location</h3>
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-gray-700">
                                    {appointment.deliveryLocation.address || 'Address not specified'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Actions */}
                {appointment.status === 'scheduled' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => handleStatusUpdate('completed')}
                                disabled={updating}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>Mark as Completed</span>
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={updating}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                <span>Cancel Appointment</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
