require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const notificationRoutes = require('./routes/notifications');
const rulesRoutes = require('./routes/rules');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Notification Prioritization Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/v1/notifications', notificationRoutes);
app.use('/v1/rules', rulesRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Notification Engine running on port ${PORT}`);
});

module.exports = app;