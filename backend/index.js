import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './src/routes/auth.routes.js';
// import leaveRoutes from './src/routes/leave.routes.js'; // later

// Load .env as early as possible
dotenv.config();

// Debug: help you see if environment variables are actually loaded
console.log('Environment variables check:');
console.log('  PORT               →', process.env.PORT || '(not set)');
console.log('  MONGO_URI          →', process.env.MONGO_URI ? 'present' : '(missing)');
console.log('  JWT_ACCESS_SECRET  →', process.env.JWT_ACCESS_SECRET ? 'present' : '(missing)');
console.log('  JWT_REFRESH_SECRET →', process.env.JWT_REFRESH_SECRET ? 'present' : '(missing)');

const app = express();

app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
// app.use('/api/leaves', leaveRoutes);

// Simple health check route – very useful during development
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is alive',
    uptime: process.uptime(),
    env: {
      node: process.version,
      port: process.env.PORT,
    },
    timestamp: new Date().toISOString(),
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('→ MongoDB Atlas connected successfully'))
  .catch(err => {
    console.error('MongoDB connection failed:');
    console.error(err.message);
    process.exit(1); // exit so you notice the problem immediately
  });

// Use fallback port if .env doesn't provide one
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
  console.log('Try these URLs:');
  console.log(`  • Health check: http://localhost:${PORT}/health`);
  console.log(`  • Register:    POST http://localhost:${PORT}/api/auth/register`);
});