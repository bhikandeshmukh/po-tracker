package com.potracker.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.tabs.TabLayout
import com.google.firebase.auth.FirebaseAuth
import com.potracker.app.adapters.AppointmentAdapter
import com.potracker.app.adapters.POAdapter
import com.potracker.app.adapters.ShipmentAdapter
import com.potracker.app.databinding.ActivityMainBinding
import com.potracker.app.models.Appointment
import com.potracker.app.models.PurchaseOrder
import com.potracker.app.models.Shipment
import com.potracker.app.repository.FirebaseRepository
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val repository = FirebaseRepository()
    
    private var purchaseOrders = listOf<PurchaseOrder>()
    private var shipments = listOf<Shipment>()
    private var appointments = listOf<Appointment>()
    
    private lateinit var poAdapter: POAdapter
    private lateinit var shipmentAdapter: ShipmentAdapter
    private lateinit var appointmentAdapter: AppointmentAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupToolbar()
        setupTabs()
        setupRecyclerView()
        setupSwipeRefresh()
        loadData()
    }
    
    private fun setupToolbar() {
        binding.toolbar.title = "PO Tracker"
        binding.btnLogout.setOnClickListener {
            FirebaseAuth.getInstance().signOut()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
    
    private fun setupTabs() {
        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> showPurchaseOrders()
                    1 -> showShipments()
                    2 -> showAppointments()
                }
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }
    
    private fun setupRecyclerView() {
        poAdapter = POAdapter { po ->
            startActivity(Intent(this, PODetailActivity::class.java).apply {
                putExtra("poId", po.id)
            })
        }
        
        shipmentAdapter = ShipmentAdapter { shipment ->
            startActivity(Intent(this, ShipmentDetailActivity::class.java).apply {
                putExtra("shipmentId", shipment.id)
            })
        }
        
        appointmentAdapter = AppointmentAdapter(
            onClick = { appointment ->
                startActivity(Intent(this, AppointmentDetailActivity::class.java).apply {
                    putExtra("appointmentId", appointment.id)
                })
            },
            onEmailToggle = { appointment, checked ->
                toggleEmailSent(appointment, checked)
            }
        )
        
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = poAdapter
    }
    
    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener { loadData() }
    }
    
    private fun loadData() {
        binding.progressBar.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            try {
                purchaseOrders = repository.getPurchaseOrders()
                shipments = repository.getShipments()
                appointments = repository.getAppointments()
                
                when (binding.tabLayout.selectedTabPosition) {
                    0 -> showPurchaseOrders()
                    1 -> showShipments()
                    2 -> showAppointments()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }
    
    private fun showPurchaseOrders() {
        binding.recyclerView.adapter = poAdapter
        poAdapter.submitList(purchaseOrders)
        binding.tvEmpty.visibility = if (purchaseOrders.isEmpty()) View.VISIBLE else View.GONE
        binding.tvEmpty.text = "No Purchase Orders"
    }
    
    private fun showShipments() {
        binding.recyclerView.adapter = shipmentAdapter
        shipmentAdapter.submitList(shipments)
        binding.tvEmpty.visibility = if (shipments.isEmpty()) View.VISIBLE else View.GONE
        binding.tvEmpty.text = "No Shipments"
    }
    
    private fun showAppointments() {
        binding.recyclerView.adapter = appointmentAdapter
        appointmentAdapter.submitList(appointments)
        binding.tvEmpty.visibility = if (appointments.isEmpty()) View.VISIBLE else View.GONE
        binding.tvEmpty.text = "No Appointments"
    }
    
    private fun toggleEmailSent(appointment: Appointment, checked: Boolean) {
        lifecycleScope.launch {
            try {
                repository.updateAppointmentEmailSent(appointment.id, checked)
                // Update local list
                appointments = appointments.map {
                    if (it.id == appointment.id) it.copy(emailSent = checked) else it
                }
                appointmentAdapter.submitList(appointments)
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        loadData()
    }
}
