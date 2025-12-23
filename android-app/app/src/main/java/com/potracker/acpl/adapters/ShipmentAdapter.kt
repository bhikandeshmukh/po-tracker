package com.potracker.acpl.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.potracker.acpl.databinding.ItemShipmentBinding
import com.potracker.acpl.models.Shipment
import com.potracker.acpl.utils.DateUtils

class ShipmentAdapter(private val onClick: (Shipment) -> Unit) : 
    ListAdapter<Shipment, ShipmentAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemShipmentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemShipmentBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(shipment: Shipment) {
            binding.tvShipmentNumber.text = shipment.shipmentNumber.ifEmpty { shipment.shipmentId }
            binding.tvPoNumber.text = "PO: ${shipment.poNumber}"
            binding.tvStatus.text = shipment.status.replace("_", " ").uppercase()
            binding.tvDate.text = DateUtils.formatDate(shipment.shipmentDate)
            binding.tvTransporter.text = shipment.transporterName
            binding.tvQty.text = "Qty: ${shipment.totalQuantity}"
            
            val statusColor = when (shipment.status) {
                "delivered" -> android.graphics.Color.parseColor("#10B981")
                "in_transit" -> android.graphics.Color.parseColor("#3B82F6")
                "cancelled" -> android.graphics.Color.parseColor("#EF4444")
                else -> android.graphics.Color.parseColor("#F59E0B")
            }
            binding.tvStatus.setTextColor(statusColor)
            
            binding.root.setOnClickListener { onClick(shipment) }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<Shipment>() {
        override fun areItemsTheSame(oldItem: Shipment, newItem: Shipment) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Shipment, newItem: Shipment) = oldItem == newItem
    }
}
