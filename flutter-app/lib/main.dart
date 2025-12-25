import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';

import 'firebase_options.dart';

import 'package:google_fonts/google_fonts.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('Firebase init error: $e');
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthService(),
      child: MaterialApp(
        title: 'PO Tracker',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF4F46E5), // Indigo 600
              primary: const Color(0xFF4F46E5),
              surface: const Color(0xFFF9FAFB), // Gray 50
          ),
          useMaterial3: true,
          textTheme: GoogleFonts.interTextTheme(),
          scaffoldBackgroundColor: const Color(0xFFF9FAFB),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            elevation: 1,
            centerTitle: false,
            titleTextStyle: TextStyle(
              color: Colors.black87,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            iconTheme: IconThemeData(color: Colors.black87),
          ),
        ),
        home: Consumer<AuthService>(
          builder: (context, auth, _) {
            return auth.isLoggedIn ? const MainScreen() : const LoginScreen();
          },
        ),
      ),
    );
  }
}
