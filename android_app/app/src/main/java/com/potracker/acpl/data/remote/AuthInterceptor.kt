package com.potracker.acpl.data.remote

import com.potracker.acpl.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = sessionManager.getAuthToken()

        val requestBuilder = originalRequest.newBuilder()
        if (token != null) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())

        if (response.code == 401) {
            sessionManager.clearSession()
            // In a real app, you'd trigger a redirect to Login here
        }

        return response
    }
}
