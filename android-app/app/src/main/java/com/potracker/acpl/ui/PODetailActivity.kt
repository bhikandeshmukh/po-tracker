package com.potracker.acpl.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.potracker.acpl.adapters.CommentAdapter
import com.potracker.acpl.adapters.ShipmentAdapter
import com.potracker.acpl.databinding.ActivityPoDetailBinding
import com.potracker.acpl.models.Comment
import com.potracker.acpl.models.PurchaseOrder
import com.potracker.acpl.models.Shipment
import com.potracker.acpl.repository.FirebaseRepository
import com.potracker.acpl.utils.DateUtils
import kotlinx.coroutines.launch

class PODetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPoDetailBinding
    private val repository = FirebaseRepository()
    private var poId: String = ""
    private var po: PurchaseOrder? = null
    
    private lateinit var shipmentAdapter: ShipmentAdapter
    private lateinit var commentAdapter: CommentAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPoDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        poId = intent.getStringExtra("poId") ?: run {
            finish()
            return
        }
        
        setupToolbar()
        setupAdapters()
        setupListeners()
        loadData()
    }
    
    private fun setupToolbar() {
        binding.btnBack.setOnClickListener { finish() }
    }
    
    private fun setupAdapters() {
        shipmentAdapter = ShipmentAdapter { shipment ->
            startActivity(Intent(this, ShipmentDetailActivity::class.java).apply {
                putExtra("shipmentId", shipment.id)
            })
        }
        binding.rvShipments.layoutManager = LinearLayoutManager(this)
        binding.rvShipments.adapter = shipmentAdapter
        
        commentAdapter = CommentAdapter()
        binding.rvComments.layoutManager = LinearLayoutManager(this)
        binding.rvComments.adapter = commentAdapter
    }
    
    private fun setupListeners() {
        binding.btnApprove.setOnClickListener { updateStatus("approved") }
        binding.btnCancel.setOnClickListener { showCancelDialog() }
        
        binding.btnAddComment.setOnClickListener {
            val text = binding.etComment.text.toString().trim()
            if (text.isNotEmpty()) {
                addComment(text)
            }
        }
    }
    
    private fun loadData() {
        binding.progressBar.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            try {
                po = repository.getPOById(poId)
                po?.let { displayPO(it) }
                
                val shipments = repository.getShipmentsByPO(poId)
                shipmentAdapter.submitList(shipments)
                binding.tvShipmentsCount.text = "(${shipments.size})"
                
                val comments = repository.getComments(poId)
                commentAdapter.submitList(comments)
                binding.tvCommentsCount.text = "(${comments.size})"
                
            } catch (e: Exception) {
                Toast.makeText(this@PODetailActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun displayPO(po: PurchaseOrder) {
        binding.tvPoNumber.text = po.poNumber
        binding.tvStatus.text = po.status.uppercase()
        binding.tvVendor.text = po.vendorName.ifEmpty { po.vendorId }
        binding.tvWarehouse.text = po.vendorWarehouseName.ifEmpty { po.vendorWarehouseId }
        binding.tvPoDate.text = DateUtils.formatDate(po.poDate)
        binding.tvExpectedDate.text = DateUtils.formatDate(po.expectedDeliveryDate)
        
        binding.tvTotalQty.text = po.totalQuantity.toString()
        binding.tvShippedQty.text = po.shippedQuantity.toString()
        binding.tvPendingQty.text = po.pendingQuantity.toString()
        
        // Status color
        val statusColor = when (po.status) {
            "approved" -> android.graphics.Color.parseColor("#10B981")
            "cancelled" -> android.graphics.Color.parseColor("#EF4444")
            "draft" -> android.graphics.Color.parseColor("#6B7280")
            else -> android.graphics.Color.parseColor("#F59E0B")
        }
        binding.tvStatus.setTextColor(statusColor)
        
        // Show/hide action buttons
        val isDraft = po.status == "draft"
        binding.btnApprove.visibility = if (isDraft) View.VISIBLE else View.GONE
        binding.btnCancel.visibility = if (isDraft) View.VISIBLE else View.GONE
    }
    
    private fun updateStatus(status: String) {
        lifecycleScope.launch {
            try {
                repository.updatePOStatus(poId, status)
                Toast.makeText(this@PODetailActivity, "Status updated to $status", Toast.LENGTH_SHORT).show()
                loadData()
            } catch (e: Exception) {
                Toast.makeText(this@PODetailActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun showCancelDialog() {
        AlertDialog.Builder(this)
            .setTitle("Cancel PO")
            .setMessage("Are you sure you want to cancel this PO?")
            .setPositiveButton("Yes") { _, _ -> updateStatus("cancelled") }
            .setNegativeButton("No", null)
            .show()
    }
    
    private fun addComment(text: String) {
        lifecycleScope.launch {
            try {
                repository.addComment(poId, text, "User")
                binding.etComment.text?.clear()
                loadData()
                Toast.makeText(this@PODetailActivity, "Comment added", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@PODetailActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        loadData()
    }
}
