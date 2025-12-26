package com.potracker.acpl

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.potracker.acpl.ui.MainScreen
import com.potracker.acpl.ui.theme.POTrackerTheme

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
