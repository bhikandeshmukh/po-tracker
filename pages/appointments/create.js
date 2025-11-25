// pages/appointments/create.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import AppointmentForm from '../../components/Appointments/AppointmentForm';
import apiClient from '../../lib/api-client';
import { ArrowLeft } from 'lucide-react';

export default function CreateAppointment() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Map appointmentDate to scheduledDate for the API
            const appointmentData = {
                ...formData,
                scheduledDate: new Date(formData.appointmentDate).toISOString(),
                scheduledTimeSlot: formData.timeSlot,
                deliveryLocation: { address: formData.location }
            };
            // Remove form-specific fields
            delete appointmentData.appointmentDate;
            delete appointmentData.timeSlot;
            delete appointmentData.location;

            const response = await apiClient.createAppointment(appointmentData);
            if (response.success) router.push('/appointments');
            else setError(response.error?.message || 'Failed to create appointment');
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
                    <button onClick={() => router.push('/appointments')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Schedule Appointment</h1>
                        <p className="text-gray-600 mt-1">Create a new delivery appointment</p>
                    </div>
                </div>
                <AppointmentForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} loading={loading} error={error} submitText="Schedule Appointment" />
            </div>
        </Layout>
    );
}
