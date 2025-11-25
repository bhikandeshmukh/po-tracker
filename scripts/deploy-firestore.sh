#!/bin/bash
# scripts/deploy-firestore.sh
# Deploy Firestore rules and indexes

echo "🚀 Deploying Firestore configuration..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase (if not already logged in)
echo "🔐 Checking Firebase authentication..."
firebase login

# Deploy Firestore rules
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Deploy Firestore indexes
echo "📊 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "✅ Firestore configuration deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Verify rules in Firebase Console"
echo "2. Wait for indexes to build (check Firebase Console)"
echo "3. Test API endpoints"
