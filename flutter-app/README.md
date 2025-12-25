# PO Tracker Flutter App

Cross-platform Flutter application for Purchase Order tracking with Firebase Firestore integration.

## 🚀 Features

- **Purchase Orders**: View all POs, status, quantities, approve/cancel
- **Shipments**: Track shipments, update status, LR/Docket, Invoice
- **Appointments**: View appointments, toggle email sent status
- **Comments**: Add comments/logs to POs
- **Real-time sync**: Direct Firebase Firestore integration
- **Demo Mode**: Works without Firebase configuration (demo@test.com / 123456)
- **Material Design 3**: Modern UI with Flutter
- **Auto-build**: GitHub Actions CI/CD with APK generation

## Setup

### 1. Prerequisites

- Flutter SDK 3.16+
- Dart SDK 3.0+
- Android Studio / VS Code with Flutter extension

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (same as web app)
3. Add Android app with package name: `com.potracker.acpl`
4. Download `google-services.json`
5. Place it in `flutter-app/android/app/` folder
6. Run `flutterfire configure` to generate `firebase_options.dart`

### 3. Build Locally

```bash
cd flutter-app
flutter pub get
flutter build apk --debug
```

APK will be at: `build/app/outputs/flutter-apk/app-debug.apk`

### 4. GitHub Actions (Auto Build)

1. Go to GitHub repo → Settings → Secrets → Actions
2. Add secret `GOOGLE_SERVICES_JSON` with content of your google-services.json file
3. Push to main branch - APK will be built automatically
4. Download APK from Actions → Artifacts or Releases

## Screens

1. **Login**: Firebase Auth email/password
2. **Main**: Tabs for POs, Shipments, Appointments
3. **PO Detail**: Info, quantities, shipments, comments
4. **Shipment Detail**: Info, status update, edit LR/Invoice
5. **Appointment Detail**: Info, email sent toggle

## 📱 App Details

- **Package**: `com.potracker.acpl`
- **Min SDK**: 21 (Android 5.0+)
- **Flutter**: 3.16+
- **Version**: 1.0.0

## 🔧 Tech Stack

- **Framework**: Flutter 3.16+
- **Language**: Dart 3.0+
- **Backend**: Firebase Firestore & Auth
- **State Management**: Provider
- **UI**: Material Design 3

## Project Structure

```
flutter-app/
├── lib/
│   ├── main.dart
│   ├── models/
│   │   └── models.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   └── firebase_repository.dart
│   ├── screens/
│   │   ├── login_screen.dart
│   │   ├── main_screen.dart
│   │   ├── po_detail_screen.dart
│   │   ├── shipment_detail_screen.dart
│   │   └── appointment_detail_screen.dart
│   └── widgets/
│       ├── po_card.dart
│       ├── shipment_card.dart
│       └── appointment_card.dart
├── android/
├── pubspec.yaml
└── README.md
```
