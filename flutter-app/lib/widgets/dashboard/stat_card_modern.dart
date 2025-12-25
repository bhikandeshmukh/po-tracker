import 'package:flutter/material.dart';

class StatCardModern extends StatelessWidget {
  final String title;
  final String value;
  final String change;
  final bool trendUp;
  final IconData icon;
  final Color baseColor;

  const StatCardModern({
    super.key,
    required this.title,
    required this.value,
    required this.change,
    required this.trendUp,
    required this.icon,
    required this.baseColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: baseColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: baseColor,
                  size: 20,
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                trendUp ? Icons.arrow_upward : Icons.arrow_downward,
                color: trendUp ? Colors.green : Colors.red,
                size: 14,
              ),
              const SizedBox(width: 4),
              Text(
                change,
                style: TextStyle(
                  color: trendUp ? Colors.green : Colors.red,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
