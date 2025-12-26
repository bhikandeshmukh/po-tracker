package com.potracker.acpl.data.remote

import android.content.Context
import com.potracker.acpl.data.local.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private const val BASE_URL = "https://potracker.vercel.app/api/"
    private const val FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/"

    private lateinit var sessionManager: SessionManager

    fun init(context: Context) {
        sessionManager = SessionManager(context)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .addInterceptor(loggingInterceptor)
            .build()
    }

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    val authService: FirebaseAuthService by lazy {
        Retrofit.Builder()
            .baseUrl(FIREBASE_AUTH_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(FirebaseAuthService::class.java)
    }

    fun getSessionManager(): SessionManager = sessionManager
}
