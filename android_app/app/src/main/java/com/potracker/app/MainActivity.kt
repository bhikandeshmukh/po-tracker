package com.potracker.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.potracker.app.ui.MainScreen
import com.potracker.app.ui.theme.POTrackerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            POTrackerTheme {
                MainScreen()
            }
        }
    }
}
