package com.potracker.acpl.data.remote

import com.potracker.acpl.data.model.LoginRequest
import com.potracker.acpl.data.model.LoginResponse
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
