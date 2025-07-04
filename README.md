# Social Media Scheduler

A robust social media scheduler application that enables users to connect and manage multiple social accounts across various platforms through an intuitive user interface.

## Features

- **Multi-Platform Support**: Starting with Mastodon, expanding to Twitter, Pinterest, SoundCloud, Substack, Telegram, and DeviantArt
- **Account Management**: Connect and disconnect multiple accounts per platform
- **Content Publishing**: Publish content to one or multiple selected accounts simultaneously
- **Secure Authentication**: OAuth 2.0 integration with encrypted credential storage
- **Unified Dashboard**: Single interface to manage all connected platforms

## Tech Stack

**Frontend:**
- React with TypeScript
- Redux Toolkit for state management
- Material-UI for components
- React Router for navigation

**Backend:**
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Rate limiting and security middleware

## Getting Started

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Set up the database:
   ```bash
   psql -U postgres -f database/schema.sql
   ```

4. Configure environment variables:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your database credentials and API keys
   ```

5. Start the development servers:
   ```bash
   # Start the backend server
   cd server
   npm run dev

   # Start the frontend (in a new terminal)
   cd client
   npm start
   ```

## Project Structure

```
social_media/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── store/       # Redux store and slices
│   │   ├── services/    # API service functions
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── server/              # Node.js backend
│   └── src/
│       ├── controllers/ # Request handlers
│       ├── middleware/  # Express middleware
│       ├── models/      # Database models
│       ├── routes/      # API routes
│       ├── services/    # Business logic
│       ├── config/      # Configuration files
│       └── utils/       # Utility functions
└── database/            # Database schema and migrations
```

## API Endpoints

- `POST /api/auth/mastodon/connect` - Initialize Mastodon OAuth
- `GET /api/auth/mastodon/callback` - Handle OAuth callback
- `DELETE /api/accounts/:id` - Disconnect account
- `GET /api/accounts` - List user's connected accounts
- `POST /api/posts` - Publish content to selected accounts
- `GET /api/posts` - Get publishing history

## Security Features

- Encrypted token storage
- Rate limiting
- Input validation and sanitization
- HTTPS enforcement
- Secure session management
- CORS protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Deployment

### Frontend (GitHub Pages)

The React frontend can be deployed to GitHub Pages:

```bash
cd client
npm run deploy
```

### Backend (Cloud Service)

The backend needs to be deployed to a cloud service. We recommend Render:

1. Push your code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repository  
4. Set environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=your-postgres-url`
   - `JWT_SECRET=your-jwt-secret`
   - `MASTODON_REDIRECT_URI=https://your-backend-url.com/api/auth/mastodon/callback`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/social_media_scheduler
JWT_SECRET=your-very-secure-jwt-secret
MASTODON_REDIRECT_URI=http://localhost:5000/api/auth/mastodon/callback
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## License

ISC License