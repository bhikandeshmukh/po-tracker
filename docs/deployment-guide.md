# Deployment Guide - Production Setup

Complete guide for deploying the Purchase Order Tracking System to production.

---

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created
- Environment variables configured

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Configure Environment Variables

Create `.env.local` (or `.env.production` for production):

```bash
# Frontend Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Backend Firebase Admin Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

# API Configuration
NEXT_PUBLIC_API_URL=/api

# Logging
LOG_LEVEL=info
```

---

## Step 3: Deploy Firestore Rules and Indexes

### Option A: Using Script (Recommended)

**Windows:**
```bash
.\scripts\deploy-firestore.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy-firestore.sh
./scripts/deploy-firestore.sh
```

### Option B: Manual Deployment

```bash
# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Wait for indexes to build** (check Firebase Console → Firestore → Indexes)

---

## Step 4: Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

Ensure all tests pass before deploying.

---

## Step 5: Build for Production

```bash
npm run build
```

This will:
- Compile Next.js application
- Optimize assets
- Generate production build

---

## Step 6: Deploy to Vercel (Recommended)

### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Configure environment variables
4. Deploy

**Environment Variables to Set:**
- All variables from `.env.local`
- Set `NODE_ENV=production`

---

## Step 7: Verify Deployment

### Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "firestore": { "status": "connected" },
    "api": { "status": "running" }
  }
}
```

### Test Authentication

```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Step 8: Monitor Application

### Check Logs

**Vercel:**
```bash
vercel logs
```

**Local logs:**
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions

### Firebase Console

Monitor:
- Authentication usage
- Firestore reads/writes
- Security rule violations
- Index status

---

## Step 9: Setup Monitoring (Optional)

### Sentry Integration

```bash
npm install @sentry/nextjs
```

Create `sentry.client.config.js`:
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Firebase Analytics

Already configured in Firebase SDK.

---

## Production Checklist

### Security
- ✅ Firestore security rules deployed
- ✅ Environment variables secured
- ✅ Rate limiting enabled
- ✅ HTTPS enforced
- ✅ CORS configured

### Performance
- ✅ Firestore indexes created
- ✅ Caching enabled
- ✅ API responses optimized
- ✅ Build optimized

### Monitoring
- ✅ Health check endpoint working
- ✅ Logging configured
- ✅ Error tracking setup
- ✅ Firebase monitoring enabled

### Testing
- ✅ All tests passing
- ✅ API endpoints tested
- ✅ Authentication working
- ✅ Database operations verified

---

## Rollback Procedure

If deployment fails:

1. **Revert Vercel deployment:**
   ```bash
   vercel rollback
   ```

2. **Revert Firestore rules:**
   - Go to Firebase Console
   - Firestore → Rules
   - Click "History"
   - Restore previous version

3. **Check logs:**
   ```bash
   vercel logs --follow
   ```

---

## Maintenance

### Update Dependencies

```bash
npm update
npm audit fix
```

### Backup Firestore Data

```bash
gcloud firestore export gs://your-bucket/backups
```

### Monitor Performance

- Check Vercel Analytics
- Review Firebase usage
- Monitor error rates
- Check API response times

---

## Troubleshooting

### Issue: Firestore indexes not working

**Solution:**
1. Check Firebase Console → Firestore → Indexes
2. Wait for indexes to finish building
3. Verify index configuration in `firestore.indexes.json`

### Issue: Rate limiting too strict

**Solution:**
Adjust limits in `lib/rate-limiter.js`:
```javascript
max: 200, // Increase from 100
windowMs: 15 * 60 * 1000
```

### Issue: High memory usage

**Solution:**
1. Clear cache periodically
2. Optimize Firestore queries
3. Reduce log retention
4. Scale Vercel plan

### Issue: Authentication errors

**Solution:**
1. Verify Firebase credentials
2. Check service account permissions
3. Ensure private key is correctly formatted
4. Test with Firebase Console

---

## Support

For issues:
1. Check logs: `logs/error.log`
2. Review Firebase Console
3. Check Vercel deployment logs
4. Refer to documentation in `docs/`

---

## Next Steps

1. ✅ Deploy to production
2. ⏭️ Setup monitoring alerts
3. ⏭️ Configure backup schedule
4. ⏭️ Setup CI/CD pipeline
5. ⏭️ Performance optimization
6. ⏭️ Load testing

---

**Deployment Complete!** 🎉
