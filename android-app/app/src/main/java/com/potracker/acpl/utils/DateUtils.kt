package com.potracker.acpl.utils

import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.*

object DateUtils {
    private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
    private val dateTimeFormat = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault())
    
    fun formatDate(timestamp: Timestamp?): String {
        return timestamp?.toDate()?.let { dateFormat.format(it) } ?: "N/A"
    }
    
    fun formatDateTime(timestamp: Timestamp?): String {
        return timestamp?.toDate()?.let { dateTimeFormat.format(it) } ?: "N/A"
    }
}
