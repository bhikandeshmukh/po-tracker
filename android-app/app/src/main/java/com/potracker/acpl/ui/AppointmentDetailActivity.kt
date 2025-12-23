package com.potracker.acpl.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.potracker.acpl.databinding.ActivityAppointmentDetailBinding
import com.potracker.acpl.models.Appointment
import com.potracker.acpl.repository.FirebaseRepository
import com.potracker.acpl.utils.DateUtils
import kotlinx.coroutines.launch

class AppointmentDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAppointmentDetailBinding
    private val repository = FirebaseRepository()
    private var appointmentId: String = ""
    private var appointment: Appointment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAppointmentDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        appointmentId = intent.getStringExtra("appointmentId") ?: run {
            finish()
            return
        }
        
        setupToolbar()
        setupListeners()
        loadData()
    }
    
    private fun setupToolbar() {
        binding.btnBack.setOnClickListener { finish() }
    }
    
    private fun setupListeners() {
        binding.cbEmailSent.setOnCheckedChangeListener { _, isChecked ->
            updateEmailSent(isChecked)
        }
    }
    
    private fun loadData() {
        binding.progressBar.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            try {
                appointment = repository.getAppointmentById(appointmentId)
                appointment?.let { displayAppointment(it) }
            } catch (e: Exception) {
                Toast.makeText(this@AppointmentDetailActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun displayAppointment(a: Appointment) {
        binding.tvAppointmentNumber.text = a.appointmentNumber.ifEmpty { a.appointmentId }
        binding.tvPoNumber.text = a.poNumber
        binding.tvStatus.text = a.status.replace("_", " ").uppercase()
        binding.tvVendor.text = a.vendorName
        binding.tvWarehouse.text = a.warehouseName
        binding.tvTransporter.text = a.transporterName
        binding.tvScheduledDate.text = DateUtils.formatDate(a.scheduledDate)
        binding.tvTimeSlot.text = a.scheduledTimeSlot.ifEmpty { "Not Set" }
        binding.tvTotalQty.text = a.totalQuantity.toString()
        binding.tvLrDocket.text = a.lrDocketNumber.ifEmpty { "-" }
        binding.tvInvoice.text = a.invoiceNumber.ifEmpty { "-" }
        
        // Email sent checkbox
        binding.cbEmailSent.setOnCheckedChangeListener(null)
        binding.cbEmailSent.isChecked = a.emailSent
        binding.cbEmailSent.setOnCheckedChangeListener { _, isChecked ->
            updateEmailSent(isChecked)
        }
        
        // Status color
        val statusColor = when (a.status) {
            "delivered" -> android.graphics.Color.parseColor("#10B981")
            "in_transit" -> android.graphics.Color.parseColor("#3B82F6")
            "cancelled" -> android.graphics.Color.parseColor("#EF4444")
            else -> android.graphics.Color.parseColor("#F59E0B")
        }
        binding.tvStatus.setTextColor(statusColor)
    }
    
    private fun updateEmailSent(sent: Boolean) {
        lifecycleScope.launch {
            try {
                repository.updateAppointmentEmailSent(appointmentId, sent)
                Toast.makeText(this@AppointmentDetailActivity, 
                    if (sent) "Marked as sent" else "Marked as not sent", 
                    Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@AppointmentDetailActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                // Revert checkbox
                binding.cbEmailSent.isChecked = !sent
            }
        }
    }
}
