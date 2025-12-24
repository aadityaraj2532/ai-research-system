/**
 * API Client
 * Handles all HTTP requests to the Django REST API backend
 */

export class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        // Request timeout in milliseconds
        this.timeout = 30000;
        
        // Retry configuration
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }
    
    /**
     * Make HTTP request with error handling and retries
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };
        
        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        config.signal = controller.signal;
        
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, config);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new APIError(
                        `HTTP ${response.status}: ${response.statusText}`,
                        response.status,
                        await this.parseErrorResponse(response)
                    );
                }
                
                return await this.parseResponse(response);
                
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                
                // Don't retry on client errors (4xx) or abort errors
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                if (error.name === 'AbortError') {
                    throw new APIError('Request timeout', 408);
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Parse response based on content type
     * @param {Response} response - Fetch response
     * @returns {Promise} Parsed response
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    }
    
    /**
     * Parse error response
     * @param {Response} response - Fetch response
     * @returns {Promise} Error details
     */
    async parseErrorResponse(response) {
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch {
            return null;
        }
    }
    
    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Research API Methods
    
    /**
     * Start new research session
     * @param {string} query - Research query
     * @param {string} parentResearchId - Optional parent research ID for continuation
     * @returns {Promise} Research session data
     */
    async startResearch(query, parentResearchId = null) {
        const payload = { query };
        if (parentResearchId) {
            payload.parent_research_id = parentResearchId;
        }
        
        return this.request('/research/start', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
    
    /**
     * Get research history
     * @param {Object} params - Query parameters
     * @returns {Promise} Research history array
     */
    async getResearchHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/research/history?${queryString}` : '/research/history';
        
        return this.request(endpoint);
    }
    
    /**
     * Get research session details
     * @param {string} researchId - Research session ID
     * @returns {Promise} Research session data
     */
    async getResearchDetails(researchId) {
        if (!researchId) {
            throw new Error('Research ID is required');
        }
        
        return this.request(`/research/${researchId}`);
    }
    
    /**
     * Continue existing research session
     * @param {string} researchId - Parent research ID
     * @param {string} query - New research query
     * @returns {Promise} New research session data
     */
    async continueResearch(researchId, query) {
        if (!researchId || !query) {
            throw new Error('Research ID and query are required');
        }
        
        return this.request(`/research/${researchId}/continue`, {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }
    
    /**
     * Delete research session
     * @param {string} researchId - Research session ID
     * @returns {Promise} Deletion confirmation
     */
    async deleteResearch(researchId) {
        if (!researchId) {
            throw new Error('Research ID is required');
        }
        
        return this.request(`/research/${researchId}`, {
            method: 'DELETE'
        });
    }
    
    // File API Methods
    
    /**
     * Upload file to research session
     * @param {string} researchId - Research session ID
     * @param {File} file - File to upload
     * @param {Function} onProgress - Progress callback
     * @returns {Promise} Upload result
     */
    async uploadFile(researchId, file, onProgress = null) {
        if (!researchId || !file) {
            throw new Error('Research ID and file are required');
        }
        
        // Validate file
        this.validateFile(file);
        
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Progress tracking
            if (onProgress && typeof onProgress === 'function') {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete, e.loaded, e.total);
                    }
                });
            }
            
            // Success handler
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new APIError(
                        `Upload failed: ${xhr.statusText}`,
                        xhr.status,
                        xhr.responseText
                    ));
                }
            });
            
            // Error handler
            xhr.addEventListener('error', () => {
                reject(new APIError('Upload failed: Network error', 0));
            });
            
            // Timeout handler
            xhr.addEventListener('timeout', () => {
                reject(new APIError('Upload failed: Timeout', 408));
            });
            
            // Abort handler
            xhr.addEventListener('abort', () => {
                reject(new APIError('Upload cancelled', 0));
            });
            
            // Configure request
            xhr.timeout = this.timeout;
            xhr.open('POST', `${this.baseURL}/research/${researchId}/upload`);
            
            // Add auth headers if needed
            const authHeader = this.getAuthHeader();
            if (authHeader) {
                xhr.setRequestHeader('Authorization', authHeader);
            }
            
            xhr.send(formData);
        });
    }
    
    /**
     * Get uploaded files for research session
     * @param {string} researchId - Research session ID
     * @returns {Promise} Files array
     */
    async getResearchFiles(researchId) {
        if (!researchId) {
            throw new Error('Research ID is required');
        }
        
        return this.request(`/research/${researchId}/files`);
    }
    
    /**
     * Delete uploaded file
     * @param {string} researchId - Research session ID
     * @param {string} fileId - File ID
     * @returns {Promise} Deletion confirmation
     */
    async deleteFile(researchId, fileId) {
        if (!researchId || !fileId) {
            throw new Error('Research ID and file ID are required');
        }
        
        return this.request(`/research/${researchId}/files/${fileId}`, {
            method: 'DELETE'
        });
    }
    
    // Cost API Methods
    
    /**
     * Get cost summary
     * @param {Object} params - Query parameters
     * @returns {Promise} Cost summary data
     */
    async getCostSummary(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/costs/summary?${queryString}` : '/costs/summary';
        
        return this.request(endpoint);
    }
    
    /**
     * Get detailed cost breakdown
     * @param {string} researchId - Research session ID
     * @returns {Promise} Cost breakdown data
     */
    async getCostBreakdown(researchId) {
        if (!researchId) {
            throw new Error('Research ID is required');
        }
        
        return this.request(`/costs/research/${researchId}`);
    }
    
    // Utility Methods
    
    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @throws {Error} If file is invalid
     */
    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (file.size > maxSize) {
            throw new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('File type not supported. Please use PDF, TXT, DOC, or DOCX files.');
        }
    }
    
    /**
     * Get authentication header
     * @returns {string|null} Auth header value
     */
    getAuthHeader() {
        // Implement authentication logic here
        // For now, return null (no auth)
        return null;
    }
    
    /**
     * Check if online
     * @returns {Promise<boolean>} Online status
     */
    async checkOnlineStatus() {
        try {
            await this.request('/health', { method: 'HEAD' });
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Get API health status
     * @returns {Promise} Health status data
     */
    async getHealthStatus() {
        return this.request('/health');
    }
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
    constructor(message, status = 0, details = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
    
    /**
     * Check if error is a client error (4xx)
     * @returns {boolean} True if client error
     */
    isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    
    /**
     * Check if error is a server error (5xx)
     * @returns {boolean} True if server error
     */
    isServerError() {
        return this.status >= 500 && this.status < 600;
    }
    
    /**
     * Check if error is a network error
     * @returns {boolean} True if network error
     */
    isNetworkError() {
        return this.status === 0 || this.status === 408;
    }
    
    /**
     * Get user-friendly error message
     * @returns {string} User-friendly message
     */
    getUserMessage() {
        if (this.isNetworkError()) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        if (this.status === 404) {
            return 'The requested resource was not found.';
        }
        
        if (this.status === 403) {
            return 'You do not have permission to perform this action.';
        }
        
        if (this.status === 401) {
            return 'Authentication required. Please log in and try again.';
        }
        
        if (this.isServerError()) {
            return 'Server error. Please try again later.';
        }
        
        return this.message || 'An unexpected error occurred.';
    }
}