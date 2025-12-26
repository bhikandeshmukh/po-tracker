package com.potracker.acpl.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.potracker.acpl.data.model.LoginRequest
import com.potracker.acpl.data.remote.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

class LoginViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState

    // IMPORTANT: User needs to provide their Firebase API Key here
    private val FIREBASE_API_KEY = "AIzaSyCn5eKzvKygZDwEJqhLWWBFjDWHBMM9ns0"

    fun login(email: String, password: String) {
        if (email.isEmpty() || password.isEmpty()) {
            _uiState.value = LoginUiState.Error("Email and password are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            try {
                // 1. Authenticate with Firebase
                val loginResponse = RetrofitClient.authService.signInWithPassword(
                    FIREBASE_API_KEY,
                    LoginRequest(email, password)
                )

                // 2. Save token to SessionManager
                RetrofitClient.getSessionManager().saveAuthToken(loginResponse.idToken)

                // 3. Verify with Backend (and get user profile/role)
                val verifyResponse = RetrofitClient.apiService.verifyLogin()

                if (verifyResponse.success) {
                    _uiState.value = LoginUiState.Success
                } else {
                    _uiState.value = LoginUiState.Error(verifyResponse.error?.message ?: "Verification failed")
                }
            } catch (e: Exception) {
                _uiState.value = LoginUiState.Error(e.message ?: "Authentication failed")
            }
        }
    }
}
