# Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration (for frontend)
VITE_SUPABASE_URL=https://cvbnzcspfsllrjceoblm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API Configuration
PORT=3001
VITE_API_BASE_URL=http://localhost:3001
```

### Getting Your Supabase Anon Key

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "anon" public key
4. This key is safe to use client-side (RLS policies protect your data)

## Running the Application

### Development Mode

1. **Start the backend API server** (in one terminal):
   ```bash
   npm run dev:server
   ```
   This starts the Express server on port 3001 (or the port specified in `.env`)

2. **Start the frontend development server** (in another terminal):
   ```bash
   npm run dev
   ```
   This starts the Vite dev server on port 8080

### Production Mode

1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Start the backend server**:
   ```bash
   npm run server
   ```

3. **Serve the frontend** (using a static file server or the preview command):
   ```bash
   npm run preview
   ```

## Security Notes

- The `VITE_SUPABASE_ANON_KEY` is safe to use client-side
- Configure Row Level Security (RLS) policies in Supabase to protect your data
- The frontend queries Supabase directly using the anon key
- RLS policies ensure users can only access data they're authorized to see

## API Endpoints

### POST /api/n8n/workflows

Proxies n8n workflow requests to avoid CORS issues.

**Body:**
- `baseUrl` (required): n8n base URL
- `apiKey` (required): n8n API key
- `cursor` (optional): pagination cursor

**Response:** n8n workflows data

## Supabase Configuration

The app queries the `questions` table directly from the browser. Ensure you have:

1. A `questions` table with columns:
   - `id` (uuid, primary key)
   - `question` (text)
   - `workflow_id` (text)
   - `created_at` (timestamp)

2. RLS policies configured appropriately (or disable RLS for testing)
