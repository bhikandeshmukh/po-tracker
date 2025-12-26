package com.potracker.acpl.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.potracker.acpl.data.model.PurchaseOrder
import com.potracker.acpl.data.remote.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class OrdersUiState {
    object Loading : OrdersUiState()
    data class Success(val orders: List<PurchaseOrder>) : OrdersUiState()
    data class Error(val message: String) : OrdersUiState()
}

class OrdersViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<OrdersUiState>(OrdersUiState.Loading)
    val uiState: StateFlow<OrdersUiState> = _uiState

    init {
        fetchOrders()
    }

    fun fetchOrders() {
        viewModelScope.launch {
            _uiState.value = OrdersUiState.Loading
            try {
                val response = RetrofitClient.apiService.getPurchaseOrders()
                if (response.success) {
                    _uiState.value = OrdersUiState.Success(response.data)
                } else {
                    _uiState.value = OrdersUiState.Error(response.error?.message ?: "Failed to fetch orders")
                }
            } catch (e: Exception) {
                _uiState.value = OrdersUiState.Error(e.message ?: "Unknown error occurred")
            }
        }
    }
}
