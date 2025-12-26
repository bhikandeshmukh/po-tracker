package com.potracker.acpl.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.potracker.acpl.data.model.Shipment
import com.potracker.acpl.data.remote.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class ShipmentsUiState {
    object Loading : ShipmentsUiState()
    data class Success(val shipments: List<Shipment>) : ShipmentsUiState()
    data class Error(val message: String) : ShipmentsUiState()
}

class ShipmentsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<ShipmentsUiState>(ShipmentsUiState.Loading)
    val uiState: StateFlow<ShipmentsUiState> = _uiState

    init {
        fetchShipments()
    }

    fun fetchShipments() {
        viewModelScope.launch {
            _uiState.value = ShipmentsUiState.Loading
            try {
                val response = RetrofitClient.apiService.getShipments()
                if (response.success) {
                    _uiState.value = ShipmentsUiState.Success(response.data)
                } else {
                    _uiState.value = ShipmentsUiState.Error(response.error?.message ?: "Failed to fetch shipments")
                }
            } catch (e: Exception) {
                _uiState.value = ShipmentsUiState.Error(e.message ?: "Unknown error occurred")
            }
        }
    }
}
