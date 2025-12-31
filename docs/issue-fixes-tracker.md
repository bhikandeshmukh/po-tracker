# PO Tracking System - Issue Fixes Tracker

**Created:** December 31, 2025  
**Status:** ✅ Complete (21/21 fixes applied)

---

## Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Zod v4 compatibility in `lib/types.js` | HIGH | ✅ FIXED |
| 2 | TypeScript errors in `lib/audit-logger.js` | HIGH | ✅ FIXED |
| 3 | Unused imports in `hooks/useRealtime.js` | LOW | ✅ FIXED |
| 4 | Rate limiter values (all 500) | MEDIUM | ✅ FIXED |
| 5 | Status naming inconsistency | LOW | ✅ FIXED |
| 6 | Frontend still references `partially_shipped` | MEDIUM | ✅ FIXED |
| 7 | Undefined `setPage` function in PO list | HIGH | ✅ FIXED |
| 8 | Missing transporter metrics update | LOW | ✅ FIXED |
| 9 | Appointments API uses offset pagination | MEDIUM | ✅ FIXED |
| 10 | Shipment variable shadowing | LOW | ✅ FIXED |
| 11 | PO detail API undefined `user` in catch | MEDIUM | ✅ FIXED |
| 12 | Shipment items property TypeScript error | LOW | ✅ FIXED |
| 13 | Vendor API warehouses TypeScript error | LOW | ✅ FIXED |
| 14 | Vendors API uses offset pagination | MEDIUM | ✅ FIXED |
| 15 | Returns API uses offset pagination | MEDIUM | ✅ FIXED |
| 16 | Users API uses offset pagination | MEDIUM | ✅ FIXED |
| 17 | Unused `auth` import in login.js | LOW | ✅ FIXED |
| 18 | Unused `req` parameter in getVendor | LOW | ✅ FIXED |
| 19 | Documentation: type-safety-guide.md old status | LOW | ✅ FIXED |
| 20 | Documentation: complete-database-guide.md schema | LOW | ✅ FIXED |
| 21 | Documentation: complete-database-guide.md status list | LOW | ✅ FIXED |

---

## Fix #1: Zod v4 Compatibility in `lib/types.js`

**Status:** ✅ FIXED  
**File:** `lib/types.js`

### Problem
- `Property 'errors' does not exist on type 'ZodError<any>'` - Zod v4 uses `issues` not `errors`
- `Property 'partial' does not exist on type 'ZodType'` - Type annotation issue
- Custom error properties `code` and `details` not typed

### Solution
- Changed `result.error.errors` → `result.error.issues`
- Added JSDoc type for `ValidationError`
- Added proper type annotations

### Changes Made
```javascript
// Before
result.error.errors.forEach(err => { ... })

// After  
const issues = result.error?.issues || [];
issues.forEach((issue) => { ... })
```

---

## Fix #2: TypeScript Errors in `lib/audit-logger.js`

**Status:** ✅ FIXED  
**File:** `lib/audit-logger.js`

### Problem
- Query type reassignment errors (9 instances)
- `let query = db.collection()` then reassigning with `.where()` causes type mismatch

### Solution
- Refactored to build constraints array first, then chain them
- Start with `orderBy()` to get Query type from the beginning
- Added JSDoc type cast for WhereFilterOp

### Changes Made
```javascript
// Before - type mismatch on reassignment
let query = db.collection('auditLogs');
if (filters.userId) {
    query = query.where('userId', '==', filters.userId);
}

// After - proper Query type from start
const baseCollection = db.collection('auditLogs');
const constraints = [];
if (filters.userId) {
    constraints.push({ field: 'userId', op: '==', value: filters.userId });
}
let query = baseCollection.orderBy('timestamp', 'desc');
for (const c of constraints) {
    query = query.where(c.field, /** @type {FirebaseFirestore.WhereFilterOp} */ (c.op), c.value);
}
```

---

## Fix #3: Unused Imports in `hooks/useRealtime.js`

**Status:** ✅ FIXED  
**File:** `hooks/useRealtime.js`

### Problem
- `useCallback`, `useRef`, `startAfter`, `getDocs` imported but never used

### Solution
- Removed unused imports

### Changes Made
```javascript
// Before
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, startAfter, getDocs } from 'firebase/firestore';

// After
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
```

---

## Fix #4: Rate Limiter Values

**Status:** ✅ FIXED  
**File:** `lib/rate-limiter.js`

### Problem
- All rate limiters set to `max: 500` (testing values)
- Not suitable for production

### Solution
- Set production-appropriate values for each limiter type

### Changes Made
| Limiter | Before | After |
|---------|--------|-------|
| authLimiter | 500/15min | 20/15min |
| strictRateLimiter | 500/15min | 10/15min |
| standardRateLimiter | 500/1min | 100/1min |
| lenientRateLimiter | 500/1min | 300/1min |
| createOperationLimiter | 500/1min | 20/1min |
| bulkOperationLimiter | 500/5min | 5/5min |

---

## Fix #5: Status Naming Inconsistency

**Status:** ✅ FIXED  
**Files:** `lib/validation-schemas.js`, `lib/types.js`, `lib/po-helpers.js`, `__tests__/lib/validation-schemas.test.js`, `__tests__/lib/types.test.js`

### Problem
- `partial_sent` vs `partially_shipped` used inconsistently
- Confusing for developers and UI

### Solution
- Standardized on `partial_sent` as the canonical status
- Removed `partially_shipped` from STATUS_TRANSITIONS and Zod schema
- Updated all references in po-helpers.js and metrics queries
- Updated test files to match

### Changes Made
- `lib/validation-schemas.js`: Removed `partially_shipped` from STATUS_TRANSITIONS, kept only `partial_sent`
- `lib/types.js`: Removed `partially_shipped` from PurchaseOrderSchema status enum
- `lib/po-helpers.js`: Changed `partially_shipped` → `partial_sent` in auto-status logic
- Test files updated to use `partial_sent`

### Status Flow (Standardized)
```
draft → submitted → approved → partial_sent → fully_shipped → completed
                            ↘ cancelled     ↘ partial_completed
```

---

---

## Fix #6: Frontend Still References `partially_shipped`

**Status:** ✅ FIXED  
**File:** `pages/purchase-orders/index.js`

### Problem
- `statusColors` and `statusIcons` objects still had `partially_shipped` key
- Inconsistent with backend standardization on `partial_sent`

### Solution
- Removed `partially_shipped` from statusColors
- Changed `partially_shipped` to `partial_sent` in statusIcons

---

## Fix #7: Undefined `setPage` Function in PO List

**Status:** ✅ FIXED  
**File:** `pages/purchase-orders/index.js`

### Problem
- `handleSearch` called `setPage(1)` but `setPage` was never defined
- Would cause runtime error when searching

### Solution
- Replaced `setPage(1)` with cursor reset logic: `setPrevCursors([]); setNextCursor(null);`

---

## Fix #8: Missing Transporter Metrics Update

**Status:** ✅ FIXED  
**File:** `pages/api/transporters/index.js`

### Problem
- Creating a transporter didn't update `totalTransporters` metric
- Dashboard metrics would be inaccurate

### Solution
- Added `incrementMetric('totalTransporters', 1)` after transporter creation

---

## Fix #9: Appointments API Uses Offset Pagination

**Status:** ✅ FIXED  
**File:** `pages/api/appointments/index.js`

### Problem
- Used `offset(skip)` which is inefficient for large datasets
- Firestore offset scans all documents up to the offset point

### Solution
- Converted to cursor-based pagination using `startAfter(lastDoc)`
- Returns `nextCursor` instead of page numbers
- More efficient and consistent with other APIs

---

## Fix #10: Shipment Variable Shadowing

**Status:** ✅ FIXED  
**File:** `pages/api/shipments/[shipmentId].js`

### Problem
- `shipmentData` was redeclared multiple times in `updateShipment` function
- Could cause confusion and potential bugs

### Solution
- Removed redundant `const shipmentData = shipmentDoc.data()` declarations
- Reused the existing `shipmentData` variable from the top of the function

---

## Fix #11: PO Detail API Undefined `user` in Catch

**Status:** ✅ FIXED  
**File:** `pages/api/purchase-orders/[poId]/index.js`

### Problem
- `user` was declared with `const` inside try block
- Catch block referenced `user?.uid` but `user` was out of scope

### Solution
- Changed to `let user = null` before try block
- Assigned value inside try: `user = await verifyAuth(req)`

---

## Fix #12: Shipment Items Property TypeScript Error

**Status:** ✅ FIXED  
**File:** `pages/api/shipments/[shipmentId].js`

### Problem
- TypeScript error: `Property 'items' does not exist on type`
- Object literal didn't include `items` property before assignment

### Solution
- Added `items: []` to initial object literal
- TypeScript now knows the property exists

---

## Fix #13: Vendor API Warehouses TypeScript Error

**Status:** ✅ FIXED  
**File:** `pages/api/vendors/[vendorId].js`

### Problem
- TypeScript error: `Property 'warehouses' does not exist on type`
- Object literal didn't include `warehouses` property before assignment

### Solution
- Added `warehouses: []` to initial object literal

---

## Fix #14: Vendors API Uses Offset Pagination

**Status:** ✅ FIXED  
**File:** `pages/api/vendors/index.js`

### Problem
- Used `offset(skip)` which is inefficient for large datasets
- Firestore offset scans all documents up to the offset point

### Solution
- Converted to cursor-based pagination using `startAfter(lastDoc)`
- Returns `nextCursor` instead of page numbers
- Search filter applied in memory after fetch

---

## Fix #15: Returns API Uses Offset Pagination

**Status:** ✅ FIXED  
**File:** `pages/api/returns/index.js`

### Problem
- Used `offset(skip)` which is inefficient
- Multiple filters could require composite indexes

### Solution
- Converted to cursor-based pagination
- Apply single filter to query, additional filters in memory
- Added proper timestamp conversion for dates

---

## Fix #16: Users API Uses Offset Pagination

**Status:** ✅ FIXED  
**File:** `pages/api/users/index.js`

### Problem
- Used `offset(skip)` pagination
- Inefficient for large user lists

### Solution
- Converted to cursor-based pagination
- Added proper timestamp conversion
- `isActive` filter applied in memory to avoid composite index

---

## Fix #17: Unused `auth` Import in Login.js

**Status:** ✅ FIXED  
**File:** `pages/api/auth/login.js`

### Problem
- `auth` was imported from firebase-admin but never used
- Dead import

### Solution
- Removed `auth` from import statement

---

## Fix #18: Unused `req` Parameter in getVendor

**Status:** ✅ FIXED  
**File:** `pages/api/vendors/[vendorId].js`

### Problem
- `req` parameter was passed to `getVendor` but never used
- TypeScript hint about unused parameter

### Solution
- Renamed to `_req` to indicate intentionally unused

---


---

## Fix #19: Documentation - type-safety-guide.md Old Status

**Status:** ✅ FIXED  
**File:** `docs/type-safety-guide.md`

### Problem
- Documentation still referenced `partially_shipped` in the Zod schema example
- Inconsistent with code standardization on `partial_sent`

### Solution
- Removed `partially_shipped` from the status enum example
- Updated to match actual code implementation

---

## Fix #20: Documentation - complete-database-guide.md Schema

**Status:** ✅ FIXED  
**File:** `docs/complete-database-guide.md`

### Problem
- PO schema example showed old status values
- Missing `partial_sent`, `partial_completed`, `completed` statuses

### Solution
- Updated status field to: `"draft" | "submitted" | "approved" | "partial_sent" | "fully_shipped" | "partial_completed" | "completed" | "cancelled"`

---

## Fix #21: Documentation - complete-database-guide.md Status List

**Status:** ✅ FIXED  
**File:** `docs/complete-database-guide.md`

### Problem
- Status Values section had outdated PO status list
- Missing `partial_sent`, `partial_completed`, `completed`

### Solution
- Updated PO Status list to include all valid statuses

---

## Final Verification

All frontend pages and API routes have been checked:

### Frontend Pages (No Issues Found)
- `pages/appointments/index.js` ✅
- `pages/purchase-orders/index.js` ✅
- `pages/purchase-orders/[poId].js` ✅
- `pages/shipments/index.js` ✅
- `pages/shipments/[shipmentId].js` ✅
- `pages/returns/index.js` ✅
- `pages/vendors/index.js` ✅
- `pages/transporters/index.js` ✅
- `pages/dashboard.js` ✅

### API Routes (No Issues Found)
- `pages/api/dashboard/metrics.js` ✅
- `pages/api/search.js` ✅
- `pages/api/health.js` ✅

### Libraries (All Fixed)
- `lib/types.js` ✅
- `lib/audit-logger.js` ✅
- `lib/rate-limiter.js` ✅
- `lib/validation-schemas.js` ✅
- `lib/po-helpers.js` ✅
- `hooks/useRealtime.js` ✅

### Documentation (All Updated)
- `docs/type-safety-guide.md` ✅
- `docs/complete-database-guide.md` ✅
