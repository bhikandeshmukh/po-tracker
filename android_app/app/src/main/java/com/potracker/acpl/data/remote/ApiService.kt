package com.potracker.acpl.data.remote

import com.potracker.acpl.data.model.DashboardResponse
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    @POST("auth/login")
    suspend fun verifyLogin(@retrofit2.http.Body body: Map<String, String> = emptyMap()): com.potracker.acpl.data.model.AuthVerifyResponse

    @GET("dashboard/metrics")
    suspend fun getDashboardMetrics(): DashboardResponse

    @GET("purchase-orders")
    suspend fun getPurchaseOrders(@Query("limit") limit: Int = 50): com.potracker.acpl.data.model.PurchaseOrderResponse

    @GET("appointments")
    suspend fun getAppointments(@Query("limit") limit: Int = 50): com.potracker.acpl.data.model.AppointmentResponse

    @GET("shipments")
    suspend fun getShipments(@Query("limit") limit: Int = 50): com.potracker.acpl.data.model.ShipmentResponse
}
