/**
 * Status Polling System
 * Handles real-time status updates for active research sessions
 */

export class StatusPoller {
    constructor(api, notifications) {
        this.api = api;
        this.notifications = notifications;
        
        // Polling configuration
        this.pollingInterval = 5000; // 5 seconds
        this.maxRetries = 3;
        this.backoffMultiplier = 2;
        
        // Active polling state
        this.activeSessions = new Map(); // sessionId -> polling config
        this.pollingTimers = new Map(); // sessionId -> timer ID
        this.retryCount = new Map(); // sessionId -> retry count
        
        // Callbacks for status updates
        this.statusCallbacks = new Map(); // sessionId -> callback function
        
        // Bind methods
        this.startPolling = this.startPolling.bind(this);
        this.stopPolling = this.stopPolling.bind(this);
        this.pollSession = this.pollSession.bind(this);
        this.handlePollingError = this.handlePollingError.bind(this);
    }
    
    /**
     * Start polling for a research session
     * @param {string} sessionId - Research session ID
     * @param {Function} onStatusUpdate - Callback for status updates
     * @param {Object} options - Polling options
     */
    startPolling(sessionId, onStatusUpdate, options = {}) {
        if (!sessionId || typeof onStatusUpdate !== 'function') {
            console.error('Invalid parameters for status polling');
            return;
        }
        
        // Stop existing polling for this session
        this.stopPolling(sessionId);
        
        // Configure polling options
        const config = {
            interval: options.interval || this.pollingInterval,
            maxRetries: options.maxRetries || this.maxRetries,
            onlyActiveStates: options.onlyActiveStates !== false, // Default true
            ...options
        };
        
        // Store session configuration
        this.activeSessions.set(sessionId, config);
        this.statusCallbacks.set(sessionId, onStatusUpdate);
        this.retryCount.set(sessionId, 0);
        
        console.log(`Starting status polling for session ${sessionId}`);
        
        // Start immediate poll
        this.pollSession(sessionId);
        
        // Schedule regular polling
        const timerId = setInterval(() => {
            this.pollSession(sessionId);
        }, config.interval);
        
        this.pollingTimers.set(sessionId, timerId);
    }
    
    /**
     * Stop polling for a research session
     * @param {string} sessionId - Research session ID
     */
    stopPolling(sessionId) {
        if (!sessionId) return;
        
        // Clear timer
        const timerId = this.pollingTimers.get(sessionId);
        if (timerId) {
            clearInterval(timerId);
            this.pollingTimers.delete(sessionId);
        }
        
        // Clean up state
        this.activeSessions.delete(sessionId);
        this.statusCallbacks.delete(sessionId);
        this.retryCount.delete(sessionId);
        
        console.log(`Stopped status polling for session ${sessionId}`);
    }
    
    /**
     * Stop all active polling
     */
    stopAllPolling() {
        const sessionIds = Array.from(this.activeSessions.keys());
        sessionIds.forEach(sessionId => this.stopPolling(sessionId));
        
        console.log('Stopped all status polling');
    }
    
    /**
     * Poll a specific session for status updates
     * @param {string} sessionId - Research session ID
     */
    async pollSession(sessionId) {
        const config = this.activeSessions.get(sessionId);
        const callback = this.statusCallbacks.get(sessionId);
        
        if (!config || !callback) {
            console.warn(`No configuration found for session ${sessionId}`);
            this.stopPolling(sessionId);
            return;
        }
        
        try {
            // Fetch current session status
            const session = await this.api.getResearchDetails(sessionId);
            
            // Reset retry count on successful poll
            this.retryCount.set(sessionId, 0);
            
            // Check if session is still active
            const isActive = this.isSessionActive(session.status);
            
            // Call status update callback
            callback(session, isActive);
            
            // Stop polling if session is no longer active
            if (config.onlyActiveStates && !isActive) {
                console.log(`Session ${sessionId} completed, stopping polling`);
                this.stopPolling(sessionId);
                
                // Show completion notification
                this.showCompletionNotification(session);
            }
            
        } catch (error) {
            console.error(`Failed to poll session ${sessionId}:`, error);
            this.handlePollingError(sessionId, error);
        }
    }
    
    /**
     * Handle polling errors with retry logic
     * @param {string} sessionId - Research session ID
     * @param {Error} error - The error that occurred
     */
    handlePollingError(sessionId, error) {
        const config = this.activeSessions.get(sessionId);
        const currentRetries = this.retryCount.get(sessionId) || 0;
        
        if (!config) return;
        
        // Increment retry count
        this.retryCount.set(sessionId, currentRetries + 1);
        
        // Check if we should continue retrying
        if (currentRetries < config.maxRetries) {
            // Calculate backoff delay
            const delay = config.interval * Math.pow(this.backoffMultiplier, currentRetries);
            
            console.log(`Retrying session ${sessionId} poll in ${delay}ms (attempt ${currentRetries + 1}/${config.maxRetries})`);
            
            // Schedule retry with backoff
            setTimeout(() => {
                if (this.activeSessions.has(sessionId)) {
                    this.pollSession(sessionId);
                }
            }, delay);
            
        } else {
            // Max retries reached, stop polling and notify
            console.error(`Max retries reached for session ${sessionId}, stopping polling`);
            this.stopPolling(sessionId);
            
            // Show error notification
            if (this.isNetworkError(error)) {
                this.notifications.showWarning(
                    'Lost connection to server. Status updates paused. Please refresh to resume.'
                );
            } else {
                this.notifications.showError(
                    'Failed to get status updates. Please refresh the page.'
                );
            }
        }
    }
    
    /**
     * Check if a session status is considered active
     * @param {string} status - Session status
     * @returns {boolean} True if session is active
     */
    isSessionActive(status) {
        const activeStates = ['PENDING', 'PROCESSING'];
        return activeStates.includes(status);
    }
    
    /**
     * Check if error is a network-related error
     * @param {Error} error - The error to check
     * @returns {boolean} True if network error
     */
    isNetworkError(error) {
        return error.status === 0 || 
               error.status === 408 || 
               error.name === 'AbortError' ||
               error.message.includes('network') ||
               error.message.includes('timeout');
    }
    
    /**
     * Show completion notification for finished research
     * @param {Object} session - Research session data
     */
    showCompletionNotification(session) {
        if (session.status === 'COMPLETED') {
            this.notifications.showSuccess(
                `Research completed: "${this.truncateText(session.query, 50)}"`,
                {
                    duration: 8000,
                    actions: [
                        {
                            text: 'View Results',
                            action: () => {
                                window.location.hash = `#research/${session.id}`;
                            }
                        }
                    ]
                }
            );
        } else if (session.status === 'FAILED') {
            this.notifications.showError(
                `Research failed: "${this.truncateText(session.query, 50)}"`,
                {
                    duration: 10000,
                    actions: [
                        {
                            text: 'View Details',
                            action: () => {
                                window.location.hash = `#research/${session.id}`;
                            }
                        }
                    ]
                }
            );
        }
    }
    
    /**
     * Get polling status for a session
     * @param {string} sessionId - Research session ID
     * @returns {Object|null} Polling status or null if not polling
     */
    getPollingStatus(sessionId) {
        if (!this.activeSessions.has(sessionId)) {
            return null;
        }
        
        return {
            isPolling: true,
            config: this.activeSessions.get(sessionId),
            retryCount: this.retryCount.get(sessionId) || 0,
            timerId: this.pollingTimers.get(sessionId)
        };
    }
    
    /**
     * Get all active polling sessions
     * @returns {Array} Array of session IDs being polled
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.keys());
    }
    
    /**
     * Update polling interval for a session
     * @param {string} sessionId - Research session ID
     * @param {number} newInterval - New polling interval in milliseconds
     */
    updatePollingInterval(sessionId, newInterval) {
        const config = this.activeSessions.get(sessionId);
        const callback = this.statusCallbacks.get(sessionId);
        
        if (!config || !callback) return;
        
        // Update configuration
        config.interval = newInterval;
        
        // Restart polling with new interval
        this.startPolling(sessionId, callback, config);
    }
    
    /**
     * Pause polling for a session (can be resumed)
     * @param {string} sessionId - Research session ID
     */
    pausePolling(sessionId) {
        const timerId = this.pollingTimers.get(sessionId);
        if (timerId) {
            clearInterval(timerId);
            this.pollingTimers.delete(sessionId);
        }
    }
    
    /**
     * Resume polling for a paused session
     * @param {string} sessionId - Research session ID
     */
    resumePolling(sessionId) {
        const config = this.activeSessions.get(sessionId);
        if (!config) return;
        
        // Don't resume if already polling
        if (this.pollingTimers.has(sessionId)) return;
        
        // Start polling again
        const timerId = setInterval(() => {
            this.pollSession(sessionId);
        }, config.interval);
        
        this.pollingTimers.set(sessionId, timerId);
    }
    
    /**
     * Pause all polling (useful for when app goes to background)
     */
    pauseAllPolling() {
        const sessionIds = Array.from(this.pollingTimers.keys());
        sessionIds.forEach(sessionId => this.pausePolling(sessionId));
        
        console.log('Paused all status polling');
    }
    
    /**
     * Resume all polling (useful for when app comes to foreground)
     */
    resumeAllPolling() {
        const sessionIds = Array.from(this.activeSessions.keys());
        sessionIds.forEach(sessionId => {
            if (!this.pollingTimers.has(sessionId)) {
                this.resumePolling(sessionId);
            }
        });
        
        console.log('Resumed all status polling');
    }
    
    /**
     * Handle page visibility changes to optimize polling
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause polling to save resources
            this.pauseAllPolling();
        } else {
            // Page is visible, resume polling
            this.resumeAllPolling();
            
            // Do immediate poll for all active sessions
            const sessionIds = Array.from(this.activeSessions.keys());
            sessionIds.forEach(sessionId => this.pollSession(sessionId));
        }
    }
    
    /**
     * Initialize global event listeners
     */
    init() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.stopAllPolling();
        });
        
        // Handle online/offline status
        window.addEventListener('online', () => {
            console.log('Connection restored, resuming polling');
            this.resumeAllPolling();
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost, pausing polling');
            this.pauseAllPolling();
        });
    }
    
    /**
     * Utility method to truncate text
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}