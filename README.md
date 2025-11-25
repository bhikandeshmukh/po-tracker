# Purchase Order Tracking System

A comprehensive Purchase Order tracking and management system built with Next.js and Firebase Firestore.

## Features

- Purchase Order Management with automatic status updates
- Vendor & Warehouse Management
- Transporter Management
- Shipment Tracking with Delivery Appointments
- Return Order Management
- Dashboard with Real-time Metrics
- Global Search across all entities
- Email Generation for Appointments
- PDF Export for Appointments
- Activity Logging & Audit Trail
- Role-based Access Control
- Excel Import/Export

## Tech Stack

- **Frontend:** Next.js 15, React 18, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Firebase Firestore
- **Authentication:** Firebase Authentication
- **PDF Generation:** jsPDF
- **Icons:** Lucide React

## Project Structure

```
├── components/               # React components
│   ├── Appointments/        # Appointment components
│   ├── Common/              # Shared components
│   ├── Dashboard/           # Dashboard components
│   ├── Layout/              # Layout & navigation
│   ├── PurchaseOrders/      # PO components
│   ├── Shipments/           # Shipment components
│   ├── Transporters/        # Transporter components
│   └── Vendors/             # Vendor components
│
├── lib/                     # Shared libraries
│   ├── firebase.js          # Firebase client config
│   ├── firebase-admin.js    # Firebase Admin SDK
│   ├── api-client.js        # API client wrapper
│   └── auth-middleware.js   # Authentication middleware
│
├── pages/                   # Next.js pages
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication
│   │   ├── appointments/   # Appointments API
│   │   ├── purchase-orders/ # PO API
│   │   ├── shipments/      # Shipments API
│   │   ├── vendors/        # Vendors API
│   │   ├── transporters/   # Transporters API
│   │   └── search/         # Global search API
│   ├── appointments/        # Appointment pages
│   ├── purchase-orders/     # PO pages
│   ├── shipments/          # Shipment pages
│   └── dashboard.js        # Dashboard page
│
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── .env.local              # Environment variables
└── package.json            # Dependencies
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Email/Password Authentication
4. Deploy Firestore rules and indexes:
   ```bash
   npm run deploy:firestore
   ```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key Features

### Purchase Order Management
- Create and manage purchase orders with multiple items
- Automatic status updates based on shipment progress
- Track quantities: Total, Sent, Pending
- Filter by status, vendor, warehouse
- Excel import/export

### Shipment & Appointment Management
- Create shipments linked to purchase orders
- Schedule delivery appointments
- Auto-sync quantities between shipments and appointments
- LR Docket Number tracking
- Email generation for transporters
- PDF export with formatted details

### Email & PDF Features
- **Email Generation:** Professional HTML emails with bold labels
- **Gmail Integration:** Direct compose with pre-filled content
- **PDF Export:** Colorful formatted PDFs with appointment details
- **Vendor Information:** Automatic vendor name in subject line

### Global Search
- Search across all entities (POs, Shipments, Appointments, Vendors, Transporters)
- Real-time search results
- Quick navigation to details

### Dashboard
- Real-time metrics and statistics
- Recent activity feed
- Quick access to all modules

## Database Schema

### Main Collections

- **users** - User accounts with role-based access
- **vendors** - Vendor information with warehouses sub-collection
- **transporters** - Transporter details
- **purchaseOrders** - PO records with items sub-collection
- **shipments** - Shipment tracking with items sub-collection
- **appointments** - Delivery appointments with scheduling
- **returnOrders** - Return orders with items sub-collection

### Activity & Logs

- **poActivityLogs** - Purchase order activity tracking
- **auditLogs** - System-wide audit trail
- **recentActivities** - Recent activity feed for dashboard
- **dashboardMetrics** - Cached dashboard statistics

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Purchase Orders
- `GET /api/purchase-orders` - List all POs with filters
- `POST /api/purchase-orders` - Create new PO
- `GET /api/purchase-orders/[poId]` - Get PO details
- `PUT /api/purchase-orders/[poId]` - Update PO
- `DELETE /api/purchase-orders/[poId]` - Delete PO

### Shipments
- `GET /api/shipments` - List all shipments
- `POST /api/shipments` - Create shipment (auto-updates PO status)
- `GET /api/shipments/[shipmentId]` - Get shipment details
- `PUT /api/shipments/[shipmentId]` - Update shipment
- `POST /api/shipments/[shipmentId]/rename` - Rename shipment ID

### Appointments
- `GET /api/appointments` - List all appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/[appointmentId]` - Get appointment details
- `PUT /api/appointments/[appointmentId]` - Update appointment (syncs with shipment)

### Search
- `GET /api/search?q=query` - Global search across all entities

### Vendors & Transporters
- `GET /api/vendors` - List vendors
- `POST /api/vendors` - Create vendor
- `GET /api/transporters` - List transporters
- `POST /api/transporters` - Create transporter

## User Roles & Permissions

- **user** - View data, basic operations
- **manager** - Create/approve POs, manage vendors/transporters
- **admin** - All manager permissions + delete operations + user management
- **super_admin** - Full system access

## Security

- Firebase Authentication with email/password
- Role-based access control (RBAC)
- Protected API routes with token verification
- Firestore security rules
- Audit logging for all operations

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Deploy Firestore rules and indexes
npm run deploy:firestore

# Run tests
npm test
```

## Recent Updates

### Appointment Features
- ✅ Email generation with HTML formatting
- ✅ Gmail integration with pre-filled compose
- ✅ PDF export with colors and professional layout
- ✅ Vendor name in email subject
- ✅ Bold labels in email body
- ✅ Auto-sync quantities with shipments

### Purchase Order Enhancements
- ✅ Automatic status updates (partial_sent, partial_completed, completed)
- ✅ Warehouse name display in PO list
- ✅ Separate quantity columns (Total/Sent/Pending)
- ✅ Enhanced filtering and sorting

### Shipment Management
- ✅ Shipment ID rename functionality
- ✅ Auto-fix for data inconsistencies
- ✅ Quantity display in appointment cards
- ✅ LR Docket Number tracking

### Global Features
- ✅ Global search across all entities
- ✅ Excel import/export
- ✅ Activity logging
- ✅ Real-time dashboard metrics

## Deployment

### Firestore Configuration

```bash
# Deploy rules and indexes
npm run deploy:firestore
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Setup

Ensure all environment variables are set in production:
- Firebase credentials
- Admin SDK credentials
- API keys

## Documentation

Additional documentation available in the `docs/` folder:
- Complete Database Guide
- API Documentation
- Authentication Guide
- Deployment Guide

## License

Private - Internal Use Only
