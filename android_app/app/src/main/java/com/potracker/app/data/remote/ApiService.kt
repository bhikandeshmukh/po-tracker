package com.potracker.app.data.remote

import com.potracker.app.data.model.DashboardResponse
import retrofit2.http.GET

interface ApiService {
    @GET("dashboard/metrics")
    suspend fun getDashboardMetrics(): DashboardResponse
}
