package com.potracker.app.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.potracker.app.data.model.DashboardData
import com.potracker.app.data.remote.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class DashboardUiState {
    object Loading : DashboardUiState()
    data class Success(val data: DashboardData) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}

class DashboardViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        fetchDashboardMetrics()
    }

    fun fetchDashboardMetrics() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            try {
                Log.d("DashboardViewModel", "Fetching metrics...")
                val response = RetrofitClient.apiService.getDashboardMetrics()
                if (response.success && response.data != null) {
                    _uiState.value = DashboardUiState.Success(response.data)
                    Log.d("DashboardViewModel", "Success: ${response.data}")
                } else {
                    _uiState.value = DashboardUiState.Error("Failed to fetch data")
                    Log.d("DashboardViewModel", "Failed: ${response}")
                }
            } catch (e: Exception) {
                _uiState.value = DashboardUiState.Error(e.message ?: "Unknown error")
                Log.e("DashboardViewModel", "Error", e)
            }
        }
    }
}
