package com.potracker.acpl.data.model

import com.google.gson.annotations.SerializedName

data class PurchaseOrderResponse(
    val success: Boolean,
    val data: List<PurchaseOrder>,
    val pagination: Pagination? = null,
    val error: ErrorDetail? = null
)

data class PurchaseOrder(
    val poId: String,
    val poNumber: String,
    val vendorName: String,
    val poDate: String?,
    val totalQuantity: Int?,
    val shippedQuantity: Int?,
    val pendingQuantity: Int?,
    val status: String
)

data class Pagination(
    val nextCursor: String?,
    val hasMore: Boolean,
    val count: Int
)

data class ErrorDetail(
    val message: String,
    val code: String? = null
)
