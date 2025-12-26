package com.potracker.app.data.remote

import com.potracker.app.data.model.DashboardResponse
import retrofit2.http.GET
import retrofit2.http.Query

interface ApiService {
    @GET("dashboard/metrics")
    suspend fun getDashboardMetrics(): DashboardResponse

    @GET("purchase-orders")
    suspend fun getPurchaseOrders(@Query("limit") limit: Int = 50): com.potracker.app.data.model.PurchaseOrderResponse

    @GET("appointments")
    suspend fun getAppointments(@Query("limit") limit: Int = 50): com.potracker.app.data.model.AppointmentResponse
}
