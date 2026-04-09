# Vi-Notes Frontend

React + TypeScript frontend for Vi-Notes Authenticity Verification Platform with Electron desktop integration.

## Features

- 🔐 **Authentication**: Secure login/register with JWT tokens
- ✍️ **Writing Editor**: Distraction-free editor with real-time keystroke tracking
- 📊 **Analytics Dashboard**: Comprehensive authenticity reports
- ⌨️ **Keystroke Tracking**: Privacy-focused typing pattern analysis
- 📋 **Paste Detection**: Monitor clipboard events
- 🖥️ **Desktop App**: Electron integration for enhanced tracking

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with interceptors
- **Desktop**: Electron
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + Context API

## Project Structure

```
frontend/
├── public/
│   ├── electron.js          # Electron main process
│   └── index.html
├── src/
│   ├── components/
│   │   ├── LoadingSpinner.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/
│   │   ├── useAuth.ts       # Authentication context
│   │   └── useKeystrokes.ts # Keystroke tracking logic
│   ├── pages/
│   │   ├── Register.tsx     # Registration page
│   │   ├── Login.tsx        # Login page
│   │   ├── Editor.tsx       # Main writing editor
│   │   └── Report.tsx       # Analytics dashboard
│   ├── services/
│   │   └── api.ts           # Axios configuration
│   ├── App.tsx              # Main app component
│   ├── index.tsx            # Entry point
│   └── index.css            # Global styles
├── package.json
└── tsconfig.json
```

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env` (already created)
   - Update `REACT_APP_API_URL` if backend runs on different port

## Running the Application

### Development Mode

1. **Start React Dev Server**
   ```bash
   npm start
   ```
   Frontend runs on `http://localhost:3000`

2. **Start Electron App** (in new terminal)
   ```bash
   npm run electron-dev
   ```

### Production Mode

1. **Build React App**
   ```bash
   npm run build
   ```

2. **Start Electron**
   ```bash
   npm run electron
   ```

3. **Package for Distribution**
   ```bash
   npm run electron-pack
   ```

## API Integration

### Authentication Endpoints

```typescript
// Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123"
}

// Login
POST /api/auth/login
{
  "email": "user@example.com", 
  "password": "password123"
}
```

### Session Endpoints

```typescript
// Save session data
POST /api/session/save
{
  "text": "Your content here...",
  "keystrokes": [
    { "interval": 120, "timestamp": 1640995200000 }
  ],
  "pasteEvents": [
    { "pasteLength": 25, "timestamp": 1640995201000 }
  ]
}

// Get report data
GET /api/session/report
```

## Key Components

### useAuth Hook
Manages authentication state and provides:
- User login/logout
- Token management
- Protected route access
- Automatic token injection

### useKeystrokes Hook
Handles keystroke tracking:
- Real-time typing pattern capture
- Paste event detection
- Statistics calculation
- Privacy-focused data collection

### API Service
Configured Axios instance with:
- JWT token injection
- Error handling
- Request/response interceptors
- Network error detection

## Features Explained

### 1. Authentication System
- JWT-based authentication
- Automatic token storage in localStorage
- Protected routes with redirect
- Automatic logout on token expiration

### 2. Keystroke Tracking
- Captures key press intervals
- Tracks typing speed variance
- Monitors paste events
- No actual key content stored (privacy-first)

### 3. Auto-save Functionality
- Debounced saving (2 seconds)
- Real-time content sync
- Visual save indicators
- Error handling with retry

### 4. Report Dashboard
- Authenticity scoring (0-100)
- Behavioral analysis
- Risk assessment
- Recommendations

## Error Handling

### Common Issues & Solutions

1. **Network Error**
   - Check if backend is running on port 5000
   - Verify API URL in `.env` file
   - Check CORS configuration

2. **Authentication Issues**
   - Clear browser localStorage
   - Verify JWT secret matches backend
   - Check token expiration

3. **Electron Issues**
   - Ensure React dev server is running
   - Check Electron security settings
   - Verify file paths

## Development Notes

### TypeScript Configuration
- Strict mode enabled
- Proper type definitions
- Interface definitions for all API responses

### Security Best Practices
- No sensitive data in localStorage (except JWT)
- HTTPS recommended for production
- Input validation on frontend
- XSS prevention

### Performance Optimizations
- Debounced API calls
- Lazy loading components
- Efficient state management
- Optimized re-renders

## Deployment

### Environment Variables
```bash
REACT_APP_API_URL=http://your-backend-url/api
```

### Build Process
1. Set production environment variables
2. Build React app: `npm run build`
3. Configure production backend URL
4. Deploy to hosting platform

### Electron Distribution
1. Build React app
2. Package with electron-builder
3. Sign certificates (for distribution)
4. Create installers

## Troubleshooting

### Common Debugging Steps

1. **Check Console Logs**
   ```bash
   # In browser dev tools
   # Check Network tab for API calls
   # Check Console for errors
   ```

2. **Verify Backend Connection**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Check Token Storage**
   ```javascript
   // In browser console
   localStorage.getItem('token')
   localStorage.getItem('user')
   ```

4. **Electron Debugging**
   - Open DevTools in Electron app
   - Check main process logs
   - Verify preload script injection

## Contributing

1. Follow TypeScript best practices
2. Use proper error handling
3. Write meaningful commit messages
4. Test all API integrations
5. Update documentation

## Support

For issues:
1. Check console logs
2. Verify backend connectivity
3. Review API responses
4. Check environment configuration
