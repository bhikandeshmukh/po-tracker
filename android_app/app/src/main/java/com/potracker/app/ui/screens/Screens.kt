package com.potracker.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.potracker.app.R
import com.potracker.app.ui.components.GlassCard
import com.potracker.app.ui.components.GradientHeader
import com.potracker.app.ui.components.MetricCard
import com.potracker.app.ui.theme.GlassBackground

@Composable
fun DashboardScreen(
    viewModel: com.potracker.app.ui.viewmodel.DashboardViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(GlassBackground)
    ) {
        GradientHeader(title = "Dashboard", subtitle = "Welcome back, Admin")

        when (val state = uiState) {
            is com.potracker.app.ui.viewmodel.DashboardUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    androidx.compose.material3.CircularProgressIndicator(color = com.potracker.app.ui.theme.PrimaryBlue)
                }
            }
            is com.potracker.app.ui.viewmodel.DashboardUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is com.potracker.app.ui.viewmodel.DashboardUiState.Success -> {
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
                                trendColor = com.potracker.app.ui.theme.PrimaryBlue,
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
fun PlaceholderScreen(title: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(GlassBackground)
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
