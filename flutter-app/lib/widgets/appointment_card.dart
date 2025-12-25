import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';

class AppointmentCard extends StatelessWidget {
  final Appointment appointment;
  final VoidCallback onTap;
  final Function(bool) onEmailToggle;

  const AppointmentCard({
    super.key,
    required this.appointment,
    required this.onTap,
    required this.onEmailToggle,
  });

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed': return Colors.green;
      case 'cancelled': return Colors.red;
      default: return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      appointment.appointmentNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getStatusColor(appointment.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      appointment.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        color: _getStatusColor(appointment.status),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text('PO: ${appointment.poNumber}'),
              Text(
                '${appointment.vendorName} | ${appointment.scheduledTimeSlot}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              if (appointment.scheduledDate != null)
                Text(
                  'Scheduled: ${DateFormat('dd MMM yyyy').format(appointment.scheduledDate!)}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        appointment.emailSent ? Icons.email : Icons.email_outlined,
                        size: 16,
                        color: appointment.emailSent ? Colors.green : Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        appointment.emailSent ? 'Email Sent' : 'Email Not Sent',
                        style: TextStyle(
                          fontSize: 12,
                          color: appointment.emailSent ? Colors.green : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  Switch(
                    value: appointment.emailSent,
                    onChanged: onEmailToggle,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
