# SocialVibe Backend

Backend service for SocialVibe, a social activity platform that connects people with similar interests.

## Prerequisites

- Node.js 14+
- npm 6+
- Supabase account

## Setup

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
     - `SUPABASE_ANON_KEY`: Your Supabase anon key

4. **Set up the database**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Paste the content of `db-init.sql` and run it
   - This will create all necessary tables and indexes

## Available Scripts

### `npm start`
Starts the server in production mode.

### `npm run dev`
Starts the server in development mode with hot reload.

### `npm run build`
Builds the project for production.

## API Endpoints

### Activities
- `GET /api/activities` - Get all activities
- `GET /api/activities/:id` - Get single activity with details
- `POST /api/activities` - Create new activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity
- `POST /api/activities/:id/join` - Join activity
- `POST /api/activities/:id/leave` - Leave activity
- `POST /api/activities/:id/favorite` - Toggle favorite status
- `GET /api/activities/user/favorites/:user_id` - Get user's favorite activities
- `GET /api/activities/user/created/:user_id` - Get user's created activities
- `GET /api/activities/user/participated/:user_id` - Get user's participated activities

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/email/:email` - Get user by email
- `GET /api/users/:id/stats` - Get user's activity statistics

### Chats
- `GET /api/chats/user/:user_id` - Get user's chats
- `GET /api/chats/:id` - Get single chat with messages
- `POST /api/chats` - Create new chat
- `POST /api/chats/:id/messages` - Send message
- `PUT /api/chats/:id/messages/read` - Mark messages as read
- `POST /api/chats/:id/members` - Add chat member
- `DELETE /api/chats/:id/members/:user_id` - Remove chat member
- `DELETE /api/chats/:id` - Delete chat

## Database Schema

### Tables
- `users` - User information
- `activities` - Activity details
- `activity_participants` - Activity participation records
- `favorites` - User's favorite activities
- `chats` - Chat conversations
- `chat_members` - Chat members
- `messages` - Chat messages
- `user_avatars` - User avatars

### Relationships
- Users can create multiple activities
- Activities can have multiple participants
- Users can join multiple activities
- Users can favorite multiple activities
- Users can participate in multiple chats
- Chats can have multiple messages

## Error Handling

The API returns JSON responses with appropriate HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Security

- Uses Supabase service role key for server-side operations
- Implements input validation using express-validator
- Allows CORS for cross-origin requests

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT