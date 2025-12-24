/**
 * Session Viewer Component
 * Displays detailed view of individual research sessions with results and metadata
 */

export class SessionViewer {
    constructor(container, state, api, notifications, statusPoller = null) {
        this.container = container;
        this.state = state;
        this.api = api;
        this.notifications = notifications;
        this.statusPoller = statusPoller;
        
        // Component state
        this.currentSession = null;
        this.isLoading = false;
        this.error = null;
        this.isPolling = false;
        
        // Bind methods
        this.handleContinueResearch = this.handleContinueResearch.bind(this);
        this.handleDeleteSession = this.handleDeleteSession.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
        this.handleFileDownload = this.handleFileDownload.bind(this);
        this.handleStatusUpdate = this.handleStatusUpdate.bind(this);
    }
    
    /**
     * Render the session viewer for a specific research session
     */
    async render(sessionId) {
        if (!sessionId) {
            this.renderError('No session ID provided');
            return;
        }
        
        // Stop any existing polling
        this.stopPolling();
        
        // Show loading state
        this.renderLoading();
        
        try {
            // Fetch session details
            const session = await this.api.getResearchDetails(sessionId);
            this.currentSession = session;
            
            // Render session content
            this.renderSession(session);
            
            // Start polling if session is active and poller is available
            if (this.statusPoller && this.isSessionActive(session.status)) {
                this.startPolling();
            }
            
        } catch (error) {
            console.error('Failed to load session:', error);
            this.renderError(error.message || 'Failed to load research session');
        }
    }
    
    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            <div class="session-viewer-loading">
                <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <h5 class="text-muted">Loading research session...</h5>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render error state
     */
    renderError(message) {
        this.container.innerHTML = `
            <div class="session-viewer-error">
                <div class="alert alert-danger" role="alert">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <div>
                            <h6 class="alert-heading mb-1">Failed to Load Session</h6>
                            <p class="mb-0">${message}</p>
                        </div>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-outline-danger btn-sm" onclick="history.back()">
                            <i class="bi bi-arrow-left"></i> Go Back
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render session details
     */
    renderSession(session) {
        this.container.innerHTML = `
            <div class="session-viewer fade-in">
                <!-- Session Header -->
                <div class="session-header mb-4">
                    <div class="row align-items-center">
                        <div class="col">
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item">
                                        <a href="#dashboard" class="text-decoration-none">
                                            <i class="bi bi-house"></i> Dashboard
                                        </a>
                                    </li>
                                    <li class="breadcrumb-item active" aria-current="page">
                                        Research Session
                                    </li>
                                </ol>
                            </nav>
                            <div class="d-flex align-items-center gap-3">
                                <h1 class="h3 mb-0">Research Session</h1>
                                ${this.renderStatusBadge(session.status)}
                            </div>
                            <p class="text-muted mb-0">
                                <i class="bi bi-calendar3"></i> 
                                Created ${this.formatDate(session.created_at)}
                                ${session.updated_at !== session.created_at ? 
                                    `• Updated ${this.formatDate(session.updated_at)}` : ''
                                }
                            </p>
                        </div>
                        <div class="col-auto">
                            <div class="d-flex align-items-center gap-2">
                                <!-- Polling Indicator -->
                                <div class="polling-indicator d-none"></div>
                                
                                <div class="btn-group" role="group">
                                    <button 
                                        type="button" 
                                        class="btn btn-outline-secondary btn-sm"
                                        onclick="window.app.router.currentComponent.handleRefresh()"
                                        title="Refresh session data"
                                    >
                                        <i class="bi bi-arrow-clockwise"></i>
                                    </button>
                                    ${session.status === 'COMPLETED' ? `
                                        <button 
                                            type="button" 
                                            class="btn btn-primary btn-sm"
                                            onclick="window.app.router.currentComponent.handleContinueResearch()"
                                            title="Continue this research"
                                        >
                                            <i class="bi bi-arrow-right-circle"></i> Continue
                                        </button>
                                    ` : ''}
                                    <div class="dropdown">
                                        <button 
                                            class="btn btn-outline-secondary btn-sm dropdown-toggle" 
                                            type="button" 
                                            data-bs-toggle="dropdown"
                                            title="More actions"
                                        >
                                            <i class="bi bi-three-dots"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li>
                                                <a class="dropdown-item" href="#" onclick="window.app.router.currentComponent.handleRefresh()">
                                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                                </a>
                                            </li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li>
                                                <a class="dropdown-item text-danger" href="#" onclick="window.app.router.currentComponent.handleDeleteSession()">
                                                    <i class="bi bi-trash"></i> Delete Session
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Research Query -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-search"></i> Research Query
                        </h5>
                    </div>
                    <div class="card-body">
                        <blockquote class="blockquote mb-0">
                            <p class="research-query">${this.escapeHtml(session.query)}</p>
                        </blockquote>
                        ${session.parent_research_id ? `
                            <div class="mt-3 pt-3 border-top">
                                <small class="text-muted">
                                    <i class="bi bi-arrow-up-right-circle"></i>
                                    This research continues from 
                                    <a href="#research/${session.parent_research_id}" class="text-decoration-none">
                                        previous session
                                    </a>
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Main Content Grid -->
                <div class="row">
                    <!-- Research Results -->
                    <div class="col-lg-8">
                        ${this.renderResearchResults(session)}
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="col-lg-4">
                        ${this.renderSidebar(session)}
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    /**
     * Render research results section
     */
    renderResearchResults(session) {
        if (session.status === 'PENDING' || session.status === 'PROCESSING') {
            return `
                <div class="card">
                    <div class="card-body text-center py-5">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Processing...</span>
                        </div>
                        <h5 class="text-muted">Research in Progress</h5>
                        <p class="text-muted mb-0">
                            Your research is being processed. Results will appear here when complete.
                        </p>
                        ${session.status === 'PROCESSING' ? `
                            <div class="mt-3">
                                <small class="text-muted">
                                    <i class="bi bi-clock"></i> 
                                    This may take several minutes depending on the complexity of your query.
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        if (session.status === 'FAILED') {
            return `
                <div class="card border-danger">
                    <div class="card-header bg-danger text-white">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-exclamation-triangle"></i> Research Failed
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-danger">
                            <h6 class="alert-heading">Error Details</h6>
                            <p class="mb-0">${session.error_message || 'An unknown error occurred during research processing.'}</p>
                        </div>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-outline-danger" onclick="window.app.router.currentComponent.handleRefresh()">
                                <i class="bi bi-arrow-clockwise"></i> Retry
                            </button>
                            <a href="#new-research" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> Start New Research
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Completed research results
        return `
            <!-- Research Summary -->
            ${session.summary ? `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-lightbulb"></i> Executive Summary
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="research-summary">
                            ${this.formatContent(session.summary)}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Full Research Report -->
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-file-text"></i> Research Report
                    </h5>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-secondary" onclick="window.print()">
                            <i class="bi bi-printer"></i> Print
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="navigator.clipboard.writeText(document.querySelector('.research-report').innerText)">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="research-report">
                        ${session.report ? this.formatContent(session.report) : `
                            <div class="text-muted text-center py-4">
                                <i class="bi bi-file-text fs-1 mb-3"></i>
                                <p>No detailed report available for this research session.</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            <!-- Research Reasoning -->
            ${session.reasoning ? `
                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-gear"></i> Research Methodology
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="research-reasoning">
                            ${this.formatContent(session.reasoning)}
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }
    
    /**
     * Render sidebar with metadata, costs, and files
     */
    renderSidebar(session) {
        return `
            <!-- Session Metadata -->
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="card-title mb-0">
                        <i class="bi bi-info-circle"></i> Session Details
                    </h6>
                </div>
                <div class="card-body">
                    <dl class="row mb-0">
                        <dt class="col-sm-4">ID</dt>
                        <dd class="col-sm-8">
                            <code class="small">${session.id}</code>
                        </dd>
                        
                        <dt class="col-sm-4">Status</dt>
                        <dd class="col-sm-8">
                            ${this.renderStatusBadge(session.status)}
                        </dd>
                        
                        <dt class="col-sm-4">Created</dt>
                        <dd class="col-sm-8">
                            <small>${this.formatDateTime(session.created_at)}</small>
                        </dd>
                        
                        ${session.completed_at ? `
                            <dt class="col-sm-4">Completed</dt>
                            <dd class="col-sm-8">
                                <small>${this.formatDateTime(session.completed_at)}</small>
                            </dd>
                            
                            <dt class="col-sm-4">Duration</dt>
                            <dd class="col-sm-8">
                                <small>${this.calculateDuration(session.created_at, session.completed_at)}</small>
                            </dd>
                        ` : ''}
                        
                        ${session.parent_research_id ? `
                            <dt class="col-sm-4">Parent</dt>
                            <dd class="col-sm-8">
                                <a href="#research/${session.parent_research_id}" class="text-decoration-none small">
                                    <i class="bi bi-arrow-up-right-circle"></i> View Parent
                                </a>
                            </dd>
                        ` : ''}
                    </dl>
                </div>
            </div>
            
            <!-- Cost Tracking -->
            ${this.renderCostTracking(session)}
            
            <!-- Uploaded Files -->
            ${this.renderUploadedFiles(session)}
            
            <!-- Research Lineage -->
            ${this.renderResearchLineage(session)}
        `;
    }
    
    /**
     * Render cost tracking information
     */
    renderCostTracking(session) {
        if (!session.cost) {
            return '';
        }
        
        const cost = session.cost;
        
        return `
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="card-title mb-0">
                        <i class="bi bi-currency-dollar"></i> Cost Breakdown
                    </h6>
                </div>
                <div class="card-body">
                    <!-- Total Cost -->
                    <div class="cost-summary mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold">Total Cost</span>
                            <span class="h5 mb-0 text-primary">
                                ${this.formatCurrency(cost.estimated_cost)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Token Usage -->
                    <div class="token-usage mb-3">
                        <h6 class="small text-muted mb-2">Token Usage</h6>
                        <div class="row g-2">
                            <div class="col-6">
                                <div class="text-center p-2 bg-light rounded">
                                    <div class="fw-bold text-success">${this.formatNumber(cost.input_tokens)}</div>
                                    <small class="text-muted">Input</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="text-center p-2 bg-light rounded">
                                    <div class="fw-bold text-info">${this.formatNumber(cost.output_tokens)}</div>
                                    <small class="text-muted">Output</small>
                                </div>
                            </div>
                        </div>
                        <div class="text-center mt-2">
                            <small class="text-muted">
                                Total: ${this.formatNumber(cost.total_tokens)} tokens
                            </small>
                        </div>
                    </div>
                    
                    <!-- Provider Breakdown -->
                    ${cost.provider_costs && Object.keys(cost.provider_costs).length > 0 ? `
                        <div class="provider-costs">
                            <h6 class="small text-muted mb-2">By Provider</h6>
                            ${Object.entries(cost.provider_costs).map(([provider, providerCost]) => `
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="small">${this.capitalizeFirst(provider)}</span>
                                    <span class="small fw-bold">${this.formatCurrency(providerCost)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render uploaded files section
     */
    renderUploadedFiles(session) {
        if (!session.files || session.files.length === 0) {
            return '';
        }
        
        return `
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="card-title mb-0">
                        <i class="bi bi-paperclip"></i> Context Files (${session.files.length})
                    </h6>
                </div>
                <div class="card-body">
                    <div class="file-list">
                        ${session.files.map(file => `
                            <div class="file-item d-flex align-items-center justify-content-between mb-2 p-2 border rounded">
                                <div class="file-info d-flex align-items-center">
                                    <i class="bi ${this.getFileIcon(file.file_type)} me-2 text-muted"></i>
                                    <div>
                                        <div class="file-name small fw-bold" title="${file.original_name}">
                                            ${this.truncateText(file.original_name, 25)}
                                        </div>
                                        <div class="file-meta text-muted" style="font-size: 0.75rem;">
                                            ${this.formatFileSize(file.file_size)} • 
                                            ${this.getFileTypeLabel(file.file_type)}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    class="btn btn-sm btn-outline-secondary"
                                    onclick="window.app.router.currentComponent.handleFileDownload('${file.id}')"
                                    title="Download file"
                                >
                                    <i class="bi bi-download"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render research lineage (parent/child relationships)
     */
    renderResearchLineage(session) {
        // This would be populated with actual lineage data from the API
        // For now, just show if there's a parent relationship
        if (!session.parent_research_id && (!session.child_sessions || session.child_sessions.length === 0)) {
            return '';
        }
        
        return `
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="card-title mb-0">
                        <i class="bi bi-diagram-3"></i> Research Chain
                    </h6>
                </div>
                <div class="card-body">
                    ${session.parent_research_id ? `
                        <div class="lineage-item mb-2">
                            <div class="d-flex align-items-center">
                                <i class="bi bi-arrow-up text-muted me-2"></i>
                                <a href="#research/${session.parent_research_id}" class="text-decoration-none small">
                                    Parent Research Session
                                </a>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="lineage-item current mb-2">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-circle-fill text-primary me-2" style="font-size: 0.5rem;"></i>
                            <span class="small fw-bold">Current Session</span>
                        </div>
                    </div>
                    
                    ${session.child_sessions && session.child_sessions.length > 0 ? `
                        ${session.child_sessions.map(childId => `
                            <div class="lineage-item mb-2">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-arrow-down text-muted me-2"></i>
                                    <a href="#research/${childId}" class="text-decoration-none small">
                                        Child Research Session
                                    </a>
                                </div>
                            </div>
                        `).join('')}
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add any additional event listeners here
        // Most events are handled via onclick attributes for simplicity
    }
    
    /**
     * Handle continue research action
     */
    handleContinueResearch() {
        if (!this.currentSession) return;
        
        // Navigate to new research form with parent ID
        window.location.hash = `#new-research?parent=${this.currentSession.id}`;
    }
    
    /**
     * Handle delete session action
     */
    async handleDeleteSession() {
        if (!this.currentSession) return;
        
        const confirmed = confirm(
            'Are you sure you want to delete this research session? This action cannot be undone.'
        );
        
        if (!confirmed) return;
        
        try {
            await this.api.deleteResearch(this.currentSession.id);
            this.notifications.showSuccess('Research session deleted successfully');
            
            // Navigate back to dashboard
            window.location.hash = '#dashboard';
            
        } catch (error) {
            console.error('Failed to delete session:', error);
            this.notifications.showError('Failed to delete research session');
        }
    }
    
    /**
     * Handle refresh action
     */
    async handleRefresh() {
        if (!this.currentSession) return;
        
        try {
            const session = await this.api.getResearchDetails(this.currentSession.id);
            this.currentSession = session;
            this.renderSession(session);
            this.notifications.showSuccess('Session data refreshed');
            
        } catch (error) {
            console.error('Failed to refresh session:', error);
            this.notifications.showError('Failed to refresh session data');
        }
    }
    
    /**
     * Handle file download
     */
    async handleFileDownload(fileId) {
        try {
            // This would implement actual file download
            // For now, just show a notification
            this.notifications.showInfo('File download functionality not yet implemented');
            
        } catch (error) {
            console.error('Failed to download file:', error);
            this.notifications.showError('Failed to download file');
        }
    }
    
    /**
     * Start status polling for the current session
     */
    startPolling() {
        if (!this.statusPoller || !this.currentSession) return;
        
        console.log(`Starting status polling for session ${this.currentSession.id}`);
        this.isPolling = true;
        
        this.statusPoller.startPolling(
            this.currentSession.id,
            this.handleStatusUpdate,
            {
                interval: 3000, // Poll every 3 seconds for session view
                onlyActiveStates: true
            }
        );
        
        // Update UI to show polling indicator
        this.updatePollingIndicator(true);
    }
    
    /**
     * Stop status polling
     */
    stopPolling() {
        if (!this.statusPoller || !this.currentSession) return;
        
        console.log(`Stopping status polling for session ${this.currentSession.id}`);
        this.isPolling = false;
        
        this.statusPoller.stopPolling(this.currentSession.id);
        
        // Update UI to hide polling indicator
        this.updatePollingIndicator(false);
    }
    
    /**
     * Handle status updates from polling
     */
    handleStatusUpdate(updatedSession, isActive) {
        if (!updatedSession || updatedSession.id !== this.currentSession.id) return;
        
        const previousStatus = this.currentSession.status;
        this.currentSession = updatedSession;
        
        // Update the session display
        this.renderSession(updatedSession);
        
        // Show notification if status changed
        if (previousStatus !== updatedSession.status) {
            this.showStatusChangeNotification(previousStatus, updatedSession.status);
        }
        
        // Stop polling if session is no longer active
        if (!isActive) {
            this.stopPolling();
        }
    }
    
    /**
     * Update polling indicator in UI
     */
    updatePollingIndicator(isPolling) {
        const indicator = document.querySelector('.polling-indicator');
        if (indicator) {
            if (isPolling) {
                indicator.classList.remove('d-none');
                indicator.innerHTML = `
                    <div class="d-flex align-items-center text-muted">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Updating...</span>
                        </div>
                        <small>Live updates active</small>
                    </div>
                `;
            } else {
                indicator.classList.add('d-none');
            }
        }
    }
    
    /**
     * Show notification when status changes
     */
    showStatusChangeNotification(oldStatus, newStatus) {
        if (newStatus === 'COMPLETED') {
            this.notifications.showSuccess('Research completed successfully!');
        } else if (newStatus === 'FAILED') {
            this.notifications.showError('Research failed. Check the details below.');
        } else if (newStatus === 'PROCESSING' && oldStatus === 'PENDING') {
            this.notifications.showInfo('Research processing has started...');
        }
    }
    
    /**
     * Check if session status is active (needs polling)
     */
    isSessionActive(status) {
        return ['PENDING', 'PROCESSING'].includes(status);
    }
    
    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        this.stopPolling();
    }
    
    // Utility Methods
    
    /**
     * Render status badge
     */
    renderStatusBadge(status) {
        const statusConfig = {
            'PENDING': { class: 'bg-warning', icon: 'clock', text: 'Pending' },
            'PROCESSING': { class: 'bg-info', icon: 'gear', text: 'Processing' },
            'COMPLETED': { class: 'bg-success', icon: 'check-circle', text: 'Completed' },
            'FAILED': { class: 'bg-danger', icon: 'x-circle', text: 'Failed' }
        };
        
        const config = statusConfig[status] || { class: 'bg-secondary', icon: 'question', text: status };
        
        return `
            <span class="badge ${config.class}">
                <i class="bi bi-${config.icon}"></i> ${config.text}
            </span>
        `;
    }
    
    /**
     * Format content (markdown-like formatting)
     */
    formatContent(content) {
        if (!content) return '';
        
        // Basic markdown-like formatting
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }
    
    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'today';
        } else if (diffDays === 1) {
            return 'yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    /**
     * Format date and time
     */
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    /**
     * Calculate duration between two dates
     */
    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end - start;
        
        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (typeof amount !== 'number') return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(amount);
    }
    
    /**
     * Format number with commas
     */
    formatNumber(number) {
        if (typeof number !== 'number') return '0';
        return new Intl.NumberFormat('en-US').format(number);
    }
    
    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Get file icon based on type
     */
    getFileIcon(fileType) {
        const iconMap = {
            'application/pdf': 'bi-file-earmark-pdf',
            'text/plain': 'bi-file-earmark-text',
            'application/msword': 'bi-file-earmark-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'bi-file-earmark-word'
        };
        
        return iconMap[fileType] || 'bi-file-earmark';
    }
    
    /**
     * Get file type label
     */
    getFileTypeLabel(fileType) {
        const labelMap = {
            'application/pdf': 'PDF',
            'text/plain': 'TXT',
            'application/msword': 'DOC',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX'
        };
        
        return labelMap[fileType] || 'FILE';
    }
    
    /**
     * Truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}