package com.potracker.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.potracker.app.ui.theme.GlassBorder
import com.potracker.app.ui.theme.GlassSurface
import com.potracker.app.ui.theme.GradientEnd
import com.potracker.app.ui.theme.GradientStart

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(GlassSurface)
            .border(1.dp, GlassBorder, RoundedCornerShape(24.dp))
            .padding(16.dp)
    ) {
        content()
    }
}

@Composable
fun GradientHeader(title: String, subtitle: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(GradientStart, GradientEnd)
                ),
                shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp)
            )
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.align(Alignment.CenterStart)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.8f)
            )
        }
        
        // Decorative circles
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(100.dp)
                .offset(x = 20.dp, y = (-20).dp)
                .background(Color.White.copy(alpha = 0.1f), androidx.compose.foundation.shape.CircleShape)
        )
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    trend: String,
    trendColor: Color,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .height(140.dp)
    ) {
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = Color.Gray
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = trend,
                style = MaterialTheme.typography.bodySmall,
                color = trendColor,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
