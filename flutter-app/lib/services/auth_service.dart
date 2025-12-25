import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AuthService extends ChangeNotifier {
  User? _user;
  bool _isDemoMode = false;

  bool get isLoggedIn => _user != null || _isDemoMode;
  User? get user => _user;
  String get userEmail => _user?.email ?? (_isDemoMode ? 'demo@test.com' : '');

  AuthService() {
    try {
      FirebaseAuth.instance.authStateChanges().listen((user) {
        _user = user;
        notifyListeners();
      });
    } catch (e) {
      debugPrint('Firebase Auth not configured: $e');
    }
  }

  Future<String?> login(String email, String password) async {
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return null;
    } on FirebaseAuthException catch (e) {
      return e.message;
    } catch (e) {
      // Demo mode fallback
      if (email == 'demo@test.com' && password == '123456') {
        _isDemoMode = true;
        notifyListeners();
        return null;
      }
      return 'Demo mode: Use demo@test.com / 123456';
    }
  }

  Future<void> logout() async {
    try {
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      debugPrint('Logout error: $e');
    }
    _isDemoMode = false;
    _user = null;
    notifyListeners();
  }
}
