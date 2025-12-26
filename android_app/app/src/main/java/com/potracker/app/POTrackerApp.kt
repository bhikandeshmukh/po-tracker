package com.potracker.app

import android.app.Application
import com.potracker.app.data.local.SessionManager
import com.potracker.app.data.remote.RetrofitClient

class POTrackerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        RetrofitClient.init(this)
    }
}
