// scripts/create-super-admin.js
// Script to create super admin user in Firebase

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
}

const db = getFirestore();
const auth = getAuth();

async function createSuperAdmin() {
    const userData = {
        email: 'super_admin@email.com',
        password: 'Superadmipassword',
        firstName: 'Name',
        lastName: 'Name',
        phone: 'ph no',
        role: 'super_admin'
    };

    try {
        console.log('🚀 Creating super admin user...\n');

        // Create user ID
        const userId = `${userData.firstName}${userData.lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        console.log(`📝 User ID: ${userId}`);

        // Check if user already exists
        try {
            const existingUser = await auth.getUser(userId);
            console.log('⚠️  User already exists in Firebase Auth');
            
            // Update password
            await auth.updateUser(userId, {
                password: userData.password
            });
            console.log('✅ Password updated');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create Firebase Auth user
                await auth.createUser({
                    uid: userId,
                    email: userData.email,
                    password: userData.password,
                    displayName: `${userData.firstName} ${userData.lastName}`,
                    emailVerified: true
                });
                console.log('✅ Firebase Auth user created');
            } else {
                throw error;
            }
        }

        // Set super admin permissions
        const permissions = {
            canCreatePO: true,
            canApprovePO: true,
            canManageVendors: true,
            canManageReturns: true,
            canViewReports: true,
            canManageUsers: true
        };

        // Create/Update user document in Firestore
        const userDoc = {
            userId: userId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            name: `${userData.firstName} ${userData.lastName}`,
            phone: userData.phone,
            role: userData.role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            profileImage: '',
            permissions: permissions,
            metadata: {
                lastLogin: null,
                loginCount: 0
            }
        };

        await db.collection('users').doc(userId).set(userDoc, { merge: true });
        console.log('✅ Firestore user document created/updated');

        // Create audit log
        await db.collection('auditLogs').doc(`user_created_${userId}_${Date.now()}`).set({
            logId: `user_created_${userId}_${Date.now()}`,
            entityType: 'User',
            entityId: userId,
            action: 'created',
            userId: userId,
            userName: userDoc.name,
            userRole: userDoc.role,
            timestamp: new Date(),
            metadata: {
                email: userData.email,
                role: userData.role,
                createdBy: 'setup-script'
            }
        });
        console.log('✅ Audit log created');

        console.log('\n✨ Super Admin User Created Successfully!\n');
        console.log('📧 Email:', userData.email);
        console.log('🔑 Password:', userData.password);
        console.log('👤 Name:', userDoc.name);
        console.log('📱 Phone:', userData.phone);
        console.log('🎯 Role:', userData.role);
        console.log('🆔 User ID:', userId);
        console.log('\n🎉 You can now login with these credentials!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating super admin:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the script
createSuperAdmin();
