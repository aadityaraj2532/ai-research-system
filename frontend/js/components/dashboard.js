/**
 * Research Dashboard Component
 * Manages the display of research sessions with search, filtering, and pagination
 */

export class ResearchDashboard {
    constructor(container, state, api, notifications, statusPoller = null) {
        this.container = container;
        this.state = state;
        this.api = api;
        this.notifications = notifications;
        this.statusPoller = statusPoller;
        
        // Component state
        this.searchQuery = '';
        this.statusFilter = 'all';
        this.dateFilter = null;
        this.isLoading = false;
        this.activePolling = new Set(); // Track which sessions are being polled
        
        // Debounce timer for search
        this.searchDebounceTimer = null;
        
        // Bind methods
        this.handleSearch = this.handleSearch.bind(this);
        this.handleStatusFilter = this.handleStatusFilter.bind(this);
        this.handleDateFilter = this.handleDateFilter.bind(this);
        this.handleContinueResearch = this.handleContinueResearch.bind(this);
        this.refreshData = this.refreshData.bind(this);
        this.handleMultiSessionStatusUpdate = this.handleMultiSessionStatusUpdate.bind(this);
        
        // Subscribe to state changes
        this.unsubscribe = this.state.subscribe(this.onStateChange.bind(this));
    }
    
    /**
     * Render the dashboard component
     */
    render() {
        this.container.innerHTML = this.getTemplate();
        this.setupEventListeners();
        this.loadResearchSessions();
    }
    
    /**
     * Get the main dashboard template
     */
    getTemplate() {
        return `
            <div class="fade-in">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1><i class="bi bi-grid-3x3-gap"></i> Research Dashboard</h1>
                            <a href="#new-research" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> New Research
                            </a>
                        </div>
                    </div>
                </div>
                
                <!-- Search and Filters -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="input-group">
                            <span class="input-group-text">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" class="form-control" placeholder="Search research sessions..." 
                                   id="search-input" value="${this.searchQuery}">
                            ${this.searchQuery ? `
                                <button class="btn btn-outline-secondary" type="button" id="clear-search">
                                    <i class="bi bi-x"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="status-filter">
                            <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Status</option>
                            <option value="PENDING" ${this.statusFilter === 'PENDING' ? 'selected' : ''}>Pending</option>
                            <option value="PROCESSING" ${this.statusFilter === 'PROCESSING' ? 'selected' : ''}>Processing</option>
                            <option value="COMPLETED" ${this.statusFilter === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                            <option value="FAILED" ${this.statusFilter === 'FAILED' ? 'selected' : ''}>Failed</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <div class="input-group">
                            <input type="date" class="form-control" id="date-filter" 
                                   value="${this.dateFilter || ''}" placeholder="Filter by date">
                            ${this.dateFilter ? `
                                <button class="btn btn-outline-secondary" type="button" id="clear-date">
                                    <i class="bi bi-x"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Filter Summary -->
                <div class="row mb-3" id="filter-summary" style="display: none;">
                    <div class="col-12">
                        <div class="alert alert-info d-flex justify-content-between align-items-center">
                            <span id="filter-summary-text"></span>
                            <button class="btn btn-sm btn-outline-primary" id="clear-all-filters">
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Research Sessions -->
                <div class="row" id="sessions-container">
                    ${this.getLoadingTemplate()}
                </div>
                
                <!-- Pagination -->
                <div class="row mt-4" id="pagination-container" style="display: none;">
                    <div class="col-12">
                        <nav aria-label="Research sessions pagination">
                            <ul class="pagination justify-content-center" id="pagination-list">
                                <!-- Pagination items will be inserted here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get loading template
     */
    getLoadingTemplate() {
        return `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading research sessions...</span>
                </div>
                <p class="mt-3">Loading your research sessions...</p>
            </div>
        `;
    }
    
    /**
     * Get empty state template
     */
    getEmptyStateTemplate() {
        const hasFilters = this.searchQuery || this.statusFilter !== 'all' || this.dateFilter;
        
        if (hasFilters) {
            return `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-search fs-1 text-muted"></i>
                    <h3 class="mt-3">No Results Found</h3>
                    <p class="text-muted">No research sessions match your current filters.</p>
                    <button class="btn btn-outline-primary" id="clear-all-filters-empty">
                        <i class="bi bi-funnel"></i> Clear Filters
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search fs-1 text-muted"></i>
                <h3 class="mt-3">No Research Sessions Yet</h3>
                <p class="text-muted">Start your first research session to see it here.</p>
                <a href="#new-research" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> Start New Research
                </a>
            </div>
        `;
    }
    
    /**
     * Get error state template
     */
    getErrorStateTemplate() {
        return `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
                <h3 class="mt-3">Failed to Load Research Sessions</h3>
                <p class="text-muted">There was an error loading your research history.</p>
                <button class="btn btn-primary" id="retry-load">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch);
        }
        
        // Clear search button
        const clearSearch = document.getElementById('clear-search');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                this.searchQuery = '';
                this.updateFilters();
                this.render();
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', this.handleStatusFilter);
        }
        
        // Date filter
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', this.handleDateFilter);
        }
        
        // Clear date button
        const clearDate = document.getElementById('clear-date');
        if (clearDate) {
            clearDate.addEventListener('click', () => {
                this.dateFilter = null;
                this.updateFilters();
                this.render();
            });
        }
        
        // Clear all filters buttons
        const clearAllButtons = document.querySelectorAll('#clear-all-filters, #clear-all-filters-empty');
        clearAllButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.clearAllFilters();
            });
        });
        
        // Retry button
        const retryButton = document.getElementById('retry-load');
        if (retryButton) {
            retryButton.addEventListener('click', this.refreshData);
        }
        
        // Continue research buttons (delegated event handling)
        this.container.addEventListener('click', (event) => {
            if (event.target.classList.contains('continue-btn')) {
                const sessionId = event.target.dataset.sessionId;
                this.handleContinueResearch(sessionId);
            }
        });
    }
    
    /**
     * Handle search input with debouncing
     */
    handleSearch(event) {
        const query = event.target.value;
        
        // Clear previous timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // Set new timer
        this.searchDebounceTimer = setTimeout(() => {
            this.searchQuery = query;
            this.updateFilters();
            this.renderSessions();
        }, 300); // 300ms debounce
    }
    
    /**
     * Handle status filter change
     */
    handleStatusFilter(event) {
        this.statusFilter = event.target.value;
        this.updateFilters();
        this.renderSessions();
    }
    
    /**
     * Handle date filter change
     */
    handleDateFilter(event) {
        this.dateFilter = event.target.value || null;
        this.updateFilters();
        this.renderSessions();
    }
    
    /**
     * Update filters in state
     */
    updateFilters() {
        this.state.updateFilters({
            search: this.searchQuery,
            status: this.statusFilter,
            dateRange: this.dateFilter
        });
    }
    
    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.searchQuery = '';
        this.statusFilter = 'all';
        this.dateFilter = null;
        this.updateFilters();
        this.render();
    }
    
    /**
     * Load research sessions from API
     */
    async loadResearchSessions() {
        try {
            this.isLoading = true;
            const sessions = await this.api.getResearchHistory();
            this.state.setResearchHistory(sessions);
            this.renderSessions();
            
            // Start polling for active sessions
            this.startMultiSessionPolling(sessions);
            
        } catch (error) {
            console.error('Failed to load research sessions:', error);
            this.renderError();
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Refresh data
     */
    async refreshData() {
        await this.loadResearchSessions();
    }
    
    /**
     * Render research sessions
     */
    renderSessions() {
        const container = document.getElementById('sessions-container');
        if (!container) return;
        
        const filteredSessions = this.getFilteredSessions();
        
        // Update filter summary
        this.updateFilterSummary(filteredSessions.length);
        
        if (filteredSessions.length === 0) {
            container.innerHTML = this.getEmptyStateTemplate();
            this.setupEventListeners(); // Re-setup for empty state buttons
            return;
        }
        
        // Render session cards
        container.innerHTML = filteredSessions.map(session => 
            this.renderSessionCard(session)
        ).join('');
        
        // Setup event listeners for session cards
        this.setupSessionCardListeners();
    }
    
    /**
     * Render error state
     */
    renderError() {
        const container = document.getElementById('sessions-container');
        if (container) {
            container.innerHTML = this.getErrorStateTemplate();
            this.setupEventListeners(); // Re-setup for retry button
        }
    }
    
    /**
     * Get filtered sessions
     */
    getFilteredSessions() {
        return this.state.getFilteredSessions();
    }
    
    /**
     * Update filter summary
     */
    updateFilterSummary(resultCount) {
        const summaryContainer = document.getElementById('filter-summary');
        const summaryText = document.getElementById('filter-summary-text');
        
        if (!summaryContainer || !summaryText) return;
        
        const hasFilters = this.searchQuery || this.statusFilter !== 'all' || this.dateFilter;
        
        if (hasFilters) {
            let summary = `Showing ${resultCount} result${resultCount !== 1 ? 's' : ''}`;
            
            const filters = [];
            if (this.searchQuery) filters.push(`matching "${this.searchQuery}"`);
            if (this.statusFilter !== 'all') filters.push(`with status "${this.statusFilter}"`);
            if (this.dateFilter) filters.push(`from ${new Date(this.dateFilter).toLocaleDateString()}`);
            
            if (filters.length > 0) {
                summary += ` ${filters.join(', ')}`;
            }
            
            summaryText.textContent = summary;
            summaryContainer.style.display = 'block';
        } else {
            summaryContainer.style.display = 'none';
        }
    }
    
    /**
     * Render individual session card
     */
    renderSessionCard(session) {
        const statusClass = this.getStatusClass(session.status);
        const timeAgo = this.formatTimeAgo(session.created_at);
        const isPolling = this.activePolling.has(session.id);
        
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card research-card h-100" data-session-id="${session.id}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge status-badge bg-${statusClass}">${session.status}</span>
                            ${isPolling ? `
                                <div class="polling-indicator-small" title="Live updates active">
                                    <div class="spinner-border spinner-border-sm text-primary" role="status" style="width: 0.8rem; height: 0.8rem;">
                                        <span class="visually-hidden">Updating...</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <small class="text-muted">${timeAgo}</small>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${this.truncateText(session.query, 100)}</h6>
                        <p class="card-text text-muted">
                            ${session.summary ? this.truncateText(session.summary, 150) : 'Research in progress...'}
                        </p>
                        ${session.cost ? `
                            <div class="d-flex justify-content-between text-sm mt-2">
                                <span class="text-muted">
                                    <i class="bi bi-cpu"></i> ${session.cost.total_tokens || 0} tokens
                                </span>
                                <span class="text-muted">
                                    <i class="bi bi-currency-dollar"></i> ${session.cost.estimated_cost || '0.00'}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <a href="#research/${session.id}" class="btn btn-outline-primary btn-sm">
                                <i class="bi bi-eye"></i> View
                            </a>
                            ${session.status === 'COMPLETED' ? `
                                <button class="btn btn-outline-secondary btn-sm continue-btn" 
                                        data-session-id="${session.id}">
                                    <i class="bi bi-arrow-right-circle"></i> Continue
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners for session cards
     */
    setupSessionCardListeners() {
        // Card click navigation
        const cards = document.querySelectorAll('.research-card');
        cards.forEach(card => {
            card.addEventListener('click', (event) => {
                // Don't navigate if clicking on buttons
                if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') {
                    return;
                }
                
                const sessionId = card.dataset.sessionId;
                window.location.hash = `research/${sessionId}`;
            });
        });
    }
    
    /**
     * Handle continue research
     */
    handleContinueResearch(sessionId) {
        // Navigate to new research form with continuation context
        window.location.hash = `new-research?continue=${sessionId}`;
    }
    
    /**
     * Handle state changes
     */
    onStateChange(newState) {
        // Re-render if research history changed
        if (newState.researchHistory !== this.state.getState().researchHistory) {
            this.renderSessions();
        }
    }
    
    /**
     * Utility methods
     */
    getStatusClass(status) {
        const statusClasses = {
            'PENDING': 'warning',
            'PROCESSING': 'info',
            'COMPLETED': 'success',
            'FAILED': 'danger'
        };
        return statusClasses[status] || 'secondary';
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }
    
    /**
     * Cleanup component
     */
    destroy() {
        // Clear debounce timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // Stop all polling
        this.stopAllPolling();
        
        // Unsubscribe from state changes
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
    
    /**
     * Start polling for multiple active sessions
     */
    startMultiSessionPolling(sessions) {
        if (!this.statusPoller) return;
        
        // Stop existing polling
        this.stopAllPolling();
        
        // Start polling for active sessions
        sessions.forEach(session => {
            if (this.isSessionActive(session.status)) {
                this.startSessionPolling(session.id);
            }
        });
    }
    
    /**
     * Start polling for a specific session
     */
    startSessionPolling(sessionId) {
        if (!this.statusPoller || this.activePolling.has(sessionId)) return;
        
        console.log(`Starting dashboard polling for session ${sessionId}`);
        this.activePolling.add(sessionId);
        
        this.statusPoller.startPolling(
            sessionId,
            (updatedSession, isActive) => this.handleMultiSessionStatusUpdate(sessionId, updatedSession, isActive),
            {
                interval: 10000, // Poll every 10 seconds for dashboard (less frequent)
                onlyActiveStates: true
            }
        );
    }
    
    /**
     * Stop polling for a specific session
     */
    stopSessionPolling(sessionId) {
        if (!this.statusPoller || !this.activePolling.has(sessionId)) return;
        
        console.log(`Stopping dashboard polling for session ${sessionId}`);
        this.activePolling.delete(sessionId);
        this.statusPoller.stopPolling(sessionId);
    }
    
    /**
     * Stop all active polling
     */
    stopAllPolling() {
        if (!this.statusPoller) return;
        
        this.activePolling.forEach(sessionId => {
            this.statusPoller.stopPolling(sessionId);
        });
        this.activePolling.clear();
    }
    
    /**
     * Handle status updates for multiple sessions
     */
    handleMultiSessionStatusUpdate(sessionId, updatedSession, isActive) {
        if (!updatedSession) return;
        
        // Update session in state
        const currentSessions = this.state.getState().researchHistory || [];
        const updatedSessions = currentSessions.map(session => 
            session.id === sessionId ? updatedSession : session
        );
        
        this.state.setResearchHistory(updatedSessions);
        
        // Re-render sessions to show updated status
        this.renderSessions();
        
        // Stop polling if session is no longer active
        if (!isActive) {
            this.stopSessionPolling(sessionId);
        }
    }
    
    /**
     * Check if session status is active (needs polling)
     */
    isSessionActive(status) {
        return ['PENDING', 'PROCESSING'].includes(status);
    }
    
    /**
     * Get count of active polling sessions
     */
    getActivePollingCount() {
        return this.activePolling.size;
    }
}