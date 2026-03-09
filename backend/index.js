// index.js  (or server.js) – production-ready version

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createRequire } from 'module';

// For compatibility with some packages that still expect require
const require = createRequire(import.meta.url);

// Routes
import authRoutes from './src/routes/auth.routes.js';
import leaveRoutes from './src/routes/leave.routes.js';

// Load environment variables
dotenv.config();

// Validate critical environment variables early
const requiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnv = requiredEnvVars.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();

// ─────────────────────────────────────────────
// Security & performance middleware
// ─────────────────────────────────────────────

// 1. Helmet – security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// 2. Compression
app.use(compression());

// 3. CORS – configure properly for production
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // ← change to your frontend domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 4. Rate limiting (basic abuse protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter); // apply to all API routes

// 5. Logging – more verbose in development, concise in production
const logFormat = process.env.NODE_ENV === 'production'
  ? 'combined'
  : 'dev';

app.use(morgan(logFormat));

// 6. JSON parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);

// Health check (important for Render & load balancers)
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongo: mongoStatus,
    version: process.env.npm_package_version || 'unknown',
  });
});

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  res.status(status).json({ message });
});

// ─────────────────────────────────────────────
// MongoDB connection with retry logic
// ─────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      family: 4, // Use IPv4, skip trying IPv6
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    setTimeout(connectDB, 5000); // retry after 5 seconds
  }
};

connectDB();

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on port ${PORT}`);
});

// Export server for testing (optional)
export default server;