# AI Research System - Frontend

A modern, intuitive frontend for the AI Research System built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Modern UI/UX**: Clean, professional design with smooth animations and transitions
- **Real-time Updates**: Polling for research status updates when sessions are processing
- **File Upload**: Drag-and-drop file upload with support for PDF, TXT, DOC, DOCX
- **Markdown Rendering**: Beautiful rendering of research reports with syntax highlighting
- **Cost Analytics**: Comprehensive cost tracking with charts and budget management
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Type Safety**: Full TypeScript coverage for type safety

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components inspired by shadcn/ui
- **State Management**: React Query (TanStack Query)
- **API Client**: Axios
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Markdown**: react-markdown
- **File Upload**: react-dropzone
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see main README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home/Dashboard page
│   ├── history/           # Research history page
│   ├── costs/             # Cost analytics page
│   ├── settings/          # Settings page
│   ├── research/[id]/     # Research session detail page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Base UI components (Button, Card, etc.)
│   ├── layout/           # Layout components (Header, Sidebar)
│   └── research/         # Research-specific components
├── lib/                   # Utility functions and API client
│   ├── api.ts            # API client and functions
│   ├── utils.ts          # Utility functions
│   └── providers.tsx     # React Query provider
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

## API Integration

The frontend communicates with the Django REST API backend. The API client is configured in `lib/api.ts` and uses React Query for caching and state management.

### Authentication

Currently supports Basic Auth or Token Authentication. Tokens can be stored in localStorage. Update the API client in `lib/api.ts` to customize authentication.

## Key Features

### Dashboard
- Start new research with a prominent search bar
- Quick stats cards showing totals and averages
- Recent research sessions list

### Research Session Page
- Real-time status polling for processing sessions
- Tabbed interface for Report, Reasoning, Files, and Cost
- Markdown rendering for research reports
- File upload with drag-and-drop
- Continue research functionality

### History Page
- Search and filter research sessions
- Status-based filtering
- Click any session to view details

### Cost Analytics
- Budget overview with progress bars
- Cost charts (line chart for trends, pie chart for providers)
- Recent costs table
- Token usage statistics

### Settings
- Profile management
- Budget configuration
- API key management
- Notification preferences

## Customization

### Styling

The design uses Tailwind CSS with a custom color palette defined in `app/globals.css`. Modify the CSS variables to customize colors:

```css
:root {
  --primary: #4f46e5;      /* Indigo */
  --secondary: #7c3aed;    /* Purple */
  --success: #10b981;      /* Green */
  --warning: #f59e0b;      /* Amber */
  --error: #ef4444;        /* Red */
}
```

### API Base URL

Update the `NEXT_PUBLIC_API_BASE_URL` environment variable to point to your backend API.

## Development

### Adding New Components

1. Create component files in `components/ui/` for base components
2. Use the `cn()` utility for conditional class names
3. Follow the existing component patterns for consistency

### Adding New Pages

1. Create new route files in `app/` directory
2. Use `MainLayout` for consistent layout
3. Implement data fetching with React Query hooks

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the Django backend has CORS configured to allow requests from `http://localhost:3000`.

### API Connection Issues

1. Verify the backend is running on the port specified in `NEXT_PUBLIC_API_BASE_URL`
2. Check browser console for detailed error messages
3. Verify authentication credentials if required

## License

MIT License - see LICENSE file for details
