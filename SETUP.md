# Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://cvbnzcspfsllrjceoblm.supabase.co/
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Backend API Configuration
PORT=3001

# Frontend API Base URL
VITE_API_BASE_URL=http://localhost:3001
```

### Getting Your Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (NOT the anon key)
4. **IMPORTANT**: Never commit this key to version control or expose it in client-side code

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

- The `SUPABASE_SERVICE_ROLE_KEY` should **ONLY** be used in the backend server
- Never expose the service role key in client-side code or browser bundles
- The backend API (`server/index.ts`) handles all Supabase queries using the service role key
- The frontend only communicates with the backend API, never directly with Supabase

## API Endpoints

### GET /api/questions

Fetches questions for a given workflow ID.

**Query Parameters:**
- `workflowId` (required): The workflow ID to filter questions by

**Response:**
```json
[
  {
    "id": "uuid",
    "question": "Question text",
    "workflow_id": "workflow-uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```
