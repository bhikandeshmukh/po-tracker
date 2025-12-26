package com.potracker.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.potracker.app.data.model.Appointment
import com.potracker.app.data.remote.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AppointmentsUiState {
    object Loading : AppointmentsUiState()
    data class Success(val appointments: List<Appointment>) : AppointmentsUiState()
    data class Error(val message: String) : AppointmentsUiState()
}

class AppointmentsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<AppointmentsUiState>(AppointmentsUiState.Loading)
    val uiState: StateFlow<AppointmentsUiState> = _uiState

    init {
        fetchAppointments()
    }

    fun fetchAppointments() {
        viewModelScope.launch {
            _uiState.value = AppointmentsUiState.Loading
            try {
                val response = RetrofitClient.apiService.getAppointments()
                if (response.success) {
                    _uiState.value = AppointmentsUiState.Success(response.data)
                } else {
                    _uiState.value = AppointmentsUiState.Error(response.error?.message ?: "Failed to fetch appointments")
                }
            } catch (e: Exception) {
                _uiState.value = AppointmentsUiState.Error(e.message ?: "Unknown error occurred")
            }
        }
    }
}
