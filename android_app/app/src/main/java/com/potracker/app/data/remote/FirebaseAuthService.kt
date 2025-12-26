package com.potracker.app.data.remote

import com.potracker.app.data.model.LoginRequest
import com.potracker.app.data.model.LoginResponse
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query

interface FirebaseAuthService {
    @POST("accounts:signInWithPassword")
    suspend fun signInWithPassword(
        @Query("key") apiKey: String,
        @Body request: LoginRequest
    ): LoginResponse
}
