package com.potracker.acpl.ui

import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.potracker.acpl.databinding.ActivityShipmentDetailBinding
import com.potracker.acpl.models.Shipment
import com.potracker.acpl.repository.FirebaseRepository
import com.potracker.acpl.utils.DateUtils
import kotlinx.coroutines.launch

class ShipmentDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityShipmentDetailBinding
    private val repository = FirebaseRepository()
    private var shipmentId: String = ""
    private var shipment: Shipment? = null
    
    private val statusOptions = listOf("created", "pending", "in_transit", "delivered", "cancelled")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityShipmentDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        shipmentId = intent.getStringExtra("shipmentId") ?: run {
            finish()
            return
        }
        
        setupToolbar()
        setupStatusSpinner()
        setupListeners()
        loadData()
    }
    
    private fun setupToolbar() {
        binding.btnBack.setOnClickListener { finish() }
    }
    
    private fun setupStatusSpinner() {
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, 
            statusOptions.map { it.replace("_", " ").uppercase() })
        binding.spinnerStatus.adapter = adapter
    }
    
    private fun setupListeners() {
        binding.btnUpdateStatus.setOnClickListener { updateStatus() }
        binding.btnSaveDetails.setOnClickListener { saveDetails() }
    }
    
    private fun loadData() {
        binding.progressBar.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            try {
                shipment = repository.getShipmentById(shipmentId)
                shipment?.let { displayShipment(it) }
            } catch (e: Exception) {
                Toast.makeText(this@ShipmentDetailActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun displayShipment(s: Shipment) {
        binding.tvShipmentNumber.text = s.shipmentNumber.ifEmpty { s.shipmentId }
        binding.tvPoNumber.text = s.poNumber
        binding.tvStatus.text = s.status.replace("_", " ").uppercase()
        binding.tvVendor.text = s.vendorName
        binding.tvWarehouse.text = s.warehouseName
        binding.tvTransporter.text = s.transporterName
        binding.tvShipmentDate.text = DateUtils.formatDate(s.shipmentDate)
        binding.tvExpectedDate.text = DateUtils.formatDate(s.expectedDeliveryDate)
        binding.tvTotalQty.text = s.totalQuantity.toString()
        binding.tvDeliveredQty.text = s.deliveredQuantity.toString()
        
        binding.etLrDocket.setText(s.lrDocketNumber)
        binding.etInvoice.setText(s.invoiceNumber)
        
        // Set spinner position
        val statusIndex = statusOptions.indexOf(s.status)
        if (statusIndex >= 0) binding.spinnerStatus.setSelection(statusIndex)
        
        // Status color
        val statusColor = when (s.status) {
            "delivered" -> android.graphics.Color.parseColor("#10B981")
            "in_transit" -> android.graphics.Color.parseColor("#3B82F6")
            "cancelled" -> android.graphics.Color.parseColor("#EF4444")
            else -> android.graphics.Color.parseColor("#F59E0B")
        }
        binding.tvStatus.setTextColor(statusColor)
    }
    
    private fun updateStatus() {
        val newStatus = statusOptions[binding.spinnerStatus.selectedItemPosition]
        
        lifecycleScope.launch {
            try {
                repository.updateShipmentStatus(shipmentId, newStatus)
                Toast.makeText(this@ShipmentDetailActivity, "Status updated", Toast.LENGTH_SHORT).show()
                loadData()
            } catch (e: Exception) {
                Toast.makeText(this@ShipmentDetailActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun saveDetails() {
        val lrDocket = binding.etLrDocket.text.toString().trim()
        val invoice = binding.etInvoice.text.toString().trim()
        
        lifecycleScope.launch {
            try {
                repository.updateShipmentDetails(shipmentId, lrDocket, invoice)
                Toast.makeText(this@ShipmentDetailActivity, "Details saved", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@ShipmentDetailActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
