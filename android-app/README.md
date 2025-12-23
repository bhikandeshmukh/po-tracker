# PO Tracker Android App

Professional Android application for Purchase Order tracking with Firebase Firestore integration.

## 🚀 Features

- **Purchase Orders**: View all POs, status, quantities, approve/cancel
- **Shipments**: Track shipments, update status, LR/Docket, Invoice
- **Appointments**: View appointments, toggle email sent status
- **Comments**: Add comments/logs to POs
- **Real-time sync**: Direct Firebase Firestore integration
- **Demo Mode**: Works without Firebase configuration (demo@test.com / 123456)
- **Professional UI**: Material Design 3 with splash screen
- **Auto-build**: GitHub Actions CI/CD with APK generation

## Setup

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (same as web app)
3. Add Android app with package name: `com.potracker.app`
4. Download `google-services.json`
5. Place it in `android-app/app/` folder

### 2. Build Locally

```bash
cd android-app
./gradlew assembleDebug
```

APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### 3. GitHub Actions (Auto Build)

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

- **Package**: `com.potracker.app`
- **Min SDK**: 21 (Android 5.0+)
- **Target SDK**: 33 (Android 13)
- **Version**: 1.0.0
- **Architecture**: MVVM with Repository pattern

## 🔧 Tech Stack

- **Language**: Kotlin 1.7.22
- **Build**: Gradle 7.4.2, Android Gradle Plugin 7.3.1
- **Backend**: Firebase Firestore & Auth (BOM 30.3.1)
- **UI**: Material Design 3, ViewBinding
- **Async**: Coroutines, Lifecycle-aware components
- **Build Features**: ProGuard optimization, Resource shrinking
