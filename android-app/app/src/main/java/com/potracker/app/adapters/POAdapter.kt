package com.potracker.app.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.potracker.app.databinding.ItemPoBinding
import com.potracker.app.models.PurchaseOrder
import com.potracker.app.utils.DateUtils

class POAdapter(private val onClick: (PurchaseOrder) -> Unit) : 
    ListAdapter<PurchaseOrder, POAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemPoBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemPoBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(po: PurchaseOrder) {
            binding.tvPoNumber.text = po.poNumber
            binding.tvVendor.text = po.vendorName.ifEmpty { po.vendorId }
            binding.tvStatus.text = po.status.uppercase()
            binding.tvDate.text = DateUtils.formatDate(po.poDate)
            binding.tvQty.text = "Qty: ${po.totalQuantity} | Sent: ${po.shippedQuantity}"
            
            val statusColor = when (po.status) {
                "approved" -> android.graphics.Color.parseColor("#10B981")
                "cancelled" -> android.graphics.Color.parseColor("#EF4444")
                "draft" -> android.graphics.Color.parseColor("#6B7280")
                else -> android.graphics.Color.parseColor("#F59E0B")
            }
            binding.tvStatus.setTextColor(statusColor)
            
            binding.root.setOnClickListener { onClick(po) }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<PurchaseOrder>() {
        override fun areItemsTheSame(oldItem: PurchaseOrder, newItem: PurchaseOrder) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: PurchaseOrder, newItem: PurchaseOrder) = oldItem == newItem
    }
}
