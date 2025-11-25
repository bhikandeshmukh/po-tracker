@echo off
REM scripts/deploy-firestore.bat
REM Deploy Firestore rules and indexes (Windows)

echo Deploying Firestore configuration...

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

REM Login to Firebase
echo Checking Firebase authentication...
firebase login

REM Deploy Firestore rules
echo Deploying Firestore security rules...
firebase deploy --only firestore:rules

REM Deploy Firestore indexes
echo Deploying Firestore indexes...
firebase deploy --only firestore:indexes

echo Firestore configuration deployed successfully!
echo.
echo Next steps:
echo 1. Verify rules in Firebase Console
echo 2. Wait for indexes to build (check Firebase Console)
echo 3. Test API endpoints

pause
