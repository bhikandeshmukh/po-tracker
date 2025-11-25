# Firebase Email Authentication - Usage Guide

Complete guide for using Firebase Email Authentication in your application.

---

## Overview

This system uses Firebase Email/Password authentication for user login and registration. All authentication flows are handled through Firebase Auth with additional user profile data stored in Firestore.

---

## Setup Required

### 1. Enable Email Authentication in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password**
5. Click **Save**

### 2. Environment Variables

Already configured in `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

---

## Authentication Flow

### Registration Flow

```
User fills form
    ↓
Frontend: authClient.register()
    ↓
Firebase: createUserWithEmailAndPassword()
    ↓
Backend: POST /api/auth/register
    ↓
Create user document in Firestore
    ↓
Set user permissions based on role
    ↓
Create audit log
    ↓
Return success
```

### Login Flow

```
User enters credentials
    ↓
Frontend: authClient.login()
    ↓
Firebase: signInWithEmailAndPassword()
    ↓
Get Firebase ID token
    ↓
Backend: POST /api/auth/login
    ↓
Verify user exists in Firestore
    ↓
Check if user is active
    ↓
Update last login time
    ↓
Create audit log
    ↓
Return user data + custom token
```

---

## Frontend Usage

### 1. Login

```javascript
import authClient from '../lib/auth-client';

// In your login component
const handleLogin = async (e) => {
  e.preventDefault();
  
  const result = await authClient.login(email, password);
  
  if (result.success) {
    console.log('Logged in:', result.user);
    // Redirect to dashboard
    router.push('/dashboard');
  } else {
    console.error('Login failed:', result.error);
    setError(result.error);
  }
};
```

### 2. Register

```javascript
import authClient from '../lib/auth-client';

// In your register component
const handleRegister = async (e) => {
  e.preventDefault();
  
  const userData = {
    email: email,
    password: password,
    firstName: firstName,
    lastName: lastName,
    phone: phone,
    role: 'user' // or 'manager', 'admin', 'super_admin'
  };
  
  const result = await authClient.register(userData);
  
  if (result.success) {
    console.log('Registered:', result.user);
    // Redirect to login or dashboard
    router.push('/dashboard');
  } else {
    console.error('Registration failed:', result.error);
    setError(result.error);
  }
};
```

### 3. Logout

```javascript
import authClient from '../lib/auth-client';

// In your header/navbar component
const handleLogout = async () => {
  const result = await authClient.logout();
  
  if (result.success) {
    console.log('Logged out');
    router.push('/login');
  } else {
    console.error('Logout failed:', result.error);
  }
};
```

### 4. Check Authentication Status

```javascript
import { useEffect, useState } from 'react';
import authClient from '../lib/auth-client';

function ProtectedComponent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authClient.getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Or use Firebase auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login</div>;

  return <div>Welcome, {user.email}</div>;
}
```

### 5. Get User Token for API Calls

```javascript
import authClient from '../lib/auth-client';
import apiClient from '../lib/api-client';

// Token is automatically set after login
// But you can manually refresh if needed
const refreshToken = async () => {
  const token = await authClient.refreshToken();
  console.log('Token refreshed:', token);
};
```

---

## Complete Login Component Example

```javascript
// components/LoginForm.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import authClient from '../lib/auth-client';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await authClient.login(email, password);

    if (result.success) {
      // Login successful
      router.push('/dashboard');
    } else {
      // Login failed
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## Complete Register Component Example

```javascript
// components/RegisterForm.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import authClient from '../lib/auth-client';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await authClient.register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      role: formData.role
    });

    if (result.success) {
      // Registration successful
      router.push('/dashboard');
    } else {
      // Registration failed
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <label>First Name:</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label>Last Name:</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label>Phone:</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="+91-9876543210"
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength="6"
        />
      </div>
      
      <div>
        <label>Confirm Password:</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label>Role:</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
        >
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

---

## Protected Routes

```javascript
// components/ProtectedRoute.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import authClient from '../lib/auth-client';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authClient.getCurrentUser();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Check role if required
      if (requiredRole) {
        const token = await authClient.getToken();
        // Decode token or fetch user data to check role
        // For now, assuming user object has role
        if (currentUser.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }
      }

      setUser(currentUser);
      setLoading(false);
    };

    checkAuth();
  }, [router, requiredRole]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

// Usage
import ProtectedRoute from '../components/ProtectedRoute';

function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Dashboard Content</div>
    </ProtectedRoute>
  );
}

// Or with role requirement
function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin Content</div>
    </ProtectedRoute>
  );
}
```

---

## Error Handling

### Common Firebase Auth Error Codes

| Error Code | Description | User-Friendly Message |
|------------|-------------|----------------------|
| `auth/user-not-found` | No user with this email | Email not registered |
| `auth/wrong-password` | Incorrect password | Incorrect password |
| `auth/email-already-in-use` | Email already registered | Email already exists |
| `auth/weak-password` | Password too weak | Use stronger password (min 6 chars) |
| `auth/invalid-email` | Invalid email format | Invalid email format |
| `auth/user-disabled` | Account disabled | Account has been disabled |
| `auth/too-many-requests` | Too many failed attempts | Too many attempts, try later |

---

## Security Best Practices

1. **Never store passwords** - Firebase handles this
2. **Use HTTPS only** - Enforce in production
3. **Validate input** - Both frontend and backend
4. **Implement rate limiting** - Prevent brute force
5. **Use email verification** - Verify user emails
6. **Strong password policy** - Minimum 6 characters (configurable)
7. **Monitor failed logins** - Track in audit logs
8. **Session management** - Handle token refresh
9. **Logout on inactivity** - Auto-logout after timeout
10. **Two-factor authentication** - Optional, can be added

---

## Testing

### Test User Credentials

Create test users in Firebase Console:

```
Email: test@example.com
Password: Test123!
Role: user

Email: manager@example.com
Password: Manager123!
Role: manager

Email: admin@example.com
Password: Admin123!
Role: admin
```

### Test Login

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

---

## Troubleshooting

### Issue: "Firebase: Error (auth/network-request-failed)"
**Solution:** Check internet connection and Firebase config

### Issue: "User document not found"
**Solution:** Ensure user document exists in Firestore after registration

### Issue: "Token expired"
**Solution:** Call `authClient.refreshToken()` to get new token

### Issue: "Permission denied"
**Solution:** Check Firestore security rules and user role

---

## Next Steps

1. ✅ Email authentication setup complete
2. ✅ Login/Register APIs ready
3. ✅ Frontend auth client ready
4. ⏭️ Add email verification (optional)
5. ⏭️ Add password reset functionality
6. ⏭️ Implement two-factor authentication (optional)
7. ⏭️ Add session timeout

---

**Authentication is ready to use!** 🎉
