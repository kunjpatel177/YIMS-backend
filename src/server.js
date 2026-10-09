const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const zlib = require('zlib');

const app = express();
app.disable('x-powered-by');

// CORS configuration supporting deployment domains via CLIENT_URL
const rawClientUrl = process.env.CLIENT_URL || '';
const configuredOrigins = rawClientUrl
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultDevOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // In development or if '*' is configured, allow all origins
      if (process.env.NODE_ENV !== 'production' || rawClientUrl === '*' || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Check against allowed deployment origins
      const cleanOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // Cache preflight OPTIONS requests for 24 hours
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Built-in Gzip compression for JSON payloads > 1KB
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      const jsonStr = JSON.stringify(body);
      if (!jsonStr || jsonStr.length < 1024) {
        return originalJson(body);
      }
      zlib.gzip(Buffer.from(jsonStr, 'utf8'), (err, compressed) => {
        if (err || res.headersSent) {
          return originalJson(body);
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Length', compressed.length);
        return res.end(compressed);
      });
      return res;
    } catch (e) {
      return originalJson(body);
    }
  };
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', system: 'Yashvee Inventory Management System', time: new Date() });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/raw-materials', require('./routes/rawMaterialRoutes'));
app.use('/api/bom', require('./routes/bomRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/aluminium', require('./routes/aluminiumRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/warehouse-inventory', require('./routes/warehouseInventoryRoutes'));
app.use('/api/warehouse-transfers', require('./routes/transferRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Serve static frontend build if available with aggressive caching for hashed assets
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(
    '/assets',
    express.static(path.join(frontendDist, 'assets'), {
      maxAge: '1y',
      immutable: true
    })
  );
  app.use(express.static(frontendDist, { maxAge: '1h' }));
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(404).json({ success: false, message: `API route not found: ${req.originalUrl}` });
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // 404 Route handler
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
  });
}

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`YIMS Backend Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});

module.exports = app;
