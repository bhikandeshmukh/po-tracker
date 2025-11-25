# Complete Database Guide - Purchase Order Tracking System

**A comprehensive guide covering database design, implementation, and deployment for Firebase-based Purchase Order tracking system.**

---

## Table of Contents

1. [Overview](#overview)
2. [Document ID Formats](#document-id-formats)
3. [Database Design](#database-design)
4. [Firebase Implementation](#firebase-implementation)
5. [Next.js Integration](#nextjs-integration)
6. [Common Operations](#common-operations)
7. [Quick Reference](#quick-reference)

---

# Overview

This system handles Purchase Order tracking with the following features:
- **Multi-vendor support** with warehouses
- **Partial shipments** from POs
- **Delivery appointments** scheduling
- **Return orders** with tracking
- **Transporter management**
- **Complete audit trail**
- **Role-based access** (user, manager, admin, super_admin)

**Database:** Firebase Firestore (NoSQL)
**Key Feature:** All document IDs are **manually created** (no auto-generated IDs)

---

# Document ID Formats

## Quick Reference Table

### Primary Collections

| Collection | ID Format | Example | Description |
|-----------|-----------|---------|-------------|
| `users` | `{firstname}{lastname}` | `johndoe` | Lowercase, no spaces |
| `vendors` | `{vendor-name}` | `abc-traders` | Kebab-case |
| `transporters` | `{transporter-name}` | `abc-shipment` | Kebab-case |
| `purchaseOrders` | `PO-YYYY-NNNN` | `PO-2024-0001` | Fixed format |
| `shipments` | `APT-YYYY-NNNN` | `APT-2024-0001` | ⚠️ Same as appointment |
| `appointments` | `APT-YYYY-NNNN` | `APT-2024-0001` | ⚠️ Same as shipment |
| `returnOrders` | `RO-YYYY-NNNN` | `RO-2024-0001` | Fixed format |
| `poActivityLogs` | `PO-YYYY-NNNN` | `PO-2024-0001` | Stores action array |
| `auditLogs` | `{action}_{number}` | `po_created_PO-2024-0001` | Composite |
| `recentActivities` | `{TYPE}_{number}` | `PO_CREATED_PO-2024-0001` | Composite |

### Sub-Collections

| Sub-Collection Path | ID Format | Example |
|-------------------|-----------|---------|
| `vendors/{id}/warehouses/{id}` | `{warehouse-name}` | `main-warehouse` |
| `purchaseOrders/{id}/items/{id}` | `{SKU}` | `SKU123` |
| `shipments/{id}/items/{id}` | `{SKU}` | `SKU123` |
| `returnOrders/{id}/items/{id}` | `{SKU}` | `SKU123` |

## ID Formatting Rules

### Kebab-Case Format
**Used for:** Users, Vendors, Transporters, Warehouses

**Rules:**
- All lowercase
- Spaces → hyphens (`-`)
- Remove special characters: `&`, `/`, `'`, `.`, etc.

**Examples:**
```
"ABC Traders" → "abc-traders"
"John Doe" → "johndoe"
"M/s ABC & Co." → "ms-abc-co"
"Delhi Warehouse" → "delhi-warehouse"
```

### Fixed Format
**Used for:** POs, Appointments, Shipments, Returns

**Patterns:**
- `PO-YYYY-NNNN` - Purchase Orders
- `APT-YYYY-NNNN` - Appointments & Shipments
- `RO-YYYY-NNNN` - Return Orders

### Composite Format
**Used for:** Audit Logs, Recent Activities

**Pattern:** `{action}_{entity_id}`

**Examples:**
```
po_created_PO-2024-0001
shipment_dispatched_APT-2024-0001
return_received_RO-2024-0001
```

## Important Rules

> **Shipment & Appointment Linking**
> - Shipment and Appointment share the **same document ID**
> - When creating shipment, user provides appointment ID
> - Both collections use `APT-2024-0001` format
> - This creates a 1:1 relationship

> **SKU Duplicates**
> - Same SKU can exist in different POs/Shipments/Returns
> - Same SKU CANNOT exist twice in the same PO

> **Special Characters**
> - No special characters allowed in IDs
> - Spaces converted to hyphens in kebab-case format

---

# Database Design

## Collections Overview

```
📁 Firestore Database (11 Collections)
├── users
├── vendors (with warehouses sub-collection)
├── transporters
├── purchaseOrders (with items sub-collection)
├── shipments (with items sub-collection)
├── appointments
├── returnOrders (with items sub-collection)
├── poActivityLogs
├── auditLogs
├── recentActivities
└── dashboardMetrics
```

## 1. users Collection

**Document ID:** `{firstname}{lastname}` (e.g., `johndoe`)

```typescript
{
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  name: string,
  phone: string,
  role: "user" | "manager" | "admin" | "super_admin",
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
  profileImage?: string,
  permissions: {
    canCreatePO: boolean,
    canApprovePO: boolean,
    canManageVendors: boolean,
    canManageReturns: boolean,
    canViewReports: boolean,
    canManageUsers: boolean
  },
  metadata: {
    lastLogin: timestamp,
    loginCount: number
  }
}
```

## 2. vendors Collection

**Document ID:** Vendor name in kebab-case (e.g., `abc-traders`)

```typescript
{
  vendorId: string,
  vendorCode: string,
  vendorName: string,
  contactPerson: string,
  email: string,
  phone: string,
  address: {
    street: string,
    city: string,
    state: string,
    pincode: string,
    country: string
  },
  gstNumber: string,
  panNumber: string,
  isActive: boolean,
  paymentTerms: string,
  rating: number,
  totalOrders: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

**Sub-collection: warehouses**
```typescript
vendors/{vendorId}/warehouses/{warehouseId}
{
  warehouseId: string,
  warehouseCode: string,
  warehouseName: string,
  address: { ... },
  contactPerson: string,
  phone: string,
  email: string,
  isActive: boolean,
  capacity?: string,
  operatingHours?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 3. transporters Collection

**Document ID:** Transporter name in kebab-case (e.g., `abc-shipment`)

```typescript
{
  transporterId: string,
  transporterCode: string,
  transporterName: string,
  contactPerson: string,
  email: string,
  phone: string,
  address: { ... },
  gstNumber: string,
  vehicleTypes: string[],
  isActive: boolean,
  rating: number,
  totalShipments: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

## 4. purchaseOrders Collection

**Document ID:** PO Number (e.g., `PO-2024-0001`)

```typescript
{
  poId: string,
  poNumber: string,
  vendorId: string,
  vendorName: string,
  vendorWarehouseId: string,
  vendorWarehouseName: string,
  status: "draft" | "submitted" | "approved" | "partially_shipped" | "fully_shipped" | "cancelled",
  poDate: timestamp,
  expectedDeliveryDate: timestamp,
  totalAmount: number,
  totalGST: number,
  grandTotal: number,
  totalItems: number,
  totalQuantity: number,
  shippedQuantity: number,
  pendingQuantity: number,
  notes?: string,
  termsAndConditions?: string,
  approvedBy?: string,
  approvedAt?: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
  metadata: {
    totalShipments: number,
    completedShipments: number,
    pendingShipments: number,
    totalReturns: number
  }
}
```

**Sub-collection: items**
```typescript
purchaseOrders/{poId}/items/{itemId}
{
  itemId: string,              // SKU
  lineNumber: number,
  sku: string,
  barcode: string,
  itemName: string,
  itemDescription?: string,
  poQuantity: number,
  shippedQuantity: number,
  pendingQuantity: number,
  receivedQuantity: number,
  returnedQuantity: number,
  unitPrice: number,
  mrp: number,
  gstRate: number,
  gstAmount: number,
  totalAmount: number,
  unit: string,
  hsnCode?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 5. shipments Collection

**Document ID:** Appointment ID (e.g., `APT-2024-0001`)

```typescript
{
  shipmentId: string,          // Same as appointmentId
  shipmentNumber: string,
  poId: string,
  poNumber: string,
  vendorId: string,
  vendorName: string,
  vendorWarehouseId: string,
  transporterId: string,
  transporterName: string,
  status: "created" | "dispatched" | "in_transit" | "delivered" | "cancelled",
  shipmentDate: timestamp,
  expectedDeliveryDate: timestamp,
  actualDeliveryDate?: timestamp,
  totalItems: number,
  totalQuantity: number,
  totalAmount: number,
  trackingNumber?: string,
  vehicleNumber?: string,
  driverName?: string,
  driverPhone?: string,
  shippingAddress: { ... },
  notes?: string,
  appointmentId: string,
  appointmentScheduled: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
  deliveredBy?: string,
  deliveredAt?: timestamp
}
```

**Sub-collection: items** - Same structure as PO items

## 6. appointments Collection

**Document ID:** Appointment Number (e.g., `APT-2024-0001`)

```typescript
{
  appointmentId: string,
  appointmentNumber: string,
  shipmentId: string,          // Same as appointmentId
  shipmentNumber: string,
  poId: string,
  poNumber: string,
  vendorId: string,
  vendorName: string,
  transporterId: string,
  transporterName: string,
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rescheduled",
  scheduledDate: timestamp,
  scheduledTimeSlot: string,
  deliveryLocation: {
    locationName: string,
    address: { ... },
    contactPerson: string,
    contactPhone: string
  },
  rescheduledFrom?: timestamp,
  rescheduledReason?: string,
  rescheduledBy?: string,
  rescheduledAt?: timestamp,
  completedAt?: timestamp,
  completedBy?: string,
  notes?: string,
  specialInstructions?: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

## 7. returnOrders Collection

**Document ID:** Return Order Number (e.g., `RO-2024-0001`)

```typescript
{
  returnId: string,
  returnNumber: string,
  poId: string,
  poNumber: string,
  shipmentId?: string,
  shipmentNumber?: string,
  vendorId: string,
  vendorName: string,
  vendorWarehouseId: string,
  transporterId?: string,
  transporterName?: string,
  status: "created" | "approved" | "in_transit" | "received" | "rejected" | "cancelled",
  returnType: "damaged" | "defective" | "wrong_item" | "excess" | "other",
  returnReason: string,
  returnDate: timestamp,
  expectedReturnReceiptDate?: timestamp,
  actualReturnReceiptDate?: timestamp,
  totalItems: number,
  totalQuantity: number,
  totalAmount: number,
  trackingNumber?: string,
  vehicleNumber?: string,
  isRefundProcessed: boolean,
  refundAmount?: number,
  refundDate?: timestamp,
  notes?: string,
  approvedBy?: string,
  approvedAt?: timestamp,
  receivedBy?: string,
  receivedAt?: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

**Sub-collection: items** - Similar to PO items with return quantities

## 8. poActivityLogs Collection

**Document ID:** PO Number (e.g., `PO-2024-0001`)

```typescript
{
  poId: string,
  poNumber: string,
  actions: [
    {
      actionId: string,
      action: string,          // Action type
      timestamp: timestamp,
      performedBy: string,
      performedByName: string,
      performedByRole: string,
      changes?: [
        {
          field: string,
          oldValue: any,
          newValue: any
        }
      ],
      metadata?: {
        itemId?: string,
        shipmentId?: string,
        oldStatus?: string,
        newStatus?: string,
        notes?: string
      }
    }
  ],
  createdAt: timestamp,
  lastUpdated: timestamp
}
```

**Action Types:**
- `created`, `updated`, `approved`, `rejected`, `cancelled`
- `item_added`, `item_updated`, `item_removed`
- `shipment_created`, `shipment_completed`
- `return_created`, `status_changed`

## 9. auditLogs Collection

**Document ID:** `{action}_{entityNumber}` (e.g., `po_created_PO-2024-0001`)

```typescript
{
  logId: string,
  entityType: string,
  entityId: string,
  entityNumber?: string,
  action: string,
  userId: string,
  userName: string,
  userRole: string,
  changes?: [ ... ],
  ipAddress?: string,
  userAgent?: string,
  timestamp: timestamp,
  metadata?: { ... }
}
```

## 10. recentActivities Collection

**Document ID:** `{type}_{entityNumber}` (e.g., `PO_CREATED_PO-2024-0001`)

```typescript
{
  activityId: string,
  type: string,
  title: string,
  description: string,
  entityType: string,
  entityId: string,
  entityNumber?: string,
  userId: string,
  userName: string,
  metadata?: { ... },
  timestamp: timestamp,
  expiresAt: timestamp         // TTL - 90 days
}
```

## 11. dashboardMetrics Collection

**Document ID:** `overview`

```typescript
{
  // Purchase Orders
  totalPOs: number,
  activePOs: number,
  pendingApprovalPOs: number,
  totalPOAmount: number,
  thisMonthPOAmount: number,
  
  // Shipments
  totalShipments: number,
  inTransitShipments: number,
  deliveredShipments: number,
  pendingShipments: number,
  
  // Appointments
  todayAppointments: number,
  upcomingAppointments: number,
  completedAppointments: number,
  
  // Returns
  totalReturns: number,
  pendingReturns: number,
  completedReturns: number,
  totalReturnAmount: number,
  
  // Vendors & Transporters
  totalVendors: number,
  activeVendors: number,
  totalTransporters: number,
  activeTransporters: number,
  
  lastUpdated: timestamp
}
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserRole() == 'super_admin';
    }
    
    function isAdmin() {
      return isAuthenticated() && (getUserRole() == 'admin' || getUserRole() == 'super_admin');
    }
    
    function isManager() {
      return isAuthenticated() && (getUserRole() in ['manager', 'admin', 'super_admin']);
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isSuperAdmin();
    }
    
    match /vendors/{vendorId} {
      allow read: if isAuthenticated();
      allow write: if isManager();
      match /warehouses/{warehouseId} {
        allow read: if isAuthenticated();
        allow write: if isManager();
      }
    }
    
    match /transporters/{transporterId} {
      allow read: if isAuthenticated();
      allow write: if isManager();
    }
    
    match /purchaseOrders/{poId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isManager();
      allow delete: if isAdmin();
      match /items/{itemId} {
        allow read: if isAuthenticated();
        allow write: if isManager();
      }
    }
    
    match /shipments/{shipmentId} {
      allow read: if isAuthenticated();
      allow write: if isManager();
      match /items/{itemId} {
        allow read: if isAuthenticated();
        allow write: if isManager();
      }
    }
    
    match /appointments/{appointmentId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    match /returnOrders/{returnId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isManager();
      allow delete: if isAdmin();
      match /items/{itemId} {
        allow read: if isAuthenticated();
        allow write: if isManager();
      }
    }
    
    match /poActivityLogs/{poId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isManager();
      allow delete: if isAdmin();
    }
    
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
    
    match /recentActivities/{activityId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
    
    match /dashboardMetrics/{document=**} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
  }
}
```

## Required Indexes

```javascript
// Purchase Orders
purchaseOrders: [vendorId, status, poDate DESC]
purchaseOrders: [status, poDate DESC]
purchaseOrders: [createdBy, poDate DESC]

// Shipments
shipments: [poId, status, shipmentDate DESC]
shipments: [transporterId, status, shipmentDate DESC]
shipments: [status, shipmentDate DESC]

// Appointments
appointments: [scheduledDate, status]

// Return Orders
returnOrders: [poId, status, returnDate DESC]
returnOrders: [status, returnDate DESC]
returnOrders: [vendorId, status]

// Audit Logs
auditLogs: [entityType, entityId, timestamp DESC]
auditLogs: [userId, timestamp DESC]
auditLogs: [entityType, timestamp DESC]

// Recent Activities
recentActivities: [type, timestamp DESC]
recentActivities: [timestamp DESC]
```

---

# Firebase Implementation

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `po-tracking-system`
4. Click **"Create project"**

## Step 2: Enable Firestore

1. Go to **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose location: `asia-south1` (or nearest)
5. Click **"Enable"**

## Step 3: Enable Authentication

1. Go to **"Authentication"**
2. Click **"Get started"**
3. Enable **"Email/Password"**
4. Click **"Save"**

## Step 4: Register Web App

1. Click **"Add app"** → **Web**
2. Enter app nickname: `PO Tracking Web App`
3. Click **"Register app"**
4. **Copy Firebase configuration**

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 4b: Setup Backend Service Account (Crucial for APIs)

1. Go to **Project Settings** (Gear icon) → **"Service accounts"** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** to confirm
4. A JSON file will download containing your credentials
5. Open the JSON file and find:
   - `client_email` → Copy to `FIREBASE_CLIENT_EMAIL` in `.env.local`
   - `private_key` → Copy to `FIREBASE_PRIVATE_KEY` in `.env.local`

> **Note:** The private key contains `\n` characters. When pasting into `.env.local`, ensure it remains as a single line string if possible, or wrap it in quotes. The code handles `\n` replacement automatically.

## Step 5: Setup Security Rules

1. Go to **"Firestore Database"** → **"Rules"**
2. Copy and paste the security rules from above
3. Click **"Publish"**

## Step 6: Create Indexes

Go to **"Firestore Database"** → **"Indexes"** → **"Composite"**

Create all indexes listed in the "Required Indexes" section above.

## Step 7: Add Initial Data

### Create Super Admin User

1. **Authentication** → **"Add user"**
   - Email: `admin@example.com`
   - Password: `Admin123!`

2. **Firestore** → Create document in `users` collection
   - Document ID: `adminuser`
   - Add all fields as shown in schema

### Create Sample Vendor

```javascript
Collection: vendors
Document ID: abc-traders
{
  vendorId: "abc-traders",
  vendorCode: "VEN-001",
  vendorName: "ABC Traders",
  contactPerson: "Rajesh Kumar",
  email: "rajesh@abctraders.com",
  phone: "+91-9876543210",
  address: {
    street: "123 MG Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India"
  },
  gstNumber: "27AABCU9603R1ZM",
  panNumber: "AABCU9603R",
  isActive: true,
  paymentTerms: "30 days",
  rating: 4.5,
  totalOrders: 0,
  createdAt: [Current timestamp],
  updatedAt: [Current timestamp],
  createdBy: "adminuser"
}
```

Add warehouse sub-collection similarly.

---

# Next.js Integration

## Installation

```bash
npm install firebase
```

## Firebase Configuration

Create `lib/firebase.js`:

```javascript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

# Common Operations

## Create Purchase Order

```javascript
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

async function createPurchaseOrder(poData) {
  const poId = poData.poNumber;
  
  await setDoc(doc(db, 'purchaseOrders', poId), {
    ...poData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Create PO Activity Log
  await setDoc(doc(db, 'poActivityLogs', poId), {
    poId: poId,
    poNumber: poData.poNumber,
    actions: [{
      actionId: Date.now().toString(),
      action: 'created',
      timestamp: serverTimestamp(),
      performedBy: poData.createdBy,
      performedByName: 'User Name',
      performedByRole: 'manager',
      metadata: {
        totalAmount: poData.grandTotal,
        vendorId: poData.vendorId
      }
    }],
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp()
  });
}
```

## Add Action to PO Activity Log

```javascript
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

async function addPOAction(poId, action) {
  await updateDoc(doc(db, 'poActivityLogs', poId), {
    actions: arrayUnion({
      actionId: Date.now().toString(),
      action: action.type,
      timestamp: serverTimestamp(),
      performedBy: action.userId,
      performedByName: action.userName,
      performedByRole: action.userRole,
      changes: action.changes || [],
      metadata: action.metadata || {}
    }),
    lastUpdated: serverTimestamp()
  });
}
```

## Query Purchase Orders

```javascript
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

async function getPOsByVendor(vendorId) {
  const q = query(
    collection(db, 'purchaseOrders'),
    where('vendorId', '==', vendorId),
    where('status', '==', 'approved'),
    orderBy('poDate', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

## Get PO Activity Log

```javascript
async function getPOActivityLog(poNumber) {
  const activityLogRef = doc(db, 'poActivityLogs', poNumber);
  const activityLog = await activityLogRef.get();
  
  if (activityLog.exists) {
    const data = activityLog.data();
    return data.actions;
  }
  return [];
}
```

---

# Quick Reference

## Common Commands

```bash
# Install Firebase SDK
npm install firebase

# Install Firebase Admin
npm install firebase-admin

# Install Firebase Tools
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## Document ID Examples

```javascript
// User
userId = "johndoe"

// Vendor
vendorId = "abc-traders"

// Warehouse
warehouseId = "main-warehouse"

// Purchase Order
poId = "PO-2024-0001"

// Shipment & Appointment (same ID)
shipmentId = "APT-2024-0001"
appointmentId = "APT-2024-0001"

// Return Order
returnId = "RO-2024-0001"

// Item
itemId = "SKU123"

// Audit Log
logId = "po_created_PO-2024-0001"

// PO Activity Log
activityLogId = "PO-2024-0001" // Same as PO ID
```

## Status Values

**PO Status:**
- `draft`, `submitted`, `approved`, `partially_shipped`, `fully_shipped`, `cancelled`

**Shipment Status:**
- `created`, `dispatched`, `in_transit`, `delivered`, `cancelled`

**Appointment Status:**
- `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `rescheduled`

**Return Status:**
- `created`, `approved`, `in_transit`, `received`, `rejected`, `cancelled`

## User Roles

- `user` - Basic user
- `manager` - Can manage orders, shipments
- `admin` - Full access except user management
- `super_admin` - Complete access

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase with Next.js](https://firebase.google.com/docs/web/setup)
- [Cloud Functions](https://firebase.google.com/docs/functions)

---

**End of Guide**
