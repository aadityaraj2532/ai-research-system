/**
 * Client-side Router
 * Handles hash-based routing for single-page navigation
 */

import { ResearchDashboard } from './components/dashboard.js';
import { ResearchForm } from './components/research-form.js';
import { SessionViewer } from './components/session-viewer.js';

export class Router {
    constructor(state, api, notifications, statusPoller = null) {
        this.state = state;
        this.api = api;
        this.notifications = notifications;
        this.statusPoller = statusPoller;
        this.routes = new Map();
        this.currentRoute = null;
        this.currentComponent = null;
        
        // Bind methods
        this.handleHashChange = this.handleHashChange.bind(this);
        
        this.setupRoutes();
    }
    
    /**
     * Initialize the router
     */
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', this.handleHashChange);
        
        // Handle initial route
        this.handleHashChange();
    }
    
    /**
     * Setup route definitions
     */
    setupRoutes() {
        this.routes.set('', this.renderDashboard.bind(this));
        this.routes.set('dashboard', this.renderDashboard.bind(this));
        this.routes.set('new-research', this.renderNewResearch.bind(this));
        this.routes.set('research', this.renderResearchDetail.bind(this));
    }
    
    /**
     * Handle hash change events
     */
    handleHashChange() {
        const hash = window.location.hash.slice(1); // Remove #
        const [route, ...params] = hash.split('/');
        
        console.log('Navigating to:', route, params);
        
        // Cleanup previous component
        if (this.currentComponent && typeof this.currentComponent.destroy === 'function') {
            this.currentComponent.destroy();
        }
        
        // Update active navigation
        this.updateActiveNavigation(route);
        
        // Route to appropriate handler
        if (this.routes.has(route)) {
            this.currentRoute = route;
            this.routes.get(route)(params);
        } else {
            // Default to dashboard for unknown routes
            this.navigate('dashboard');
        }
    }
    
    /**
     * Navigate to a specific route
     */
    navigate(route, params = []) {
        const hash = params.length > 0 ? `${route}/${params.join('/')}` : route;
        window.location.hash = hash;
    }
    
    /**
     * Update active navigation styling
     */
    updateActiveNavigation(currentRoute) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                const linkRoute = href.slice(1); // Remove #
                if (linkRoute === currentRoute || 
                    (currentRoute === '' && linkRoute === 'dashboard')) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    }
    
    /**
     * Render dashboard view
     */
    renderDashboard() {
        const container = document.getElementById('app-content');
        
        // Create dashboard component instance
        const dashboard = new ResearchDashboard(container, this.state, this.api, this.notifications, this.statusPoller);
        dashboard.render();
        
        // Store reference for cleanup if needed
        this.currentComponent = dashboard;
    }
    
    /**
     * Render new research form
     */
    renderNewResearch(params = []) {
        const container = document.getElementById('app-content');
        
        // Check for parent research ID in URL parameters
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const parentResearchId = urlParams.get('parent');
        
        // Create research form component instance
        const researchForm = new ResearchForm(container, this.state, this.api, this.notifications);
        researchForm.render(parentResearchId);
        
        // Store reference for cleanup if needed
        this.currentComponent = researchForm;
    }
    
    /**
     * Render research detail view
     */
    renderResearchDetail(params) {
        const researchId = params[0];
        if (!researchId) {
            this.navigate('dashboard');
            return;
        }
        
        const container = document.getElementById('app-content');
        
        // Create session viewer component instance
        const sessionViewer = new SessionViewer(container, this.state, this.api, this.notifications, this.statusPoller);
        sessionViewer.render(researchId);
        
        // Store reference for cleanup if needed
        this.currentComponent = sessionViewer;
    }
}