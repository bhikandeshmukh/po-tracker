# Purchase Order Tracking System

A comprehensive Purchase Order tracking and management system built with Next.js and Firebase Firestore.

## Features

- Purchase Order Management with automatic status updates
- Vendor & Warehouse Management
- Transporter Management
- Shipment Tracking with Delivery Appointments
- Return Order Management
- Dashboard with Real-time Metrics
- Global Search across all entities (scalable token-based indexing)
- Email Generation for Appointments
- PDF Export for Appointments
- Activity Logging & Audit Trail
- Role-based Access Control
- Excel Import/Export
- Real-time Updates via Firestore subscriptions
- Comprehensive Error Handling with Error Boundaries
- Type-safe validation with Zod schemas

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| Validation | Joi, Zod |
| PDF Generation | jsPDF |
| Excel | ExcelJS, xlsx |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Jest, React Testing Library |

## Project Structure

```
├── components/               # React components
│   ├── Appointments/        # Appointment components
│   ├── Common/              # Shared components (ErrorBoundary, LoadingSkeleton)
│   ├── Dashboard/           # Dashboard components (StatCard, Charts)
│   ├── Layout/              # Layout & navigation
│   ├── PurchaseOrders/      # PO components
│   ├── Returns/             # Return order components
│   ├── Shipments/           # Shipment components
│   ├── Transporters/        # Transporter components
│   └── Vendors/             # Vendor components
│
├── hooks/                   # Custom React hooks
│   ├── usePORealtime.js     # Real-time PO subscriptions
│   └── useRealtime.js       # Generic real-time hooks for all entities
│
├── lib/                     # Shared libraries
│   ├── api-client.js        # API client with caching & deduplication
│   ├── auth-client.js       # Frontend authentication
│   ├── auth-middleware.js   # API route protection
│   ├── cache.js             # In-memory cache with TTL
│   ├── firebase.js          # Firebase client config
│   ├── firebase-admin.js    # Firebase Admin SDK
│   ├── optimistic-updates.js # Optimistic UI utilities
│   ├── request-deduplicator.js # Prevent duplicate requests
│   ├── search-service.js    # Scalable search with indexing
│   ├── types.js             # Zod schemas & type validation
│   ├── validation-schemas.js # Joi validation schemas
│   └── ...                  # Other utilities
│
├── pages/                   # Next.js pages
│   ├── api/                 # API routes
│   │   ├── admin/          # Admin utilities
│   │   ├── auth/           # Authentication
│   │   ├── appointments/   # Appointments API
│   │   ├── dashboard/      # Dashboard metrics
│   │   ├── purchase-orders/ # PO API
│   │   ├── returns/        # Returns API
│   │   ├── shipments/      # Shipments API
│   │   ├── transporters/   # Transporters API
│   │   ├── users/          # Users API
│   │   ├── vendors/        # Vendors API
│   │   ├── health.js       # Health check
│   │   └── search.js       # Global search
│   └── ...                 # Page components
│
├── __tests__/              # Test files
│   ├── api/                # API route tests
│   ├── components/         # Component tests
│   └── lib/                # Library tests
│
├── docs/                   # Documentation
├── scripts/                # Utility scripts
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
# Frontend Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend Firebase Admin Configuration
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
- Track quantities: Total, Sent, Pending, Delivered
- Filter by status, vendor, warehouse
- Excel import/export with validation

### Shipment & Appointment Management
- Create shipments linked to purchase orders
- Schedule delivery appointments
- Auto-sync quantities between shipments and appointments
- LR Docket Number tracking
- Email generation for transporters
- PDF export with formatted details

### Real-time Updates
Comprehensive real-time hooks for all entities:
```javascript
import { 
  useShipmentList, 
  useAppointmentList,
  useVendorList,
  useDashboardMetrics 
} from '../hooks/useRealtime';

// Real-time shipment list
const { shipments, loading } = useShipmentList({ status: 'in_transit' });

// Real-time dashboard metrics
const { metrics } = useDashboardMetrics();
```

### Scalable Search
Token-based search indexing for efficient queries:
- Prefix search support
- Multi-entity search (POs, Vendors, Shipments, etc.)
- Relevance-based ranking
- Admin endpoint to rebuild index

### Error Handling
Multi-level error boundaries:
- App-level error boundary in `_app.js`
- Page-level error boundary in `Layout.js`
- Features: Try Again, Go to Dashboard, Error ID tracking
- Dev mode: Detailed error stack traces

### Type Safety
Zod schemas for runtime validation:
```javascript
import { validate, PurchaseOrderSchema } from '../lib/types';

const result = validate(PurchaseOrderSchema, data);
if (!result.success) {
  console.error(result.errors);
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Purchase Orders
- `GET /api/purchase-orders` - List POs with filters & pagination
- `POST /api/purchase-orders` - Create new PO
- `GET /api/purchase-orders/[poId]` - Get PO details
- `PUT /api/purchase-orders/[poId]` - Update PO
- `DELETE /api/purchase-orders/[poId]` - Delete PO
- `POST /api/purchase-orders/[poId]/approve` - Approve PO
- `POST /api/purchase-orders/[poId]/cancel` - Cancel PO

### Shipments
- `GET /api/shipments` - List shipments
- `POST /api/shipments` - Create shipment (auto-creates appointment)
- `GET /api/shipments/[shipmentId]` - Get shipment details
- `PUT /api/shipments/[shipmentId]` - Update shipment
- `PUT /api/shipments/[shipmentId]/status` - Update status

### Appointments
- `GET /api/appointments` - List appointments
- `GET /api/appointments/[appointmentId]` - Get appointment details
- `PUT /api/appointments/[appointmentId]` - Update appointment

### Search
- `GET /api/search?q=query` - Global search
- `GET /api/search?q=query&types=purchaseOrder,vendor` - Filtered search

### Admin
- `POST /api/admin/rebuild-search-index` - Rebuild search index
- `POST /api/admin/sync-appointments` - Sync appointment data
- `POST /api/admin/fix-po-quantities` - Fix PO quantity inconsistencies

### Health
- `GET /api/health` - Health check with service status

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| `user` | View data, basic operations |
| `manager` | Create/approve POs, manage vendors/transporters |
| `admin` | All manager permissions + delete operations + user management |
| `super_admin` | Full system access |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Coverage:**
- 12 test suites
- 168 tests
- Covers: API routes, components, utilities

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

# Run linter
npm run lint

# Run tests
npm test

# Deploy Firestore rules and indexes
npm run deploy:firestore

# Setup admin user
npm run setup:admin
```

## Security

- Firebase Authentication with email/password
- Role-based access control (RBAC)
- Protected API routes with token verification
- Firestore security rules
- Input sanitization (XSS protection)
- Rate limiting on API routes
- Audit logging for all operations

## Performance Optimizations

| Feature | Implementation |
|---------|----------------|
| Request Caching | In-memory cache with 5-min TTL |
| Request Deduplication | Prevents parallel duplicate requests |
| Optimistic Updates | Instant UI feedback with rollback |
| Cursor Pagination | Efficient Firestore queries |
| Offline Support | IndexedDB persistence via Firestore |
| Metrics Caching | Pre-computed dashboard metrics |

## Documentation

Additional documentation available in the `docs/` folder:
- [API Documentation](docs/api-documentation.md) - Complete API reference
- [Authentication Guide](docs/authentication-guide.md) - Auth implementation details
- [Database Guide](docs/complete-database-guide.md) - Schema & Firestore setup
- [Deployment Guide](docs/deployment-guide.md) - Production deployment
- [Testing Guide](docs/testing-guide.md) - Testing patterns & coverage
- [Real-time Hooks Guide](docs/realtime-hooks-guide.md) - Using real-time subscriptions
- [Type Safety Guide](docs/type-safety-guide.md) - Zod schemas & validation

## Recent Updates

### v1.1.0 - Testing & Reliability
- ✅ Comprehensive test suite (168 tests)
- ✅ Enhanced ErrorBoundary with reset & error tracking
- ✅ Scalable search with token-based indexing
- ✅ Real-time hooks for all entities
- ✅ Zod schemas for type-safe validation
- ✅ JSConfig for IDE support

### v1.0.0 - Initial Release
- ✅ Purchase Order management
- ✅ Shipment & Appointment tracking
- ✅ Vendor & Transporter management
- ✅ Dashboard with metrics
- ✅ Global search
- ✅ Excel import/export
- ✅ PDF export
- ✅ Audit logging

## License

Private - Internal Use Only
