// pages/appointments/[appointmentId]/edit.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import AppointmentForm from '../../../components/Appointments/AppointmentForm';
import apiClient from '../../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

function EditAppointment() {
    const router = useRouter();
    const { appointmentId } = router.query;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        shipmentId: '',
        lrDocketNumber: '',
        appointmentDate: '',
        timeSlot: '',
        location: '',
        notes: '',
        status: 'scheduled'
    });

    useEffect(() => {
        let isMounted = true;

        const fetchAppointment = async () => {
            try {
                const response = await apiClient.getAppointmentById(appointmentId);
                if (isMounted && response.success) {
                    const data = response.data;
                    // Map scheduledDate to appointmentDate for the form
                    setFormData({
                        ...data,
                        appointmentDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString().split('T')[0] : '',
                        timeSlot: data.scheduledTimeSlot || '',
                        location: data.deliveryLocation?.address || ''
                    });
                }
            } catch (err) {
                if (isMounted) setError('Failed to load appointment');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (appointmentId) fetchAppointment();

        return () => {
            isMounted = false;
        };
    }, [appointmentId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            // Map appointmentDate to scheduledDate for the API
            const updateData = {
                ...formData,
                scheduledDate: new Date(formData.appointmentDate).toISOString(),
                scheduledTimeSlot: formData.timeSlot,
                deliveryLocation: { address: formData.location }
            };
            // Remove form-specific fields
            delete updateData.appointmentDate;
            delete updateData.timeSlot;
            delete updateData.location;

            const response = await apiClient.updateAppointment(appointmentId, updateData);
            if (response.success) {
                router.push('/appointments');
            } else {
                setError(response.error?.message || 'Failed to update appointment');
            }
        } catch (err) {
            setError(err.message || 'Failed to update appointment');
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
                    <button onClick={() => router.push('/appointments')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Appointment</h1>
                        <p className="text-gray-600 mt-1">Update appointment details</p>
                    </div>
                </div>

                <AppointmentForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    loading={saving}
                    error={error}
                    submitText="Update Appointment"
                />
            </div>
        </Layout>
    );
}

export default EditAppointment;
