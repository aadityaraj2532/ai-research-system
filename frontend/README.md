# AI Research Frontend

A modern, responsive web frontend for the AI Research System built with HTML5, CSS3, Bootstrap 5, and vanilla JavaScript.

## Project Structure

```
frontend/
├── index.html              # Main HTML template
├── css/
│   └── styles.css          # Custom CSS styles and theming
├── js/
│   ├── app.js             # Main application controller
│   ├── router.js          # Client-side routing
│   ├── state.js           # State management
│   ├── api.js             # API client
│   └── notifications.js   # Notification system
├── test/
│   └── test-project-structure.js  # Property-based tests
├── package.json           # Project configuration
└── README.md             # This file
```

## Features

- **Responsive Design**: Built with Bootstrap 5 for mobile-first responsive layouts
- **Modern JavaScript**: Uses ES6+ modules, async/await, and modern web APIs
- **Component Architecture**: Modular design with separation of concerns
- **State Management**: Centralized state with local storage persistence
- **Real-time Updates**: Polling-based status updates for research sessions
- **File Upload**: Drag-and-drop file upload with progress tracking
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
- **Dark Mode**: Automatic dark mode support based on user preferences

## Technology Stack

- **HTML5**: Semantic markup with proper accessibility
- **CSS3**: Custom properties, flexbox, grid, and animations
- **Bootstrap 5**: Responsive framework and UI components
- **Vanilla JavaScript**: No heavy frameworks, just modern ES6+ modules
- **Fetch API**: Modern HTTP client for API communication

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support
- Web server to serve static files (due to CORS restrictions)

### Development Server

Using Python:
```bash
npm run serve
# or
python -m http.server 8080
```

Using PHP:
```bash
npm run serve:php
# or
php -S localhost:8080
```

Then open http://localhost:8080 in your browser.

### Testing

Run the property-based tests:
```bash
npm test
```

## Architecture

### Component Structure

- **App Controller**: Main application initialization and global event handling
- **Router**: Hash-based client-side routing for single-page navigation
- **State Manager**: Centralized state management with subscriber pattern
- **API Client**: HTTP client with error handling, retries, and file upload
- **Notification System**: Toast notifications with different types and actions

### Data Flow

1. User interactions trigger events in components
2. Components update state through the State Manager
3. State changes notify subscribed components
4. API calls are made through the API Client
5. Results update state and trigger UI re-renders

### Error Handling

- Network errors with automatic retry and exponential backoff
- User-friendly error messages for different error types
- Graceful degradation when offline
- Form validation with real-time feedback

## API Integration

The frontend integrates with the Django REST API backend:

- `POST /api/research/start` - Start new research
- `GET /api/research/history` - Get research history
- `GET /api/research/{id}` - Get research details
- `POST /api/research/{id}/continue` - Continue research
- `POST /api/research/{id}/upload` - Upload files
- `GET /api/costs/summary` - Get cost information

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance

- Lazy loading for large content
- Virtual scrolling for large lists
- Intelligent caching with cache invalidation
- Optimized bundle size with no heavy dependencies

## Accessibility

- Semantic HTML5 elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators for all interactive elements

## Contributing

1. Follow the established code structure
2. Maintain separation of concerns (HTML/CSS/JS)
3. Write property-based tests for new features
4. Ensure accessibility compliance
5. Test across different browsers and devices

## License

MIT License - see LICENSE file for details