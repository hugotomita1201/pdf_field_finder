const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { extractPdfFields } = require('./extractFields');

const app = express();
const PORT = process.env.PORT || 3002;

// Security headers middleware
app.use((req, res, next) => {
  // Set Content Security Policy to allow necessary resources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "script-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self';"
  );
  next();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/pdf-uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Extract PDF fields endpoint
app.post('/api/extract', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing PDF:', req.file.originalname);
    
    // Extract fields using pdftk
    const result = await extractPdfFields(req.file.path);
    
    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(console.error);
    
    // Send response
    res.json({
      success: true,
      filename: req.file.originalname,
      ...result
    });
    
  } catch (error) {
    console.error('Extraction error:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      error: error.message || 'Failed to extract PDF fields'
    });
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PDF Field Extractor running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  if (process.env.RENDER) {
    console.log('Running on Render');
  }
});