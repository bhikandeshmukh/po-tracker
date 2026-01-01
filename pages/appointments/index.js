// pages/appointments/index.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import ExcelImport from '../../components/Common/ExcelImport';
import { Calendar, Clock, Package, Plus, MapPin, Building2, FileDown, Mail } from 'lucide-react';
import { formatDate, formatTime12Hour } from '../../lib/date-utils';
import { ListSkeleton } from '../../components/Common/LoadingSkeleton';

const statusColors = {
    created: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    // Legacy status support
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    rescheduled: 'bg-orange-100 text-orange-800',
};

const AppointmentCard = ({ appointment, router, isCompleted, onDownloadPDF, onSendEmail, onToggleEmailSent }) => (
    <div className={`p-5 hover:bg-gray-50 transition ${isCompleted ? 'opacity-75' : ''}`}>
        <div className="flex items-center space-x-3">
            <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer ${isCompleted
                    ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                    }`}
                onClick={() => router.push(`/appointments/${appointment.appointmentId}`)}
            >
                <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0" style={{ cursor: 'default' }}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <h3
                            className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => router.push(`/appointments/${appointment.appointmentId}`)}
                        >
                            {appointment.appointmentNumber}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[appointment.status]}`}>
                            {appointment.status.replace('_', ' ').toUpperCase()}
                            {appointment.status === 'delivered' && appointment.deliveredQuantity && (
                                <span className="ml-1 opacity-75">
                                    (Qty: {appointment.deliveredQuantity})
                                </span>
                            )}
                        </span>
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="font-medium">PO: {appointment.poNumber}</span>
                    {appointment.vendorName && (
                        <span className="flex items-center">
                            <Building2 className="w-3 h-3 mr-1" />{appointment.vendorName}
                        </span>
                    )}
                    {(appointment.vendorWarehouseName || appointment.vendorWarehouseId) && (
                        <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />{appointment.vendorWarehouseName || appointment.vendorWarehouseId}
                        </span>
                    )}
                    {appointment.lrDocketNumber && (
                        <span className="font-medium">LR: {appointment.lrDocketNumber}</span>
                    )}
                    {appointment.totalQuantity && (
                        <span className="flex items-center font-medium text-indigo-600">
                            <Package className="w-3 h-3 mr-1" />
                            Qty: {appointment.totalQuantity}
                        </span>
                    )}
                    <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {appointment.scheduledDate
                            ? new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })
                            : 'Not set'
                        }
                    </span>
                    <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {appointment.scheduledTimeSlot ? formatTime12Hour(appointment.scheduledTimeSlot) : '09:00 AM - 12:00 PM'}
                    </span>
                    {appointment.shipmentId && (
                        <span className="flex items-center text-gray-500">
                            <Package className="w-3 h-3 mr-1" />
                            Shipment: {appointment.shipmentId}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-2 ml-3">
                {/* Email Sent Checkbox */}
                <label
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition ${appointment.emailSent
                        ? 'bg-green-50 border border-green-300'
                        : 'bg-gray-50 border border-gray-300'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={appointment.emailSent || false}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleEmailSent(appointment, e.target.checked);
                        }}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className={`text-sm font-medium ${appointment.emailSent ? 'text-green-700' : 'text-gray-600'}`}>
                        {appointment.emailSent ? 'Sent' : 'Not Sent'}
                    </span>
                </label>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownloadPDF(appointment);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm"
                    title="Download PDF"
                >
                    <FileDown className="w-4 h-4" />
                    <span>PDF</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSendEmail(appointment);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition text-sm"
                    title="Send Email to Transporter"
                >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                </button>
            </div>
        </div>
    </div>
);

export default function Appointments() {
    const router = useRouter();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailContent, setEmailContent] = useState({ subject: '', body: '', htmlBody: '' });
    const [emailViewMode, setEmailViewMode] = useState('preview'); // 'preview', 'plain', 'html'
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'completed'

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.getAppointments({ limit: 50, _t: Date.now() });
            if (response.success) {
                const appointments = response.data;

                // Auto-fix: Add quantity and warehouse to appointments
                const fixPromises = appointments.map(async (appointment) => {
                    let needsUpdate = false;
                    const updateData = {};

                    // Fetch PO to get warehouse info
                    if (appointment.poId && !appointment.vendorWarehouseName) {
                        try {
                            const poResponse = await apiClient.getPOById(appointment.poId);
                            if (poResponse.success) {
                                if (poResponse.data.vendorWarehouseName) {
                                    appointment.vendorWarehouseName = poResponse.data.vendorWarehouseName;
                                    updateData.vendorWarehouseName = poResponse.data.vendorWarehouseName;
                                    needsUpdate = true;
                                }
                                if (poResponse.data.vendorWarehouseId) {
                                    appointment.vendorWarehouseId = poResponse.data.vendorWarehouseId;
                                    updateData.vendorWarehouseId = poResponse.data.vendorWarehouseId;
                                    needsUpdate = true;
                                }
                            }
                        } catch (err) {
                            console.error(`Failed to fetch PO for ${appointment.appointmentId}:`, err);
                        }
                    }

                    // Fetch shipment to get quantity if missing
                    if (!appointment.totalQuantity && appointment.shipmentId) {
                        try {
                            const shipmentResponse = await apiClient.getShipmentById(appointment.shipmentId);
                            if (shipmentResponse.success && shipmentResponse.data.totalQuantity) {
                                appointment.totalQuantity = shipmentResponse.data.totalQuantity;
                                appointment.totalItems = shipmentResponse.data.totalItems || 0;
                                updateData.totalQuantity = shipmentResponse.data.totalQuantity;
                                updateData.totalItems = shipmentResponse.data.totalItems || 0;

                                // Also sync deliveredQuantity if available
                                if (shipmentResponse.data.deliveredQuantity) {
                                    appointment.deliveredQuantity = shipmentResponse.data.deliveredQuantity;
                                    updateData.deliveredQuantity = shipmentResponse.data.deliveredQuantity;
                                }

                                needsUpdate = true;
                            }
                        } catch (err) {
                            console.error(`Failed to fetch shipment for ${appointment.appointmentId}:`, err);
                        }
                    }

                    // Update appointment if needed
                    if (needsUpdate && Object.keys(updateData).length > 0) {
                        try {
                            await apiClient.updateAppointment(appointment.appointmentId, updateData);
                            console.log(`Auto-fixed appointment ${appointment.appointmentId}`);
                        } catch (err) {
                            console.error(`Failed to update ${appointment.appointmentId}:`, err);
                        }
                    }

                    return appointment;
                });

                // Wait for all fixes to complete
                const fixedAppointments = await Promise.all(fixPromises);
                setAppointments(fixedAppointments);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);



    const handleDownloadPDF = async (appointment) => {
        console.log('Downloading PDF for:', appointment.appointmentNumber);

        try {
            // Dynamically import jsPDF
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            const pageWidth = doc.internal.pageSize.getWidth();

            // Header with gradient effect (using rectangles)
            doc.setFillColor(102, 126, 234); // Indigo color
            doc.rect(0, 0, pageWidth, 35, 'F');

            // Title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.text('📦 Delivery Appointment', 20, 22);

            // Reset text color
            doc.setTextColor(0, 0, 0);

            let y = 50;

            // Greeting
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text('Dear Sir/Madam,', 20, y);
            y += 10;
            doc.text('Kindly arrange the delivery appointment as per the details below:', 20, y);
            y += 15;

            // Details box background
            doc.setFillColor(248, 250, 252); // Light gray background
            doc.rect(15, y - 5, pageWidth - 30, 80, 'F');

            // Blue left border
            doc.setFillColor(102, 126, 234);
            doc.rect(15, y - 5, 3, 80, 'F');

            y += 5;

            // Section title
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text('APPOINTMENT DETAILS', 25, y);
            y += 12;

            // Details with bold labels
            doc.setFontSize(11);
            const scheduledDate = appointment.scheduledDate
                ? new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                })
                : '______';
            const timeSlot = appointment.scheduledTimeSlot ? formatTime12Hour(appointment.scheduledTimeSlot) : '______';
            const dateTime = `${scheduledDate} | ${timeSlot}`;

            const details = [
                { label: 'LR Docket No', value: appointment.lrDocketNumber || '______' },
                { label: 'Appointment ID', value: appointment.appointmentNumber || '______' },
                { label: 'Date & Time', value: dateTime },
                { label: 'Warehouse', value: appointment.deliveryLocation?.address || appointment.vendorName || '______' },
                { label: 'Status', value: appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ') : '______' }
            ];

            details.forEach((detail, index) => {
                doc.setFont(undefined, 'bold');
                doc.text(`${detail.label}:`, 25, y);
                doc.setFont(undefined, 'normal');
                doc.text(detail.value, 70, y);
                y += 10;
            });

            y += 10;

            // Thank you message
            doc.setFont(undefined, 'bold');
            doc.text('Thank You', 20, y);

            // Footer
            y = doc.internal.pageSize.getHeight() - 20;
            doc.setFillColor(243, 244, 246);
            doc.rect(0, y - 10, pageWidth, 30, 'F');
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(107, 114, 128);
            doc.text('PO Tracker System - Automated Delivery Appointment', pageWidth / 2, y, { align: 'center' });

            // Save the PDF
            doc.save(`Appointment-${appointment.appointmentNumber}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleSendEmail = (appointment) => {
        console.log('Sending email for:', appointment.appointmentNumber);

        const scheduledDate = appointment.scheduledDate
            ? new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
            : '______';
        const timeSlot = appointment.scheduledTimeSlot ? formatTime12Hour(appointment.scheduledTimeSlot) : '______';
        const dateTime = `${scheduledDate} | ${timeSlot}`;

        // Generate email content for transporter
        const vendorName = appointment.vendorName || 'Vendor';
        const subject = `Delivery Appointment – ${vendorName} | LR Docket No: ${appointment.lrDocketNumber || '______'} | Date & Time: ${dateTime}`;

        // Simple HTML Email - exactly matching the screenshot format
        const htmlBody = `<p>Dear Sir/Madam,</p>
<p>Kindly arrange the delivery appointment as per the details below:</p>
<br/>
<p><strong>LR Docket No</strong>: ${appointment.lrDocketNumber || '______'}</p>
<p><strong>Appointment ID</strong>: ${appointment.appointmentNumber || '______'}</p>
<p><strong>Date &amp; Time</strong>: ${dateTime}</p>
<p><strong>Warehouse</strong>: ${appointment.deliveryLocation?.address || appointment.vendorName || '______'}</p>
<p><strong>Status</strong>: ${appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ') : '______'}</p>
<br/>
<p>Thank You</p>`;

        // Plain text version
        const plainBody = `Dear Sir/Madam,

Kindly arrange the delivery appointment as per the details below:

LR Docket No       : ${appointment.lrDocketNumber || '______'}
Appointment ID     : ${appointment.appointmentNumber || '______'}
Date & Time        : ${dateTime}
Warehouse          : ${appointment.deliveryLocation?.address || appointment.vendorName || '______'}
Status             : ${appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ') : '______'}

Thank You`;

        setEmailContent({ subject, body: plainBody, htmlBody });
        setShowEmailModal(true);
    };

    const handleToggleEmailSent = async (appointment, checked) => {
        try {
            // Update local state immediately for better UX
            setAppointments(prev => prev.map(a =>
                a.appointmentId === appointment.appointmentId
                    ? { ...a, emailSent: checked }
                    : a
            ));

            // Update in database
            await apiClient.updateAppointment(appointment.appointmentId, {
                emailSent: checked,
                emailSentAt: checked ? new Date().toISOString() : null
            });

            console.log(`Email sent status updated for ${appointment.appointmentId}: ${checked}`);
        } catch (error) {
            console.error('Failed to update email sent status:', error);
            // Revert on error
            setAppointments(prev => prev.map(a =>
                a.appointmentId === appointment.appointmentId
                    ? { ...a, emailSent: !checked }
                    : a
            ));
        }
    };

    const handleBulkImport = async (data) => {
        try {
            const results = [];
            for (const row of data) {
                try {
                    const response = await apiClient.createAppointment({
                        shipmentId: row.shipmentId,
                        appointmentDate: row.appointmentDate,
                        timeSlot: row.timeSlot,
                        location: row.location,
                        notes: row.notes || '',
                        status: row.status || 'scheduled'
                    });
                    results.push({ success: response.success });
                } catch (err) {
                    results.push({ success: false });
                }
            }
            const successCount = results.filter(r => r.success).length;
            await fetchAppointments();
            return { success: true, message: `Imported ${successCount} out of ${data.length} appointments` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Delivery Appointments</h1>
                        <p className="text-gray-600 mt-1">Schedule and manage delivery appointments</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ExcelImport
                            onImport={handleBulkImport}
                            moduleName="Appointments"
                            templateColumns={{
                                shipmentId: 'ship123',
                                appointmentDate: '2025-01-25',
                                timeSlot: '10:00',
                                location: 'Warehouse A',
                                notes: 'Urgent delivery',
                                status: 'scheduled'
                            }}
                            sampleData={[{
                                shipmentId: 'ship123',
                                appointmentDate: '2025-01-25',
                                timeSlot: '10:00',
                                location: 'Warehouse A',
                                notes: 'Urgent delivery',
                                status: 'scheduled'
                            }]}
                        />
                        <button
                            onClick={() => router.push('/appointments/create')}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Schedule Appointment</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <ListSkeleton rows={6} />
                ) : appointments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
                        <p className="text-gray-500">Appointments will appear here once shipments are created</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2">
                            {(() => {
                                const upcomingCount = appointments.filter(a => ['created', 'pending', 'in_transit', 'scheduled', 'confirmed', 'in_progress', 'rescheduled'].includes(a.status)).length;
                                const completedCount = appointments.filter(a => ['delivered', 'completed', 'cancelled'].includes(a.status)).length;

                                return (
                                    <>
                                        <button
                                            onClick={() => setActiveTab('upcoming')}
                                            className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'upcoming'
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <Clock className="w-4 h-4" />
                                            <span>Upcoming & In Transit</span>
                                            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {upcomingCount}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('completed')}
                                            className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'completed'
                                                ? 'border-green-600 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <Package className="w-4 h-4" />
                                            <span>Completed</span>
                                            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${activeTab === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {completedCount}
                                            </span>
                                        </button>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Upcoming & In Transit Section */}
                        {activeTab === 'upcoming' && (() => {
                            const upcomingAppointments = appointments
                                .filter(a => ['created', 'pending', 'in_transit', 'scheduled', 'confirmed', 'in_progress', 'rescheduled'].includes(a.status))
                                .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                            if (upcomingAppointments.length === 0) {
                                return (
                                    <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 p-8 text-center text-gray-500">
                                        No upcoming appointments
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200">
                                    <div className="divide-y divide-gray-200">
                                        {upcomingAppointments.map((appointment) => (
                                            <AppointmentCard
                                                key={appointment.appointmentId}
                                                appointment={appointment}
                                                router={router}
                                                isCompleted={false}
                                                onDownloadPDF={handleDownloadPDF}
                                                onSendEmail={handleSendEmail}
                                                onToggleEmailSent={handleToggleEmailSent}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Completed Section */}
                        {activeTab === 'completed' && (() => {
                            const completedAppointments = appointments
                                .filter(a => ['delivered', 'completed', 'cancelled'].includes(a.status))
                                .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

                            if (completedAppointments.length === 0) {
                                return (
                                    <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 p-8 text-center text-gray-500">
                                        No completed appointments
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200">
                                    <div className="divide-y divide-gray-200">
                                        {completedAppointments.map((appointment) => (
                                            <AppointmentCard
                                                key={appointment.appointmentId}
                                                appointment={appointment}
                                                router={router}
                                                isCompleted={true}
                                                onDownloadPDF={handleDownloadPDF}
                                                onSendEmail={handleSendEmail}
                                                onToggleEmailSent={handleToggleEmailSent}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Email Modal */}
            {
                showEmailModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">Email to Transporter</h3>
                                    <button
                                        onClick={() => setShowEmailModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={emailContent.subject}
                                            readOnly
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                        />
                                    </div>

                                    {/* View Mode Tabs */}
                                    <div className="flex space-x-2 border-b border-gray-200">
                                        <button
                                            onClick={() => setEmailViewMode('preview')}
                                            className={`px-4 py-2 font-medium text-sm ${emailViewMode === 'preview' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                                        >
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => setEmailViewMode('plain')}
                                            className={`px-4 py-2 font-medium text-sm ${emailViewMode === 'plain' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                                        >
                                            Plain Text
                                        </button>
                                        <button
                                            onClick={() => setEmailViewMode('html')}
                                            className={`px-4 py-2 font-medium text-sm ${emailViewMode === 'html' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                                        >
                                            HTML Code
                                        </button>
                                    </div>

                                    <div>
                                        {emailViewMode === 'preview' && (
                                            <div
                                                className="border border-gray-300 rounded-lg p-4 bg-white"
                                                dangerouslySetInnerHTML={{ __html: emailContent.htmlBody }}
                                            />
                                        )}
                                        {emailViewMode === 'plain' && (
                                            <textarea
                                                value={emailContent.body}
                                                readOnly
                                                rows={15}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                                            />
                                        )}
                                        {emailViewMode === 'html' && (
                                            <textarea
                                                value={emailContent.htmlBody}
                                                readOnly
                                                rows={15}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs"
                                            />
                                        )}
                                    </div>

                                    <div className="flex flex-col space-y-3">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Copy HTML to clipboard for pasting
                                                    const htmlBlob = new Blob([emailContent.htmlBody], { type: 'text/html' });
                                                    const textBlob = new Blob([emailContent.body], { type: 'text/plain' });

                                                    const clipboardItem = new ClipboardItem({
                                                        'text/html': htmlBlob,
                                                        'text/plain': textBlob
                                                    });

                                                    await navigator.clipboard.write([clipboardItem]);

                                                    // Open Gmail compose with subject and body
                                                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
                                                    window.open(gmailUrl, '_blank');

                                                    setTimeout(() => {
                                                        alert('✅ Gmail opened!\n\n📧 Subject & body pre-filled\n📋 Formatted HTML also copied\n\n💡 Tip: Delete plain text and paste (Ctrl+V) for bold formatting!');
                                                    }, 1000);
                                                } catch (err) {
                                                    console.error('Failed to copy HTML:', err);
                                                    // Fallback - open Gmail with body
                                                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
                                                    window.open(gmailUrl, '_blank');
                                                    alert('📧 Gmail opened with email content!');
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium shadow-lg"
                                        >
                                            📧 Open Gmail Compose
                                        </button>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Copy HTML for formatted paste
                                                    const htmlBlob = new Blob([emailContent.htmlBody], { type: 'text/html' });
                                                    const textBlob = new Blob([emailContent.body], { type: 'text/plain' });

                                                    const clipboardItem = new ClipboardItem({
                                                        'text/html': htmlBlob,
                                                        'text/plain': textBlob
                                                    });

                                                    await navigator.clipboard.write([clipboardItem]);
                                                    alert('✓ Formatted email copied!\n\nPaste in Gmail for bold labels.');
                                                } catch (err) {
                                                    // Fallback to plain text
                                                    await navigator.clipboard.writeText(emailContent.body);
                                                    alert('✓ Plain text copied to clipboard!');
                                                }
                                            }}
                                            className="w-full px-4 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
                                        >
                                            📋 Copy Formatted Email
                                        </button>

                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-lg p-4">
                                            <p className="text-sm text-indigo-900 font-medium mb-2">
                                                ✨ Best Method:
                                            </p>
                                            <ol className="text-xs text-indigo-800 space-y-1 ml-4 list-decimal">
                                                <li>Click "Open Gmail Compose"</li>
                                                <li>Gmail opens with subject & body</li>
                                                <li>For bold labels: Select all (Ctrl+A) → Delete</li>
                                                <li>Paste (Ctrl+V) - Bold formatting applied!</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </Layout >
    );
}
