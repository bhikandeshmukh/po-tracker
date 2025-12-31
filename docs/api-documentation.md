# API Documentation - Purchase Order Tracking System

Complete API endpoints for frontend-backend communication with Firebase.

---

## Table of Contents

1. [Setup](#setup)
2. [Authentication APIs](#authentication-apis)
3. [User APIs](#user-apis)
4. [Vendor APIs](#vendor-apis)
5. [Transporter APIs](#transporter-apis)
6. [Purchase Order APIs](#purchase-order-apis)
7. [Shipment APIs](#shipment-apis)
8. [Appointment APIs](#appointment-apis)
9. [Return Order APIs](#return-order-apis)
10. [Dashboard APIs](#dashboard-apis)
11. [Error Handling](#error-handling)

---

## Setup

### API Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Authentication
All protected routes require Firebase ID token in headers:
```javascript
headers: {
  'Authorization': 'Bearer <firebase-id-token>'
}
```

---

## Authentication APIs

### 1. Login
**POST** `/api/auth/login`

```javascript
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "uid": "firebase-uid",
      "email": "user@example.com",
      "role": "manager"
    },
    "token": "firebase-id-token"
  }
}
```

### 2. Register
**POST** `/api/auth/register`

```javascript
// Request
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+91-9876543210",
  "role": "user"
}

// Response
{
  "success": true,
  "data": {
    "userId": "johndoe",
    "email": "newuser@example.com"
  }
}
```

### 3. Logout
**POST** `/api/auth/logout`

```javascript
// Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User APIs

### 1. Get All Users
**GET** `/api/users`

**Query Params:**
- `role` (optional): Filter by role
- `isActive` (optional): Filter by active status
- `limit` (optional): Number of results
- `page` (optional): Page number

```javascript
// Response
{
  "success": true,
  "data": [
    {
      "userId": "johndoe",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "manager",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### 2. Get User by ID
**GET** `/api/users/:userId`

```javascript
// Response
{
  "success": true,
  "data": {
    "userId": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "phone": "+91-9876543210",
    "role": "manager",
    "isActive": true,
    "permissions": { ... }
  }
}
```

### 3. Create User
**POST** `/api/users`

```javascript
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+91-9876543211",
  "role": "user"
}

// Response
{
  "success": true,
  "data": {
    "userId": "janesmith",
    "message": "User created successfully"
  }
}
```

### 4. Update User
**PUT** `/api/users/:userId`

```javascript
// Request
{
  "phone": "+91-9876543299",
  "isActive": false
}

// Response
{
  "success": true,
  "message": "User updated successfully"
}
```

### 5. Delete User
**DELETE** `/api/users/:userId`

```javascript
// Response
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Vendor APIs

### 1. Get All Vendors
**GET** `/api/vendors`

**Query Params:**
- `isActive` (optional)
- `search` (optional): Search by name
- `limit`, `page`

```javascript
// Response
{
  "success": true,
  "data": [
    {
      "vendorId": "abc-traders",
      "vendorName": "ABC Traders",
      "contactPerson": "Rajesh Kumar",
      "email": "rajesh@abc.com",
      "phone": "+91-9876543210",
      "isActive": true,
      "totalOrders": 45,
      "rating": 4.5
    }
  ]
}
```

### 2. Get Vendor by ID
**GET** `/api/vendors/:vendorId`

```javascript
// Response
{
  "success": true,
  "data": {
    "vendorId": "abc-traders",
    "vendorCode": "VEN-001",
    "vendorName": "ABC Traders",
    "contactPerson": "Rajesh Kumar",
    "email": "rajesh@abc.com",
    "phone": "+91-9876543210",
    "address": { ... },
    "gstNumber": "27AABCU9603R1ZM",
    "warehouses": [
      {
        "warehouseId": "main-warehouse",
        "warehouseName": "Main Warehouse",
        "address": { ... }
      }
    ]
  }
}
```

### 3. Create Vendor
**POST** `/api/vendors`

```javascript
// Request
{
  "vendorName": "XYZ Suppliers",
  "contactPerson": "Amit Shah",
  "email": "amit@xyz.com",
  "phone": "+91-9876543212",
  "address": {
    "street": "123 Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "gstNumber": "27XXXXXXXXXXXXX",
  "panNumber": "XXXXX9999X",
  "paymentTerms": "30 days"
}

// Response
{
  "success": true,
  "data": {
    "vendorId": "xyz-suppliers",
    "message": "Vendor created successfully"
  }
}
```

### 4. Update Vendor
**PUT** `/api/vendors/:vendorId`

### 5. Delete Vendor
**DELETE** `/api/vendors/:vendorId`

### 6. Get Vendor Warehouses
**GET** `/api/vendors/:vendorId/warehouses`

### 7. Add Warehouse
**POST** `/api/vendors/:vendorId/warehouses`

```javascript
// Request
{
  "warehouseName": "Delhi Warehouse",
  "address": { ... },
  "contactPerson": "Suresh",
  "phone": "+91-9876543213",
  "email": "warehouse@xyz.com"
}
```

---

## Transporter APIs

### 1. Get All Transporters
**GET** `/api/transporters`

### 2. Get Transporter by ID
**GET** `/api/transporters/:transporterId`

### 3. Create Transporter
**POST** `/api/transporters`

```javascript
// Request
{
  "transporterName": "Fast Logistics",
  "contactPerson": "Ravi Kumar",
  "email": "ravi@fast.com",
  "phone": "+91-9876543214",
  "address": { ... },
  "gstNumber": "07XXXXXXXXXXXXX",
  "vehicleTypes": ["Truck", "Tempo"]
}
```

### 4. Update Transporter
**PUT** `/api/transporters/:transporterId`

### 5. Delete Transporter
**DELETE** `/api/transporters/:transporterId`

---

## Purchase Order APIs

### 1. Get All Purchase Orders
**GET** `/api/purchase-orders`

**Query Params:**
- `status`: Filter by status
- `vendorId`: Filter by vendor
- `startDate`, `endDate`: Date range
- `search`: Search by PO number
- `limit`, `page`

```javascript
// Response
{
  "success": true,
  "data": [
    {
      "poId": "PO-2024-0001",
      "poNumber": "PO-2024-0001",
      "vendorName": "ABC Traders",
      "status": "approved",
      "poDate": "2024-11-23T10:00:00Z",
      "grandTotal": 56168,
      "totalItems": 2,
      "shippedQuantity": 0,
      "pendingQuantity": 150
    }
  ],
  "pagination": { ... }
}
```

### 2. Get PO by ID
**GET** `/api/purchase-orders/:poId`

```javascript
// Response
{
  "success": true,
  "data": {
    "poId": "PO-2024-0001",
    "poNumber": "PO-2024-0001",
    "vendorId": "abc-traders",
    "vendorName": "ABC Traders",
    "vendorWarehouseId": "main-warehouse",
    "vendorWarehouseName": "Main Warehouse",
    "status": "approved",
    "poDate": "2024-11-23",
    "expectedDeliveryDate": "2024-11-30",
    "totalAmount": 47600,
    "totalGST": 8568,
    "grandTotal": 56168,
    "items": [
      {
        "itemId": "SKU123",
        "sku": "SKU123",
        "itemName": "Widget A",
        "poQuantity": 100,
        "unitPrice": 400,
        "mrp": 500,
        "gstRate": 18,
        "totalAmount": 47200
      }
    ]
  }
}
```

### 3. Create Purchase Order
**POST** `/api/purchase-orders`

```javascript
// Request
{
  "poNumber": "PO-2024-0002",
  "vendorId": "abc-traders",
  "vendorWarehouseId": "main-warehouse",
  "poDate": "2024-11-23",
  "expectedDeliveryDate": "2024-11-30",
  "notes": "Urgent order",
  "termsAndConditions": "Payment within 30 days",
  "items": [
    {
      "sku": "SKU123",
      "barcode": "1234567890123",
      "itemName": "Widget A",
      "itemDescription": "Premium widget",
      "poQuantity": 100,
      "unitPrice": 400,
      "mrp": 500,
      "gstRate": 18,
      "unit": "pcs",
      "hsnCode": "8501"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "poId": "PO-2024-0002",
    "poNumber": "PO-2024-0002",
    "grandTotal": 47200,
    "message": "Purchase order created successfully"
  }
}
```

### 4. Update Purchase Order
**PUT** `/api/purchase-orders/:poId`

### 5. Approve Purchase Order
**POST** `/api/purchase-orders/:poId/approve`

```javascript
// Request
{
  "approvedBy": "adminuser",
  "notes": "Approved for processing"
}

// Response
{
  "success": true,
  "message": "Purchase order approved successfully"
}
```

### 6. Cancel Purchase Order
**POST** `/api/purchase-orders/:poId/cancel`

### 7. Get PO Items
**GET** `/api/purchase-orders/:poId/items`

### 8. Add Item to PO
**POST** `/api/purchase-orders/:poId/items`

### 9. Update PO Item
**PUT** `/api/purchase-orders/:poId/items/:itemId`

### 10. Delete PO Item
**DELETE** `/api/purchase-orders/:poId/items/:itemId`

### 11. Get PO Activity Log
**GET** `/api/purchase-orders/:poId/activity-log`

```javascript
// Response
{
  "success": true,
  "data": {
    "poId": "PO-2024-0001",
    "actions": [
      {
        "actionId": "1732361400000",
        "action": "created",
        "timestamp": "2024-11-23T10:00:00Z",
        "performedBy": "johndoe",
        "performedByName": "John Doe",
        "performedByRole": "manager"
      },
      {
        "actionId": "1732361500000",
        "action": "approved",
        "timestamp": "2024-11-23T11:00:00Z",
        "performedBy": "adminuser",
        "performedByName": "Admin User",
        "changes": [
          {
            "field": "status",
            "oldValue": "draft",
            "newValue": "approved"
          }
        ]
      }
    ]
  }
}
```

---

## Shipment APIs

### 1. Get All Shipments
**GET** `/api/shipments`

**Query Params:**
- `poId`: Filter by PO
- `status`: Filter by status
- `transporterId`: Filter by transporter

### 2. Get Shipment by ID
**GET** `/api/shipments/:shipmentId`

### 3. Create Shipment
**POST** `/api/shipments`

```javascript
// Request
{
  "appointmentNumber": "APT-2024-0001",
  "poId": "PO-2024-0001",
  "transporterId": "fast-logistics",
  "shipmentDate": "2024-11-25",
  "expectedDeliveryDate": "2024-11-27",
  "shippingAddress": {
    "street": "456 Delivery Street",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "country": "India"
  },
  "items": [
    {
      "sku": "SKU123",
      "shippedQuantity": 50
    }
  ],
  "notes": "Handle with care"
}

// Response
{
  "success": true,
  "data": {
    "shipmentId": "APT-2024-0001",
    "appointmentId": "APT-2024-0001",
    "message": "Shipment and appointment created successfully"
  }
}
```

### 4. Update Shipment Status
**PUT** `/api/shipments/:shipmentId/status`

```javascript
// Request
{
  "status": "dispatched",
  "notes": "Dispatched from warehouse",
  "trackingNumber": "TRK123456789",
  "vehicleNumber": "DL-01-AB-1234",
  "driverName": "Ram Kumar",
  "driverPhone": "+91-9876543215"
}
```

### 5. Mark Shipment Delivered
**POST** `/api/shipments/:shipmentId/deliver`

```javascript
// Request
{
  "deliveredBy": "johndoe",
  "actualDeliveryDate": "2024-11-26T14:30:00Z",
  "receivedQuantities": {
    "SKU123": {
      "received": 50,
      "damaged": 0
    }
  },
  "notes": "Delivered in good condition"
}
```

---

## Appointment APIs

### 1. Get All Appointments
**GET** `/api/appointments`

**Query Params:**
- `date`: Filter by scheduled date
- `status`: Filter by status
- `poId`: Filter by PO

### 2. Get Appointment by ID
**GET** `/api/appointments/:appointmentId`

### 3. Update Appointment
**PUT** `/api/appointments/:appointmentId`

### 4. Reschedule Appointment
**POST** `/api/appointments/:appointmentId/reschedule`

```javascript
// Request
{
  "scheduledDate": "2024-11-28",
  "scheduledTimeSlot": "12:00-15:00",
  "rescheduledReason": "Customer request",
  "rescheduledBy": "johndoe"
}
```

### 5. Complete Appointment
**POST** `/api/appointments/:appointmentId/complete`

```javascript
// Request
{
  "completedBy": "johndoe",
  "notes": "Delivery completed successfully"
}
```

---

## Return Order APIs

### 1. Get All Returns
**GET** `/api/returns`

### 2. Get Return by ID
**GET** `/api/returns/:returnId`

### 3. Create Return Order
**POST** `/api/returns`

```javascript
// Request
{
  "returnNumber": "RO-2024-0001",
  "poId": "PO-2024-0001",
  "shipmentId": "APT-2024-0001",
  "returnType": "damaged",
  "returnReason": "Items received damaged",
  "returnDate": "2024-11-27",
  "transporterId": "fast-logistics",
  "items": [
    {
      "sku": "SKU123",
      "returnQuantity": 5,
      "condition": "damaged",
      "conditionNotes": "Packaging torn"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "returnId": "RO-2024-0001",
    "message": "Return order created successfully"
  }
}
```

### 4. Approve Return
**POST** `/api/returns/:returnId/approve`

### 5. Mark Return Received
**POST** `/api/returns/:returnId/receive`

```javascript
// Request
{
  "receivedBy": "adminuser",
  "actualReturnReceiptDate": "2024-11-28",
  "receivedQuantities": {
    "SKU123": {
      "received": 5,
      "condition": "damaged"
    }
  },
  "refundAmount": 2000,
  "notes": "Items inspected and accepted"
}
```

---

## Dashboard APIs

### 1. Get Dashboard Metrics
**GET** `/api/dashboard/metrics`

```javascript
// Response
{
  "success": true,
  "data": {
    "purchaseOrders": {
      "total": 156,
      "active": 45,
      "pendingApproval": 12,
      "totalAmount": 5625000,
      "thisMonthAmount": 1250000
    },
    "shipments": {
      "total": 89,
      "inTransit": 15,
      "delivered": 70,
      "pending": 4
    },
    "appointments": {
      "today": 5,
      "upcoming": 12,
      "completed": 82
    },
    "returns": {
      "total": 8,
      "pending": 3,
      "completed": 5,
      "totalAmount": 45000
    },
    "vendors": {
      "total": 25,
      "active": 22
    },
    "transporters": {
      "total": 10,
      "active": 9
    }
  }
}
```

### 2. Get Recent Activities
**GET** `/api/dashboard/recent-activities`

**Query Params:**
- `limit`: Number of activities (default: 10)
- `type`: Filter by activity type

```javascript
// Response
{
  "success": true,
  "data": [
    {
      "activityId": "PO_CREATED_PO-2024-0002",
      "type": "PO_CREATED",
      "title": "New Purchase Order",
      "description": "PO-2024-0002 created for ABC Traders",
      "timestamp": "2024-11-23T15:30:00Z",
      "userName": "John Doe"
    }
  ]
}
```

### 3. Get Statistics
**GET** `/api/dashboard/statistics`

**Query Params:**
- `period`: "week", "month", "year"
- `startDate`, `endDate`

```javascript
// Response
{
  "success": true,
  "data": {
    "poTrend": [
      { "date": "2024-11-01", "count": 12, "amount": 550000 },
      { "date": "2024-11-02", "count": 8, "amount": 320000 }
    ],
    "topVendors": [
      { "vendorName": "ABC Traders", "orderCount": 45, "totalAmount": 2500000 }
    ],
    "deliveryPerformance": {
      "onTime": 85,
      "delayed": 10,
      "pending": 5
    }
  }
}
```

---

## Error Handling

### Error Response Format

```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }  // Optional
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `DUPLICATE_ERROR` | 409 | Resource already exists |
| `SERVER_ERROR` | 500 | Internal server error |

### Example Error Responses

```javascript
// Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token required"
  }
}

// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Email is required",
      "phone": "Invalid phone number format"
    }
  }
}

// Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Purchase Order not found",
    "details": {
      "poId": "PO-2024-9999"
    }
  }
}
```

---

## Rate Limiting

- **Limit:** 100 requests per minute per IP
- **Header:** `X-RateLimit-Remaining` shows remaining requests

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```javascript
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

**End of API Documentation**


---

## Search APIs

### 1. Global Search
**GET** `/api/search`

Search across all entities with scalable token-based indexing.

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `types` (optional): Comma-separated entity types to search
- `limit` (optional): Maximum results (default: 20, max: 50)
- `offset` (optional): Pagination offset
- `useIndex` (optional): `true`, `false`, or `auto` (default: `auto`)

**Available Entity Types:**
- `purchaseOrder`
- `vendor`
- `appointment`
- `shipment`
- `transporter`
- `returnOrder`

```javascript
// Request
GET /api/search?q=abc&types=purchaseOrder,vendor&limit=10

// Response
{
  "success": true,
  "data": [
    {
      "type": "Purchase Order",
      "title": "PO-2024-0001",
      "subtitle": "ABC Traders - approved",
      "link": "/purchase-orders/PO-2024-0001",
      "entityType": "purchaseOrder",
      "entityId": "PO-2024-0001",
      "relevance": 0
    },
    {
      "type": "Vendor",
      "title": "ABC Traders",
      "subtitle": "VEN-001",
      "link": "/vendors/abc-traders",
      "entityType": "vendor",
      "entityId": "abc-traders",
      "relevance": 1
    }
  ],
  "total": 2,
  "hasMore": false,
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

**Search Features:**
- Prefix matching (searching "abc" matches "abcdef")
- Multi-word search (all words must match)
- Relevance ranking (exact matches first)
- Case-insensitive

---

## Admin APIs

### 1. Rebuild Search Index
**POST** `/api/admin/rebuild-search-index`

Rebuilds the search index for all or specified entity types. Requires admin role.

```javascript
// Request
{
  "entityTypes": ["purchaseOrder", "vendor"]  // Optional, defaults to all
}

// Response
{
  "success": true,
  "data": {
    "message": "Search index rebuilt successfully",
    "indexed": 156,
    "errors": 0
  }
}
```

### 2. Sync Appointments
**POST** `/api/admin/sync-appointments`

Synchronizes appointment data with shipments. Requires admin role.

```javascript
// Response
{
  "success": true,
  "data": {
    "synced": 45,
    "errors": 0
  }
}
```

### 3. Fix PO Quantities
**POST** `/api/admin/fix-po-quantities`

Recalculates and fixes PO quantity inconsistencies. Requires admin role.

```javascript
// Response
{
  "success": true,
  "data": {
    "fixed": 12,
    "errors": 0
  }
}
```

### 4. Sync PO Items
**POST** `/api/admin/sync-po-items`

Synchronizes PO item quantities with shipments. Requires admin role.

```javascript
// Response
{
  "success": true,
  "data": {
    "synced": 89,
    "errors": 0
  }
}
```

---

## Health Check API

### 1. Health Check
**GET** `/api/health`

Returns system health status. No authentication required.

```javascript
// Response
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "services": {
    "firestore": {
      "status": "connected",
      "latency": "45ms"
    },
    "api": {
      "status": "running",
      "version": "1.0.0"
    }
  },
  "environment": "production"
}
```

**Unhealthy Response (503):**
```javascript
{
  "success": false,
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Health check failed",
    "details": "Firestore connection timeout"
  }
}
```

---

## Real-time Subscriptions

For real-time data updates, use the Firestore client SDK directly with the provided hooks:

```javascript
import { usePOList, usePODetail } from '../hooks/usePORealtime';
import { useShipmentList, useDashboardMetrics } from '../hooks/useRealtime';

// Real-time PO list
const { orders, loading, error } = usePOList({ status: 'approved' });

// Real-time dashboard metrics
const { metrics } = useDashboardMetrics();
```

See [Real-time Hooks Guide](realtime-hooks-guide.md) for complete documentation.

---

## Type Validation

All API endpoints validate input using Zod schemas:

```javascript
import { validate, PurchaseOrderSchema } from '../lib/types';

// Validate before sending
const result = validate(PurchaseOrderSchema, data);
if (!result.success) {
  console.error(result.errors);
}
```

See [Type Safety Guide](type-safety-guide.md) for complete documentation.
