package com.potracker.acpl.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.potracker.acpl.R
import com.potracker.acpl.ui.components.GlassCard
import com.potracker.acpl.ui.components.GradientHeader
import com.potracker.acpl.ui.components.MetricCard
import com.potracker.acpl.ui.theme.GlassBackground

@Composable
fun DashboardScreen(
    viewModel: com.potracker.acpl.ui.viewmodel.DashboardViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(GlassBackground)
    ) {
        GradientHeader(title = "Dashboard", subtitle = "Welcome back, Admin")

        when (val state = uiState) {
            is com.potracker.acpl.ui.viewmodel.DashboardUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = com.potracker.acpl.ui.theme.PrimaryBlue)
                }
            }
            is com.potracker.acpl.ui.viewmodel.DashboardUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is com.potracker.acpl.ui.viewmodel.DashboardUiState.Success -> {
                val data = state.data
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            MetricCard(
                                title = "Total POs",
                                value = data.totalPOs.toString(),
                                trend = "Active: ${data.activePOs}",
                                trendColor = com.potracker.acpl.ui.theme.PrimaryBlue,
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "Pending Qty",
                                value = data.totalPendingQty.toString(),
                                trend = "Ordered: ${data.totalOrderQty}",
                                trendColor = Color(0xFFEF4444),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            MetricCard(
                                title = "Delivered",
                                value = data.totalDeliveredQty.toString(),
                                trend = "Shipments: ${data.deliveredShipments}",
                                trendColor = Color(0xFF22C55E),
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "In Transit",
                                value = data.inTransitShipments.toString(),
                                trend = "Pending: ${data.pendingShipments}",
                                trendColor = Color(0xFFEAB308),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column {
                                Text(
                                    text = "Recent Activity",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                // Mock Activity Items (API doesn't return list yet, future improvement)
                                ActivityItem("System Online", "Just now")
                                ActivityItem("Data Synced from Web", "1 min ago")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ActivityItem(title: String, time: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(Color.Blue, androidx.compose.foundation.shape.CircleShape)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(text = title, fontWeight = FontWeight.Medium)
        }
        Text(text = time, color = Color.Gray, fontSize = 12.sp)
    }
}

@Composable
fun OrdersScreen(
    viewModel: com.potracker.acpl.ui.viewmodel.OrdersViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(com.potracker.acpl.ui.theme.GlassBackground)
    ) {
        GradientHeader(title = "Purchase Orders", subtitle = "Manage your orders")

        when (val state = uiState) {
            is com.potracker.acpl.ui.viewmodel.OrdersUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = com.potracker.acpl.ui.theme.PrimaryBlue)
                }
            }
            is com.potracker.acpl.ui.viewmodel.OrdersUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is com.potracker.acpl.ui.viewmodel.OrdersUiState.Success -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.orders) { order ->
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = order.poNumber,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    StatusBadge(status = order.status)
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Vendor: ${order.vendorName}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.Gray
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(
                                            text = "Qty: ${order.totalQuantity ?: 0}",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                        Text(
                                            text = "Sent: ${order.shippedQuantity ?: 0}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color(0xFF22C55E)
                                        )
                                    }
                                    Text(
                                        text = "Pending: ${order.pendingQuantity ?: 0}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFFEAB308)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AppointmentsScreen(
    viewModel: com.potracker.acpl.ui.viewmodel.AppointmentsViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(com.potracker.acpl.ui.theme.GlassBackground)
    ) {
        GradientHeader(title = "Appointments", subtitle = "Delivery schedule")

        when (val state = uiState) {
            is com.potracker.acpl.ui.viewmodel.AppointmentsUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = com.potracker.acpl.ui.theme.PrimaryBlue)
                }
            }
            is com.potracker.acpl.ui.viewmodel.AppointmentsUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is com.potracker.acpl.ui.viewmodel.AppointmentsUiState.Success -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.appointments) { appt ->
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = appt.appointmentNumber,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "PO: ${appt.poNumber}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.Gray
                                        )
                                    }
                                    StatusBadge(status = appt.status)
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.CalendarToday,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = Color.Gray
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = appt.scheduledDate ?: "Date not set",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Icon(
                                        Icons.Default.AccessTime,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = Color.Gray
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = appt.scheduledTimeSlot ?: "Slot not set",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ShipmentsScreen(
    viewModel: com.potracker.acpl.ui.viewmodel.ShipmentsViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(com.potracker.acpl.ui.theme.GlassBackground)
    ) {
        GradientHeader(title = "Shipments", subtitle = "Track your deliveries")

        when (val state = uiState) {
            is com.potracker.acpl.ui.viewmodel.ShipmentsUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = com.potracker.acpl.ui.theme.PrimaryBlue)
                }
            }
            is com.potracker.acpl.ui.viewmodel.ShipmentsUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is com.potracker.acpl.ui.viewmodel.ShipmentsUiState.Success -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.shipments) { shipment ->
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = shipment.shipmentNumber,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "PO: ${shipment.poNumber}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.Gray
                                        )
                                    }
                                    StatusBadge(status = shipment.status)
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Vendor: ${shipment.vendorName ?: "N/A"}",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "Qty: ${shipment.totalQuantity ?: 0}",
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                    Text(
                                        text = "Due: ${shipment.expectedDeliveryDate ?: "N/A"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.Gray
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val color = when (status.lowercase()) {
        "approved", "delivered", "completed", "confirmed" -> Color(0xFF22C55E)
        "pending", "scheduled", "in_progress", "partial_sent", "partial_completed" -> Color(0xFFEAB308)
        "cancelled" -> Color(0xFFEF4444)
        "in_transit" -> Color(0xFF3B82F6)
        else -> Color.Gray
    }
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.5f))
    ) {
        Text(
            text = status.replace("_", " ").uppercase(),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun PlaceholderScreen(title: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(com.potracker.acpl.ui.theme.GlassBackground)
    ) {
        GradientHeader(title = title, subtitle = "Manage your $title here")
        Box(
            modifier = Modifier
                .fillMaxSize()
                .weight(1f),
            contentAlignment = Alignment.Center
        ) {
            Text("Coming Soon", color = Color.Gray)
        }
    }
}
