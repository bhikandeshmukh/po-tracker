package com.potracker.acpl

import android.app.Application
import com.potracker.acpl.data.local.SessionManager
import com.potracker.acpl.data.remote.RetrofitClient

class POTrackerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        RetrofitClient.init(this)
    }
}
