package com.potracker.app.data.model

data class LoginRequest(
    val email: String,
    val password: String,
    val returnSecureToken: Boolean = true
)

data class LoginResponse(
    val idToken: String,
    val email: String,
    val refreshToken: String,
    val expiresIn: String,
    val localId: String,
    val registered: Boolean
)

data class AuthVerifyResponse(
    val success: Boolean,
    val data: AuthUserData?,
    val error: ErrorDetail?
)

data class AuthUserData(
    val user: UserProfile
)

data class UserProfile(
    val uid: String,
    val email: String,
    val name: String,
    val role: String,
    val permissions: Map<String, Boolean>?
)
