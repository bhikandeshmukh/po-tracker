package com.potracker.app.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.potracker.app.databinding.ItemAppointmentBinding
import com.potracker.app.models.Appointment
import com.potracker.app.utils.DateUtils

class AppointmentAdapter(
    private val onClick: (Appointment) -> Unit,
    private val onEmailToggle: (Appointment, Boolean) -> Unit
) : ListAdapter<Appointment, AppointmentAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAppointmentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemAppointmentBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(appointment: Appointment) {
            binding.tvAppointmentNumber.text = appointment.appointmentNumber.ifEmpty { appointment.appointmentId }
            binding.tvPoNumber.text = "PO: ${appointment.poNumber}"
            binding.tvStatus.text = appointment.status.replace("_", " ").uppercase()
            binding.tvDate.text = DateUtils.formatDate(appointment.scheduledDate)
            binding.tvWarehouse.text = appointment.warehouseName
            binding.tvQty.text = "Qty: ${appointment.totalQuantity}"
            
            // Email sent checkbox
            binding.cbEmailSent.setOnCheckedChangeListener(null)
            binding.cbEmailSent.isChecked = appointment.emailSent
            binding.cbEmailSent.setOnCheckedChangeListener { _, isChecked ->
                onEmailToggle(appointment, isChecked)
            }
            
            val statusColor = when (appointment.status) {
                "delivered" -> android.graphics.Color.parseColor("#10B981")
                "in_transit" -> android.graphics.Color.parseColor("#3B82F6")
                "cancelled" -> android.graphics.Color.parseColor("#EF4444")
                else -> android.graphics.Color.parseColor("#F59E0B")
            }
            binding.tvStatus.setTextColor(statusColor)
            
            binding.root.setOnClickListener { onClick(appointment) }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<Appointment>() {
        override fun areItemsTheSame(oldItem: Appointment, newItem: Appointment) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Appointment, newItem: Appointment) = oldItem == newItem
    }
}
