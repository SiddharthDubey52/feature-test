# User Network Info API

A comprehensive Node.js Express API that collects user network information, device details, and geolocation data when someone loads your website frontend.

## Features

- 🌐 **Network Information**: IP address, headers, connection details
- 📱 **Device Detection**: Device type, vendor, model, screen resolution
- 🗺️ **Geolocation**: Country, city, coordinates based on IP
- 🌍 **Browser Info**: Browser name, version, engine details
- 💻 **System Info**: Operating system, architecture, CPU details
- 🔒 **Security**: Rate limiting, CORS, helmet protection
- ⚡ **Performance**: Optimized single endpoint design

## Quick Start

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd self-features

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=*
```

### Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Main Endpoint
- **URL**: `/api/user-info`
- **Methods**: `GET`, `POST`
- **Description**: Collects comprehensive user information

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Server health status

### Service Health
- **URL**: `/api/user-info/health`
- **Method**: `GET`
- **Description**: User info service status

## Frontend Integration

### Basic Usage (GET Request)
```javascript
const response = await fetch('http://localhost:3000/api/user-info');
const data = await response.json();
console.log(data);
```

### Enhanced Usage (POST Request with Device Info)
```javascript
const deviceInfo = {
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints
};

const response = await fetch('http://localhost:3000/api/user-info', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(deviceInfo)
});

const data = await response.json();
```

## Response Format

```json
{
    "success": true,
    "message": "User information collected successfully",
    "data": {
        "timestamp": "2025-07-29T12:00:00.000Z",
        "network": {
            "ip": "192.168.1.100",
            "userAgent": "Mozilla/5.0...",
            "acceptLanguage": "en-US,en;q=0.9",
            "host": "localhost:3000",
            "origin": "http://localhost:3000"
        },
        "device": {
            "type": "desktop",
            "vendor": "Apple",
            "model": "unknown",
            "screenResolution": "1920x1080",
            "timezone": "America/New_York"
        },
        "geolocation": {
            "country": "US",
            "region": "NY",
            "city": "New York",
            "latitude": 40.7128,
            "longitude": -74.0060
        },
        "browser": {
            "name": "Chrome",
            "version": "91.0.4472.124",
            "engine": "Blink"
        },
        "system": {
            "os": "Mac OS",
            "osVersion": "10.15.7",
            "architecture": "amd64"
        }
    },
    "summary": {
        "timestamp": "2025-07-29T12:00:00.000Z",
        "ip": "192.168.1.100",
        "country": "US",
        "city": "New York",
        "browser": "Chrome 91.0.4472.124",
        "os": "Mac OS 10.15.7",
        "device": "desktop"
    }
}
```

## Project Structure

```
self-features/
├── src/
│   ├── controllers/
│   │   └── UserInfoController.js
│   ├── models/
│   │   └── UserInfo.js
│   ├── routes/
│   │   └── userInfoRoutes.js
│   ├── services/
│   │   └── UserInfoService.js
│   ├── middleware/
│   │   └── userInfoMiddleware.js
│   └── app.js
├── .env
├── .github/
│   └── copilot-instructions.md
├── server.js
├── test.html
└── package.json
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable origin restrictions
- **Helmet**: Security headers
- **Input Validation**: Data sanitization and validation
- **Error Handling**: Secure error responses

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **morgan**: HTTP request logger
- **ua-parser-js**: User agent parsing
- **geoip-lite**: IP-based geolocation
- **request-ip**: IP address extraction
- **dotenv**: Environment variables

## Testing

Open `test.html` in your browser to test the API functionality.

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure `FRONTEND_URL` to your specific domain
3. Set up proper HTTPS
4. Consider using a process manager like PM2
5. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
