/**
 * Main Application Controller
 * Manages the overall application state, routing, and component initialization
 */

import { Router } from './router.js';
import { StateManager } from './state.js';
import { APIClient } from './api.js';
import { NotificationSystem } from './notifications.js';
import { StatusPoller } from './status-poller.js';

class App {
    constructor() {
        this.state = new StateManager();
        this.api = new APIClient();
        this.notifications = new NotificationSystem();
        this.statusPoller = new StatusPoller(this.api, this.notifications);
        this.router = new Router(this.state, this.api, this.notifications, this.statusPoller);
        
        // Bind methods to maintain context
        this.handleError = this.handleError.bind(this);
        this.handleNetworkStatus = this.handleNetworkStatus.bind(this);
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing AI Research System...');
            
            // Initialize status poller
            this.statusPoller.init();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize router
            this.router.init();
            
            console.log('AI Research System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.notifications.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    /**
     * Load initial application data
     */
    async loadInitialData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load user's research history
            const history = await this.api.getResearchHistory();
            this.state.setResearchHistory(history);
            
            // Load user preferences from local storage
            this.state.loadFromLocalStorage();
            
        } catch (error) {
            console.warn('Failed to load initial data:', error);
            // Don't show error notification for initial load failures
            // The app should still work without initial data
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Global error handling
        window.addEventListener('unhandledrejection', this.handleError);
        window.addEventListener('error', this.handleError);
        
        // Network status monitoring
        window.addEventListener('online', () => this.handleNetworkStatus(true));
        window.addEventListener('offline', () => this.handleNetworkStatus(false));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Visibility change handling (for pausing/resuming polling)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    /**
     * Handle global errors
     */
    handleError(event) {
        console.error('Global error:', event.reason || event.error);
        
        // Don't show notification for every error to avoid spam
        // Only show for critical errors
        if (event.reason && event.reason.message && 
            (event.reason.message.includes('fetch') || event.reason.message.includes('network'))) {
            this.notifications.showError('Network error occurred. Please check your connection.');
        }
    }
    
    /**
     * Handle network status changes
     */
    handleNetworkStatus(isOnline) {
        if (isOnline) {
            this.notifications.showSuccess('Connection restored');
            // Resume polling when coming back online
            this.statusPoller.resumeAllPolling();
            // Refresh data when coming back online
            this.loadInitialData();
        } else {
            this.notifications.showWarning('Connection lost - working offline');
            // Pause polling when offline
            this.statusPoller.pauseAllPolling();
        }
        
        // Update state
        this.state.setState({ isOnline });
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to close modals/overlays
        if (event.key === 'Escape') {
            this.hideLoading();
            // Close any open modals
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });
        }
        
        // Ctrl/Cmd + N for new research
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            window.location.hash = '#new-research';
        }
    }
    
    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause polling
            this.statusPoller.pauseAllPolling();
            this.state.setState({ isVisible: false });
        } else {
            // Page is visible, resume polling
            this.statusPoller.resumeAllPolling();
            this.state.setState({ isVisible: true });
            // Refresh data when page becomes visible
            this.loadInitialData();
        }
    }
    
    /**
     * Show/hide loading overlay
     */
    showLoading(show = true) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('d-none');
                overlay.classList.add('show');
            } else {
                overlay.classList.add('d-none');
                overlay.classList.remove('show');
            }
        }
        
        // Update state
        this.state.setState({ loading: show });
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.showLoading(false);
    }
    
    /**
     * Get application instance
     */
    static getInstance() {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make app globally available for debugging
    window.app = new App();
    
    // Add some helpful debugging methods
    window.debugApp = {
        getState: () => window.app.state.getState(),
        showNotification: (type, message) => window.app.notifications.show(type, message),
        clearStorage: () => {
            localStorage.clear();
            sessionStorage.clear();
            console.log('Storage cleared');
        }
    };
    
    console.log('AI Research System loaded. Use window.debugApp for debugging.');
});

export default App;