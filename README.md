# GameXplorer 🎮

A modern, responsive web application for discovering, tracking, and managing your video game collection. Built with Next.js 15 and powered by the IGDB (Internet Game Database) API.

## 🌐 Live Demo

**[View Live Application →](https://gamexplorer-omega.vercel.app/)**

Try it out: [https://gamexplorer-omega.vercel.app/trending](https://gamexplorer-omega.vercel.app/trending)

## ✨ Features

- **Game Discovery**: Browse trending games and discover new titles
- **Advanced Search**: Search games by title with real-time results
- **Game Details**: View comprehensive information including cover art, screenshots, ratings, genres, and platforms
- **Personal Vault**: Track games you own in your collection
- **Wishlist**: Save games you want to play in the future
- **Gaming Journey**: Visualize your gaming history and preferences
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices with hamburger menu navigation
- **Infinite Scroll**: Seamless pagination for browsing large game catalogs
- **Image Lightbox**: Full-screen image viewing for game screenshots

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **React Context API** - State management for Wishlist & Vault

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **IGDB API** - Game database integration via Twitch OAuth2
- **Zod** - Runtime type validation
- **Rate Limiting** - Token bucket algorithm (4 req/s, max 8 concurrent)
- **Caching** - In-memory cache with 60s TTL for trending queries

## 📋 Prerequisites

- Node.js 18+ and npm
- Twitch Developer Account for IGDB API access

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/GanapathySubramanian/GameXplorer.git
cd GameXplorer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

**Getting IGDB API Credentials:**

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Register a new application
3. Set OAuth Redirect URL to `http://localhost:3000` (for development)
4. Copy the Client ID and Client Secret
5. Add them to your `.env.local` file

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
GameXplorer/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   ├── igdb/
│   │   │   │   └── query/        # Main IGDB API endpoint
│   │   │   └── server/           # Server-side IGDB client
│   │   ├── gamedetails/          # Game details page
│   │   ├── journey/              # Gaming journey page
│   │   ├── search/               # Search results page
│   │   ├── trending/             # Trending games page
│   │   ├── vault/                # Personal collection page
│   │   ├── wishlist/             # Wishlist page
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── common/               # Reusable components
│   │   │   ├── GameCard.tsx      # Game card component
│   │   │   ├── GameDetailInline.tsx
│   │   │   ├── Icon.tsx          # Icon component
│   │   │   ├── Lightbox.tsx      # Image lightbox
│   │   │   ├── ScrollToTop.tsx   # Scroll to top button
│   │   │   └── SearchBox.tsx     # Search input
│   │   └── layout/
│   │       └── AppShell.tsx      # Main layout with navigation
│   ├── context/                  # React Context providers
│   │   ├── vault.tsx             # Vault state management
│   │   └── wishlist.tsx          # Wishlist state management
│   ├── server/
│   │   └── igdb.ts               # IGDB API client
│   └── shared/
│       └── types.ts              # TypeScript type definitions
├── public/                       # Static assets
├── .env.local                    # Environment variables (create this)
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## 🔌 API Integration

### IGDB API Endpoints

The application uses a unified API endpoint at `/api/igdb/query` with multiple modes:

- **search**: Search games by title
- **trending**: Get trending games
- **discover**: Discover new games
- **detail**: Get detailed game information
- **recommend**: Get game recommendations
- **bulk**: Fetch multiple games by IDs
- **multi**: Execute multiple queries
- **taxonomy**: Get genres, platforms, themes

### Rate Limiting

- **4 requests per second** maximum
- **8 concurrent requests** limit
- Automatic retry with exponential backoff for rate limit errors
- In-memory caching for trending queries (60s TTL)

### Authentication

OAuth2 token management is handled automatically:
- Tokens are cached and refreshed when expired
- Automatic retry on authentication failures

## 🎨 Key Features Implementation

### Responsive Navigation
- Desktop: Horizontal navigation with centered links
- Mobile: Hamburger menu with slide-in sidebar
- Active route highlighting
- ESC key to close mobile menu

### State Management
- **Vault Context**: Manages owned games collection
- **Wishlist Context**: Manages wishlist items
- Local storage persistence

### Infinite Scroll
- Intersection Observer API for pagination
- Automatic deduplication of results
- Loading states and error handling

### Image Optimization
- Next.js Image component for optimized loading
- IGDB CDN integration with size parameters
- Lightbox for full-screen viewing

## 🚢 Deployment

This project is deployed on Vercel: **[https://gamexplorer-omega.vercel.app](https://gamexplorer-omega.vercel.app)**

### Deploy Your Own

#### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
4. Deploy
5. **Important**: After adding environment variables, you must redeploy for changes to take effect

### Other Platforms

The application can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

**Important**: Ensure environment variables are configured in your deployment platform.

## 🔧 Configuration

### Build Configuration

The `next.config.ts` includes:
- ESLint errors ignored during build
- TypeScript errors ignored during build
- Image optimization for IGDB CDN

### Tailwind Configuration

Custom theme configuration in `tailwind.config.ts`:
- Custom colors and spacing
- Responsive breakpoints
- Dark mode support

## 📝 Development Notes

### Type Safety
- Full TypeScript coverage
- Zod schemas for runtime validation
- Strict type checking enabled

### Code Quality
- ESLint configuration
- Consistent code formatting
- Component-based architecture

### Performance
- Server-side rendering for SEO
- Static page generation where possible
- Optimized images and lazy loading
- API response caching

## 🐛 Known Issues

- Build warnings for ESLint/TypeScript are suppressed for deployment
- Some type definitions may need refinement

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [IGDB](https://www.igdb.com/) for providing the game database API
- [Twitch](https://dev.twitch.tv/) for API authentication
- [Next.js](https://nextjs.org/) team for the amazing framework

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Built with ❤️ by Ganapathy Subramanian**
