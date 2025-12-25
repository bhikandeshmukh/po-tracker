package com.potracker.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.potracker.app.ui.screens.DashboardScreen
import com.potracker.app.ui.screens.PlaceholderScreen
import com.potracker.app.ui.theme.GlassSurface
import com.potracker.app.ui.theme.PrimaryBlue

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object Orders : Screen("orders", "Orders", Icons.Default.Receipt)
    object Shipments : Screen("shipments", "Shipments", Icons.Default.LocalShipping)
    object Vendors : Screen("vendors", "Vendors", Icons.Default.Store)
    object Profile : Screen("profile", "Profile", Icons.Default.Person)
}

@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val screens = listOf(
        Screen.Dashboard,
        Screen.Orders,
        Screen.Shipments,
        Screen.Vendors,
        Screen.Profile
    )

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                modifier = Modifier
                    .shadow(10.dp)
                    .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                screens.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                        label = { Text(screen.title) },
                        selected = currentRoute == screen.route,
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = PrimaryBlue,
                            selectedTextColor = PrimaryBlue,
                            indicatorColor = PrimaryBlue.copy(alpha = 0.1f)
                        ),
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) { DashboardScreen() }
            composable(Screen.Orders.route) { PlaceholderScreen("Orders") }
            composable(Screen.Shipments.route) { PlaceholderScreen("Shipments") }
            composable(Screen.Vendors.route) { PlaceholderScreen("Vendors") }
            composable(Screen.Profile.route) { PlaceholderScreen("Profile") }
        }
    }
}
