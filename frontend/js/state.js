/**
 * State Management System
 * Centralized state management with subscriber pattern and local storage persistence
 */

export class StateManager {
    constructor() {
        this.state = {
            // Research data
            researchHistory: [],
            currentSession: null,
            
            // User data
            user: null,
            
            // UI state
            loading: false,
            error: null,
            isOnline: navigator.onLine,
            isVisible: !document.hidden,
            
            // Filters and search
            filters: {
                search: '',
                status: 'all',
                dateRange: null
            },
            
            // Pagination
            pagination: {
                currentPage: 1,
                itemsPerPage: 12,
                totalItems: 0
            }
        };
        
        this.subscribers = [];
        this.storageKey = 'aiResearchState';
        
        // Load initial state from localStorage
        this.loadFromLocalStorage();
    }
    
    /**
     * Subscribe to state changes
     * @param {Function} callback - Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        this.subscribers.push(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }
    
    /**
     * Update state and notify subscribers
     * @param {Object} updates - Partial state updates
     */
    setState(updates) {
        if (typeof updates !== 'object' || updates === null) {
            throw new Error('Updates must be an object');
        }
        
        // Deep merge updates with current state
        this.state = this.deepMerge(this.state, updates);
        
        // Notify all subscribers
        this.notifySubscribers();
        
        // Persist to localStorage
        this.saveToLocalStorage();
    }
    
    /**
     * Get current state (immutable copy)
     * @returns {Object} Current state
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    /**
     * Get specific state property
     * @param {string} path - Dot notation path to property
     * @returns {*} Property value
     */
    getStateProperty(path) {
        return this.getNestedProperty(this.state, path);
    }
    
    /**
     * Set research history
     * @param {Array} history - Research sessions array
     */
    setResearchHistory(history) {
        if (!Array.isArray(history)) {
            console.warn('Research history must be an array');
            return;
        }
        
        this.setState({
            researchHistory: history,
            pagination: {
                ...this.state.pagination,
                totalItems: history.length
            }
        });
    }
    
    /**
     * Add new research session
     * @param {Object} session - Research session object
     */
    addResearchSession(session) {
        if (!session || typeof session !== 'object') {
            console.warn('Session must be an object');
            return;
        }
        
        const updatedHistory = [session, ...this.state.researchHistory];
        this.setResearchHistory(updatedHistory);
    }
    
    /**
     * Update existing research session
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Session updates
     */
    updateResearchSession(sessionId, updates) {
        const updatedHistory = this.state.researchHistory.map(session => 
            session.id === sessionId ? { ...session, ...updates } : session
        );
        this.setResearchHistory(updatedHistory);
    }
    
    /**
     * Set current session
     * @param {Object} session - Current session object
     */
    setCurrentSession(session) {
        this.setState({ currentSession: session });
    }
    
    /**
     * Update filters
     * @param {Object} filterUpdates - Filter updates
     */
    updateFilters(filterUpdates) {
        this.setState({
            filters: { ...this.state.filters, ...filterUpdates }
        });
    }
    
    /**
     * Clear filters
     */
    clearFilters() {
        this.setState({
            filters: {
                search: '',
                status: 'all',
                dateRange: null
            }
        });
    }
    
    /**
     * Get filtered research sessions
     * @returns {Array} Filtered sessions
     */
    getFilteredSessions() {
        let sessions = [...this.state.researchHistory];
        const { search, status, dateRange } = this.state.filters;
        
        // Filter by search query
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            sessions = sessions.filter(session => 
                session.query.toLowerCase().includes(searchLower) ||
                (session.summary && session.summary.toLowerCase().includes(searchLower))
            );
        }
        
        // Filter by status
        if (status !== 'all') {
            sessions = sessions.filter(session => session.status === status);
        }
        
        // Filter by date range
        if (dateRange) {
            const filterDate = new Date(dateRange);
            sessions = sessions.filter(session => {
                const sessionDate = new Date(session.created_at);
                return sessionDate.toDateString() === filterDate.toDateString();
            });
        }
        
        return sessions;
    }
    
    /**
     * Get paginated sessions
     * @returns {Object} Paginated sessions with metadata
     */
    getPaginatedSessions() {
        const filteredSessions = this.getFilteredSessions();
        const { currentPage, itemsPerPage } = this.state.pagination;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const sessions = filteredSessions.slice(startIndex, endIndex);
        
        return {
            sessions,
            totalItems: filteredSessions.length,
            totalPages: Math.ceil(filteredSessions.length / itemsPerPage),
            currentPage,
            itemsPerPage,
            hasNextPage: endIndex < filteredSessions.length,
            hasPrevPage: currentPage > 1
        };
    }
    
    /**
     * Update pagination
     * @param {Object} paginationUpdates - Pagination updates
     */
    updatePagination(paginationUpdates) {
        this.setState({
            pagination: { ...this.state.pagination, ...paginationUpdates }
        });
    }
    
    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        this.setState({ loading: !!loading });
    }
    
    /**
     * Set error state
     * @param {string|null} error - Error message or null
     */
    setError(error) {
        this.setState({ error });
    }
    
    /**
     * Clear error state
     */
    clearError() {
        this.setState({ error: null });
    }
    
    /**
     * Notify all subscribers of state changes
     */
    notifySubscribers() {
        const currentState = this.getState();
        this.subscribers.forEach(callback => {
            try {
                callback(currentState);
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        });
    }
    
    /**
     * Save state to localStorage
     */
    saveToLocalStorage() {
        try {
            const persistentState = {
                filters: this.state.filters,
                pagination: this.state.pagination,
                user: this.state.user
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(persistentState));
        } catch (error) {
            console.warn('Failed to save state to localStorage:', error);
        }
    }
    
    /**
     * Load state from localStorage
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // Only restore certain parts of state
                this.state = this.deepMerge(this.state, {
                    filters: parsed.filters || this.state.filters,
                    pagination: parsed.pagination || this.state.pagination,
                    user: parsed.user || this.state.user
                });
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(this.storageKey);
        }
    }
    
    /**
     * Clear localStorage
     */
    clearLocalStorage() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        this.state = {
            researchHistory: [],
            currentSession: null,
            user: null,
            loading: false,
            error: null,
            isOnline: navigator.onLine,
            isVisible: !document.hidden,
            filters: {
                search: '',
                status: 'all',
                dateRange: null
            },
            pagination: {
                currentPage: 1,
                itemsPerPage: 12,
                totalItems: 0
            }
        };
        
        this.clearLocalStorage();
        this.notifySubscribers();
    }
    
    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    /**
     * Get nested property using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path
     * @returns {*} Property value
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    
    /**
     * Get state statistics
     * @returns {Object} State statistics
     */
    getStats() {
        const sessions = this.state.researchHistory;
        const statusCounts = sessions.reduce((acc, session) => {
            acc[session.status] = (acc[session.status] || 0) + 1;
            return acc;
        }, {});
        
        const totalCost = sessions.reduce((sum, session) => {
            return sum + (session.cost?.estimated_cost || 0);
        }, 0);
        
        const totalTokens = sessions.reduce((sum, session) => {
            return sum + (session.cost?.total_tokens || 0);
        }, 0);
        
        return {
            totalSessions: sessions.length,
            statusCounts,
            totalCost: totalCost.toFixed(2),
            totalTokens,
            subscriberCount: this.subscribers.length
        };
    }
}