const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple login endpoint
app.post('/login', (req, res) => {
  console.log('Login request received:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (email === 'admin@beyondfire.cloud' && password === 'AdminPW!') {
    return res.json({
      message: 'Login successful',
      user: {
        email,
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'test-token-' + Date.now()
    });
  }
  
  return res.status(401).json({ error: 'Invalid credentials' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
});
