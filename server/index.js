const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


if(process.env.ENV === 'production') {
     CLIENT_URL = process.env.CLIENT_URL
}else{
      CLIENT_URL = 'http://localhost:5173'
}

const connectDB = require('./config/database');


const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;


connectDB();

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV==='developement'? 'http://localhost:5173' :process.env.CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'EchoSphere API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
// app.use('/api/conversations', conversationsRoutes);
const aiRoutes = require('./routes/aiRoutes');
const conversationsRoutes = require('./routes/chat');
app.use('/api', conversationsRoutes);
 app.use('/api/conversations', aiRoutes);



app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Personai API server running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI Service: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');

  server.close(() => {
    console.log('📴 Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});

module.exports = app;