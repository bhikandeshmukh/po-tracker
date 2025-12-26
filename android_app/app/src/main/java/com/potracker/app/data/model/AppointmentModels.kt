package com.potracker.app.data.model

import com.google.gson.annotations.SerializedName

data class AppointmentResponse(
    val success: Boolean,
    val data: List<Appointment>,
    val error: ErrorDetail? = null
)

data class Appointment(
    val appointmentId: String,
    val appointmentNumber: String,
    val poNumber: String,
    val vendorName: String?,
    val scheduledDate: String?,
    val scheduledTimeSlot: String?,
    val status: String,
    val lrDocketNumber: String?,
    val totalQuantity: Int?
)
