/**
 * Research Form Component
 * Handles new research creation with query input and file upload functionality
 */

export class ResearchForm {
    constructor(container, state, api, notifications) {
        this.container = container;
        this.state = state;
        this.api = api;
        this.notifications = notifications;
        
        // Form state
        this.files = [];
        this.isSubmitting = false;
        this.parentResearchId = null;
        
        // Upload state
        this.uploadControllers = new Map(); // Track upload controllers for cancellation
        this.isUploading = false;
        this.uploadProgress = new Map(); // Track individual file progress
        
        // Bind methods
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.handleFileDrop = this.handleFileDrop.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.removeFile = this.removeFile.bind(this);
        this.validateForm = this.validateForm.bind(this);
        this.cancelUpload = this.cancelUpload.bind(this);
    }
    
    /**
     * Render the research form
     */
    render(parentResearchId = null) {
        this.parentResearchId = parentResearchId;
        
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card research-form-card">
                            <div class="card-header">
                                <h2>
                                    <i class="bi bi-plus-circle"></i> 
                                    ${parentResearchId ? 'Continue Research' : 'Start New Research'}
                                </h2>
                                ${parentResearchId ? `
                                    <p class="mb-0 text-muted">
                                        <i class="bi bi-arrow-right-circle"></i> 
                                        Building on previous research session
                                    </p>
                                ` : ''}
                            </div>
                            <div class="card-body">
                                <form id="research-form" novalidate>
                                    <!-- Research Query Section -->
                                    <div class="mb-4">
                                        <label for="research-query" class="form-label required">
                                            <i class="bi bi-search"></i> Research Query
                                        </label>
                                        <textarea 
                                            class="form-control research-query-input" 
                                            id="research-query" 
                                            rows="4" 
                                            placeholder="Enter your research question or topic..."
                                            required
                                            aria-describedby="query-help query-error"
                                        ></textarea>
                                        <div id="query-help" class="form-text">
                                            <i class="bi bi-info-circle"></i>
                                            Describe what you want to research. Be specific for better results.
                                        </div>
                                        <div id="query-error" class="invalid-feedback"></div>
                                        <div class="character-count">
                                            <span id="char-count">0</span> / 2000 characters
                                        </div>
                                    </div>
                                    
                                    <!-- File Upload Section -->
                                    <div class="mb-4">
                                        <label class="form-label">
                                            <i class="bi bi-cloud-upload"></i> Context Files 
                                            <span class="text-muted">(Optional)</span>
                                        </label>
                                        <div 
                                            class="file-drop-zone" 
                                            id="file-drop-zone"
                                            role="button"
                                            tabindex="0"
                                            aria-label="Upload files by clicking or dragging and dropping"
                                        >
                                            <div class="drop-zone-content">
                                                <i class="bi bi-cloud-upload fs-1 text-muted mb-3"></i>
                                                <h5 class="mb-2">Drag and drop files here</h5>
                                                <p class="mb-2">or <span class="text-primary">click to browse</span></p>
                                                <p class="text-muted small mb-0">
                                                    <i class="bi bi-file-earmark-text"></i>
                                                    Supported: PDF, TXT, DOC, DOCX (Max 10MB each)
                                                </p>
                                            </div>
                                            <input 
                                                type="file" 
                                                id="file-input" 
                                                multiple 
                                                accept=".pdf,.txt,.doc,.docx"
                                                class="d-none"
                                                aria-label="Select files to upload"
                                            >
                                        </div>
                                        
                                        <!-- File List -->
                                        <div id="file-list" class="file-list mt-3"></div>
                                        
                                        <!-- File Upload Progress -->
                                        <div id="upload-progress" class="upload-progress mt-3 d-none">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <span class="upload-status">Uploading files...</span>
                                                <button type="button" class="btn btn-sm btn-outline-danger" id="cancel-upload">
                                                    <i class="bi bi-x-circle"></i> Cancel
                                                </button>
                                            </div>
                                            <div class="progress">
                                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                                     role="progressbar" style="width: 0%"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Form Actions -->
                                    <div class="form-actions d-flex justify-content-between align-items-center">
                                        <a href="#dashboard" class="btn btn-outline-secondary">
                                            <i class="bi bi-arrow-left"></i> Back to Dashboard
                                        </a>
                                        
                                        <div class="submit-section">
                                            <button 
                                                type="submit" 
                                                class="btn btn-primary btn-lg" 
                                                id="submit-btn"
                                                disabled
                                            >
                                                <i class="bi bi-search"></i> 
                                                ${parentResearchId ? 'Continue Research' : 'Start Research'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        <!-- Research Tips -->
                        <div class="card mt-4 research-tips">
                            <div class="card-body">
                                <h6 class="card-title">
                                    <i class="bi bi-lightbulb"></i> Research Tips
                                </h6>
                                <ul class="mb-0 small">
                                    <li>Be specific in your research query for more focused results</li>
                                    <li>Upload relevant documents to provide additional context</li>
                                    <li>Use clear, descriptive language to help the AI understand your needs</li>
                                    <li>Consider breaking complex topics into multiple research sessions</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.setupFormValidation();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('research-form');
        const queryInput = document.getElementById('research-query');
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('file-drop-zone');
        const cancelUploadBtn = document.getElementById('cancel-upload');
        
        // Form submission
        form.addEventListener('submit', this.handleSubmit);
        
        // Query input events
        queryInput.addEventListener('input', this.handleQueryInput.bind(this));
        queryInput.addEventListener('blur', this.validateQuery.bind(this));
        
        // File upload events
        fileInput.addEventListener('change', this.handleFileSelect);
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
        
        // Drag and drop events
        dropZone.addEventListener('dragover', this.handleDragOver);
        dropZone.addEventListener('dragleave', this.handleDragLeave);
        dropZone.addEventListener('drop', this.handleFileDrop);
        
        // Upload cancellation
        if (cancelUploadBtn) {
            cancelUploadBtn.addEventListener('click', this.cancelUpload);
        }
        
        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }
    
    /**
     * Setup enhanced form validation with real-time feedback
     */
    setupFormValidation() {
        const form = document.getElementById('research-form');
        const queryInput = document.getElementById('research-query');
        const submitBtn = document.getElementById('submit-btn');
        
        // Initialize field errors tracking
        this.fieldErrors = new Map();
        
        // Real-time validation with debouncing
        let validationTimeout;
        const validateAndUpdateSubmit = (immediate = false) => {
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
            
            const delay = immediate ? 0 : 300; // 300ms debounce
            validationTimeout = setTimeout(() => {
                const isValid = this.validateForm();
                submitBtn.disabled = !isValid || this.isSubmitting;
                
                // Update submit button text based on validation state
                if (!this.isSubmitting) {
                    const baseText = this.parentResearchId ? 'Continue Research' : 'Start Research';
                    const errors = this.getFieldErrors();
                    
                    if (errors.length > 0) {
                        submitBtn.innerHTML = `
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Fix ${errors.length} Error${errors.length > 1 ? 's' : ''}
                        `;
                        submitBtn.className = 'btn btn-outline-danger btn-lg';
                    } else if (isValid) {
                        submitBtn.innerHTML = `
                            <i class="bi bi-search"></i> 
                            ${baseText}
                        `;
                        submitBtn.className = 'btn btn-primary btn-lg';
                    } else {
                        submitBtn.innerHTML = `
                            <i class="bi bi-search"></i> 
                            ${baseText}
                        `;
                        submitBtn.className = 'btn btn-outline-secondary btn-lg';
                    }
                }
            }, delay);
        };
        
        // Input event listeners with enhanced feedback
        queryInput.addEventListener('input', () => {
            this.handleQueryInput(event);
            validateAndUpdateSubmit();
        });
        
        queryInput.addEventListener('blur', () => {
            this.validateQuery(true); // Show errors on blur
            validateAndUpdateSubmit(true);
        });
        
        queryInput.addEventListener('focus', () => {
            // Clear error state on focus to give user a fresh start
            const errorDiv = document.getElementById('query-error');
            if (queryInput.classList.contains('is-invalid') && !queryInput.value.trim()) {
                queryInput.classList.remove('is-invalid');
                errorDiv.textContent = '';
            }
        });
        
        // Form submission with enhanced validation
        form.addEventListener('submit', (e) => {
            // Always validate with errors shown on submit
            if (!this.validateForm(true)) {
                e.preventDefault();
                this.focusFirstError();
                return false;
            }
        });
        
        // Keyboard shortcuts
        queryInput.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to submit
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.validateForm(true)) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
        
        // Initial validation
        validateAndUpdateSubmit(true);
        
        // Add visual feedback for form state
        this.addFormStateIndicators();
    }
    
    /**
     * Add visual indicators for form state
     */
    addFormStateIndicators() {
        const form = document.getElementById('research-form');
        
        // Add CSS classes for different states
        const style = document.createElement('style');
        style.textContent = `
            .research-form-card.submitting {
                opacity: 0.8;
                pointer-events: none;
            }
            
            .research-form-card.submitting .card-body {
                position: relative;
            }
            
            .research-form-card.submitting .card-body::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.7);
                z-index: 10;
            }
            
            .form-field-error {
                animation: shake 0.5s ease-in-out;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .submit-section {
                position: relative;
            }
            
            .submit-feedback {
                position: absolute;
                top: -30px;
                right: 0;
                font-size: 0.875rem;
                color: #6c757d;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Handle query input changes with enhanced feedback
     */
    handleQueryInput(event) {
        const input = event.target;
        const charCount = document.getElementById('char-count');
        const length = input.value.length;
        
        // Update character count with color coding
        charCount.textContent = length;
        charCount.className = '';
        
        if (length > 2000) {
            charCount.className = 'text-danger fw-bold';
        } else if (length > 1800) {
            charCount.className = 'text-warning';
        } else if (length >= 10) {
            charCount.className = 'text-success';
        }
        
        // Clear previous validation state for real-time feedback
        input.classList.remove('is-invalid', 'is-valid');
        
        // Real-time validation feedback (non-intrusive)
        if (length > 0) {
            if (length >= 10 && length <= 2000 && this.hasValidContent(input.value.trim())) {
                input.classList.add('is-valid');
                this.removeFieldError('research-query');
            } else if (length > 2000) {
                input.classList.add('is-invalid');
                const errorDiv = document.getElementById('query-error');
                errorDiv.textContent = `Query is too long (${length - 2000} characters over limit).`;
                this.addFieldError('research-query', errorDiv.textContent);
            } else if (length > 0 && length < 10) {
                // Show warning but not error for short input during typing
                const errorDiv = document.getElementById('query-error');
                errorDiv.textContent = `Need ${10 - length} more characters for a meaningful query.`;
                errorDiv.className = 'form-text text-warning';
            }
        } else {
            // Clear any previous feedback when input is empty
            const errorDiv = document.getElementById('query-error');
            errorDiv.textContent = '';
            errorDiv.className = 'invalid-feedback';
        }
        
        // Add typing indicator
        this.showTypingIndicator();
    }
    
    /**
     * Show typing indicator for better UX
     */
    showTypingIndicator() {
        const submitSection = document.querySelector('.submit-section');
        let feedbackDiv = submitSection.querySelector('.submit-feedback');
        
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'submit-feedback';
            submitSection.appendChild(feedbackDiv);
        }
        
        feedbackDiv.textContent = 'Typing...';
        feedbackDiv.style.opacity = '1';
        
        // Clear typing indicator after delay
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            feedbackDiv.style.opacity = '0';
            setTimeout(() => {
                if (feedbackDiv.textContent === 'Typing...') {
                    feedbackDiv.textContent = '';
                }
            }, 300);
        }, 1000);
    }
    
    /**
     * Validate entire form with enhanced feedback
     */
    validateForm(showErrors = false) {
        const queryValid = this.validateQuery(showErrors);
        const filesValid = this.validateFiles(showErrors);
        
        return queryValid && filesValid && !this.isSubmitting;
    }
    
    /**
     * Validate query field with enhanced feedback
     */
    validateQuery(showErrors = false) {
        const queryInput = document.getElementById('research-query');
        const errorDiv = document.getElementById('query-error');
        const query = queryInput.value.trim();
        
        // Clear previous validation state
        queryInput.classList.remove('is-invalid', 'is-valid');
        
        // Validation rules
        const validationRules = [
            {
                test: () => query.length > 0,
                message: 'Research query is required.'
            },
            {
                test: () => query.length >= 10,
                message: 'Query must be at least 10 characters long for meaningful research.'
            },
            {
                test: () => query.length <= 2000,
                message: 'Query must be less than 2000 characters.'
            },
            {
                test: () => !/^\s*$/.test(query),
                message: 'Query cannot be only whitespace.'
            },
            {
                test: () => this.hasValidContent(query),
                message: 'Query should contain meaningful content, not just repeated characters.'
            }
        ];
        
        // Check each rule
        for (const rule of validationRules) {
            if (!rule.test()) {
                if (showErrors) {
                    queryInput.classList.add('is-invalid');
                    errorDiv.textContent = rule.message;
                    this.addFieldError('research-query', rule.message);
                }
                return false;
            }
        }
        
        // All validations passed
        queryInput.classList.add('is-valid');
        errorDiv.textContent = '';
        this.removeFieldError('research-query');
        return true;
    }
    
    /**
     * Validate files with enhanced feedback
     */
    validateFiles(showErrors = false) {
        // Files are optional, so always valid unless there are invalid files
        const invalidFiles = this.files.filter(file => !this.validateFile(file, false));
        
        if (invalidFiles.length > 0 && showErrors) {
            const fileNames = invalidFiles.map(f => f.name).join(', ');
            this.notifications.showError(`Invalid files detected: ${fileNames}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if query has valid content (not just repeated characters)
     */
    hasValidContent(query) {
        // Check for repeated characters (more than 50% of the same character)
        const charCounts = {};
        for (const char of query.toLowerCase()) {
            if (char.match(/[a-z0-9]/)) {
                charCounts[char] = (charCounts[char] || 0) + 1;
            }
        }
        
        const totalValidChars = Object.values(charCounts).reduce((sum, count) => sum + count, 0);
        const maxCharCount = Math.max(...Object.values(charCounts), 0);
        
        // If more than 50% is the same character, consider it invalid
        return totalValidChars === 0 || (maxCharCount / totalValidChars) < 0.5;
    }
    
    /**
     * Add field error to tracking
     */
    addFieldError(fieldName, message) {
        if (!this.fieldErrors) {
            this.fieldErrors = new Map();
        }
        this.fieldErrors.set(fieldName, message);
    }
    
    /**
     * Remove field error from tracking
     */
    removeFieldError(fieldName) {
        if (this.fieldErrors) {
            this.fieldErrors.delete(fieldName);
        }
    }
    
    /**
     * Get all current field errors
     */
    getFieldErrors() {
        return this.fieldErrors ? Array.from(this.fieldErrors.entries()) : [];
    }
    
    /**
     * Handle file selection
     */
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.addFiles(files);
    }
    
    /**
     * Handle drag over
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const dropZone = document.getElementById('file-drop-zone');
        const dropContent = dropZone.querySelector('.drop-zone-content');
        
        dropZone.classList.add('dragover');
        
        // Update content for drag over state
        if (dropContent) {
            dropContent.innerHTML = `
                <i class="bi bi-cloud-upload-fill fs-1 text-success mb-3"></i>
                <h5 class="mb-2 text-success">Drop files here to upload</h5>
                <p class="mb-0 text-muted small">
                    <i class="bi bi-file-earmark-text"></i>
                    Release to add files
                </p>
            `;
        }
    }
    
    /**
     * Handle drag leave
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Only remove dragover if we're actually leaving the drop zone
        if (!event.currentTarget.contains(event.relatedTarget)) {
            const dropZone = document.getElementById('file-drop-zone');
            const dropContent = dropZone.querySelector('.drop-zone-content');
            
            dropZone.classList.remove('dragover');
            
            // Restore original content
            if (dropContent) {
                dropContent.innerHTML = `
                    <i class="bi bi-cloud-upload fs-1 text-muted mb-3"></i>
                    <h5 class="mb-2">Drag and drop files here</h5>
                    <p class="mb-2">or <span class="text-primary">click to browse</span></p>
                    <p class="text-muted small mb-0">
                        <i class="bi bi-file-earmark-text"></i>
                        Supported: PDF, TXT, DOC, DOCX (Max 10MB each)
                    </p>
                `;
            }
        }
    }
    
    /**
     * Handle file drop
     */
    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const dropZone = document.getElementById('file-drop-zone');
        const dropContent = dropZone.querySelector('.drop-zone-content');
        
        dropZone.classList.remove('dragover');
        
        // Restore original content
        if (dropContent) {
            dropContent.innerHTML = `
                <i class="bi bi-cloud-upload fs-1 text-muted mb-3"></i>
                <h5 class="mb-2">Drag and drop files here</h5>
                <p class="mb-2">or <span class="text-primary">click to browse</span></p>
                <p class="text-muted small mb-0">
                    <i class="bi bi-file-earmark-text"></i>
                    Supported: PDF, TXT, DOC, DOCX (Max 10MB each)
                </p>
            `;
        }
        
        // Get dropped files
        const files = Array.from(event.dataTransfer.files);
        
        if (files.length === 0) {
            this.notifications.showWarning('No files were dropped.');
            return;
        }
        
        // Provide immediate feedback
        const fileNames = files.slice(0, 3).map(f => f.name).join(', ');
        const moreText = files.length > 3 ? ` and ${files.length - 3} more` : '';
        this.notifications.showInfo(`Processing ${fileNames}${moreText}...`);
        
        this.addFiles(files);
    }
    
    /**
     * Add files to the upload list
     */
    addFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));
        
        // Check for duplicates and file limit
        const maxFiles = 10; // Maximum number of files
        const currentFileCount = this.files.length;
        const availableSlots = maxFiles - currentFileCount;
        
        if (validFiles.length > availableSlots) {
            this.notifications.showWarning(
                `Can only add ${availableSlots} more files. Maximum ${maxFiles} files allowed.`
            );
            validFiles.splice(availableSlots);
        }
        
        // Add valid files to the list
        validFiles.forEach(file => {
            // Check for duplicate files (same name and size)
            const isDuplicate = this.files.find(f => 
                f.name === file.name && f.size === file.size
            );
            
            if (!isDuplicate) {
                // Add unique identifier for tracking
                file.uploadId = Date.now() + Math.random();
                this.files.push(file);
            } else {
                this.notifications.showWarning(`File "${file.name}" is already selected.`);
            }
        });
        
        this.renderFileList();
        
        // Clear file input
        const fileInput = document.getElementById('file-input');
        fileInput.value = '';
        
        // Show success message for added files
        if (validFiles.length > 0) {
            const message = validFiles.length === 1 
                ? `Added "${validFiles[0].name}"` 
                : `Added ${validFiles.length} files`;
            this.notifications.showSuccess(message);
        }
    }
    
    /**
     * Validate individual file with enhanced feedback
     */
    validateFile(file, showNotification = true) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx'];
        
        // Validation rules with detailed feedback
        const validationRules = [
            {
                test: () => file.size > 0,
                message: `File "${file.name}" is empty and cannot be uploaded.`,
                type: 'error'
            },
            {
                test: () => file.size <= maxSize,
                message: `File "${file.name}" is too large (${this.formatFileSize(file.size)}). Maximum size is ${this.formatFileSize(maxSize)}.`,
                type: 'error'
            },
            {
                test: () => {
                    // Check MIME type first
                    if (allowedTypes.includes(file.type)) {
                        return true;
                    }
                    // Fallback to extension check
                    const extension = '.' + file.name.split('.').pop().toLowerCase();
                    return allowedExtensions.includes(extension);
                },
                message: `File "${file.name}" has an unsupported format. Please use PDF, TXT, DOC, or DOCX files.`,
                type: 'error'
            },
            {
                test: () => file.name.length <= 255,
                message: `File name "${file.name}" is too long. Please use a shorter file name.`,
                type: 'error'
            },
            {
                test: () => !/[<>:"/\\|?*]/.test(file.name),
                message: `File name "${file.name}" contains invalid characters. Please rename the file.`,
                type: 'error'
            }
        ];
        
        // Check each validation rule
        for (const rule of validationRules) {
            if (!rule.test()) {
                if (showNotification) {
                    if (rule.type === 'error') {
                        this.notifications.showError(rule.message);
                    } else {
                        this.notifications.showWarning(rule.message);
                    }
                }
                return false;
            }
        }
        
        // Additional checks with warnings
        if (showNotification) {
            // Warn about large files (but still valid)
            if (file.size > 5 * 1024 * 1024) { // 5MB
                this.notifications.showWarning(
                    `File "${file.name}" is large (${this.formatFileSize(file.size)}). Upload may take longer.`
                );
            }
            
            // Warn about potentially problematic file names
            if (file.name.includes(' ')) {
                // Just a gentle info, not a warning
                console.info(`File "${file.name}" contains spaces in the name.`);
            }
        }
        
        return true;
    }
    
    /**
     * Render file list
     */
    renderFileList() {
        const fileList = document.getElementById('file-list');
        
        if (this.files.length === 0) {
            fileList.innerHTML = '';
            return;
        }
        
        const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
        
        fileList.innerHTML = `
            <div class="file-list-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="bi bi-files"></i> Selected Files (${this.files.length})
                    </h6>
                    <div class="text-muted small">
                        Total: ${this.formatFileSize(totalSize)}
                    </div>
                </div>
                ${this.files.length > 1 ? `
                    <div class="mt-2">
                        <button 
                            type="button" 
                            class="btn btn-sm btn-outline-danger"
                            onclick="window.app.router.currentComponent.clearAllFiles()"
                            aria-label="Remove all files"
                        >
                            <i class="bi bi-trash"></i> Clear All
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="file-items mt-3" role="list" aria-label="Selected files">
                ${this.files.map((file, index) => this.renderFileItem(file, index)).join('')}
            </div>
        `;
    }
    
    /**
     * Render individual file item
     */
    renderFileItem(file, index) {
        const uploadId = file.uploadId || `file_${index}`;
        const isUploading = this.uploadControllers.has(uploadId);
        const progress = this.uploadProgress.get(uploadId);
        
        return `
            <div class="file-item ${isUploading ? 'uploading' : ''}" 
                 data-index="${index}" 
                 data-upload-id="${uploadId}"
                 role="listitem">
                <div class="file-info">
                    <div class="file-icon">
                        <i class="bi ${this.getFileIcon(file.type)}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name" title="${file.name}">${file.name}</div>
                        <div class="file-meta">
                            <span class="file-size text-muted">${this.formatFileSize(file.size)}</span>
                            ${this.getFileTypeLabel(file.type)}
                        </div>
                        ${isUploading && progress ? `
                            <div class="upload-progress-mini mt-1">
                                <div class="progress" style="height: 4px;">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                         style="width: ${(progress.loaded / progress.total) * 100}%"></div>
                                </div>
                                <div class="text-muted small">
                                    ${this.formatFileSize(progress.loaded)} / ${this.formatFileSize(progress.total)}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    ${isUploading ? `
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Uploading...</span>
                        </div>
                    ` : `
                        <button 
                            type="button" 
                            class="btn btn-sm btn-outline-danger remove-file-btn"
                            onclick="window.app.router.currentComponent.removeFile(${index})"
                            aria-label="Remove ${file.name}"
                            title="Remove file"
                        >
                            <i class="bi bi-x"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Get file type label
     */
    getFileTypeLabel(type) {
        const typeLabels = {
            'application/pdf': '<span class="badge bg-danger">PDF</span>',
            'text/plain': '<span class="badge bg-secondary">TXT</span>',
            'application/msword': '<span class="badge bg-primary">DOC</span>',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '<span class="badge bg-primary">DOCX</span>'
        };
        
        return typeLabels[type] || '<span class="badge bg-secondary">FILE</span>';
    }
    
    /**
     * Clear all files
     */
    clearAllFiles() {
        if (this.isUploading) {
            this.notifications.showWarning('Cannot clear files while uploading. Please cancel upload first.');
            return;
        }
        
        this.files = [];
        this.renderFileList();
        this.notifications.showInfo('All files cleared.');
    }
    
    /**
     * Remove file from list
     */
    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
    }
    
    /**
     * Get file icon based on type
     */
    getFileIcon(type) {
        switch (type) {
            case 'application/pdf':
                return 'bi-file-earmark-pdf';
            case 'text/plain':
                return 'bi-file-earmark-text';
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return 'bi-file-earmark-word';
            default:
                return 'bi-file-earmark';
        }
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
     * Handle form submission with enhanced validation and error handling
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        // Prevent double submission
        if (this.isSubmitting) {
            return;
        }
        
        // Validate form with real-time feedback
        if (!this.validateForm(true)) {
            this.notifications.showError('Please fix the form errors before submitting.');
            this.focusFirstError();
            return;
        }
        
        const query = document.getElementById('research-query').value.trim();
        const submitBtn = document.getElementById('submit-btn');
        const form = document.getElementById('research-form');
        
        // Set submitting state
        this.setSubmittingState(true);
        
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
            try {
                // Update loading state
                this.updateSubmitButton(submitBtn, 'loading', retryCount);
                
                // Start research with timeout
                let result;
                const startTime = Date.now();
                
                if (this.parentResearchId) {
                    result = await this.api.continueResearch(this.parentResearchId, query);
                } else {
                    result = await this.api.startResearch(query);
                }
                
                // Validate response
                if (!result || !result.id) {
                    throw new Error('Invalid response from server');
                }
                
                // Upload files if any
                if (this.files.length > 0) {
                    this.updateSubmitButton(submitBtn, 'uploading');
                    await this.uploadFiles(result.id);
                }
                
                // Success feedback
                const duration = Date.now() - startTime;
                this.showSuccessState(submitBtn, duration);
                
                this.notifications.showSuccess(
                    this.parentResearchId ? 
                    'Research continuation started successfully!' : 
                    'Research started successfully!'
                );
                
                // Clear form state
                this.clearFormState();
                
                // Navigate to research detail after brief delay
                setTimeout(() => {
                    window.location.hash = `#research/${result.id}`;
                }, 1500);
                
                return; // Success - exit retry loop
                
            } catch (error) {
                console.error(`Research submission attempt ${retryCount + 1} failed:`, error);
                
                // Check if we should retry
                if (this.shouldRetry(error, retryCount, maxRetries)) {
                    retryCount++;
                    
                    // Show retry feedback
                    this.updateSubmitButton(submitBtn, 'retrying', retryCount);
                    
                    // Wait before retry with exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                    await this.delay(delay);
                    
                    continue; // Retry
                } else {
                    // Final failure - show error and reset
                    this.handleSubmissionError(error, submitBtn, retryCount);
                    break;
                }
            }
        }
        
        // Reset submitting state
        this.setSubmittingState(false);
    }
    
    /**
     * Set form submitting state
     */
    setSubmittingState(isSubmitting) {
        this.isSubmitting = isSubmitting;
        const form = document.getElementById('research-form');
        const submitBtn = document.getElementById('submit-btn');
        
        if (isSubmitting) {
            form.classList.add('submitting');
            submitBtn.disabled = true;
        } else {
            form.classList.remove('submitting');
            submitBtn.disabled = !this.validateForm();
        }
    }
    
    /**
     * Update submit button state with loading indicators
     */
    updateSubmitButton(button, state, retryCount = 0) {
        const baseText = this.parentResearchId ? 'Continue Research' : 'Start Research';
        
        switch (state) {
            case 'loading':
                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ${retryCount > 0 ? `Retrying... (${retryCount}/${3})` : 'Starting Research...'}
                `;
                button.className = 'btn btn-primary btn-lg';
                break;
                
            case 'uploading':
                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Uploading Files...
                `;
                button.className = 'btn btn-primary btn-lg';
                break;
                
            case 'retrying':
                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Retrying... (${retryCount}/${3})
                `;
                button.className = 'btn btn-warning btn-lg';
                break;
                
            case 'success':
                button.innerHTML = `
                    <i class="bi bi-check-circle me-2"></i>
                    Research Started!
                `;
                button.className = 'btn btn-success btn-lg';
                break;
                
            case 'error':
                button.innerHTML = `
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Try Again
                `;
                button.className = 'btn btn-danger btn-lg';
                break;
                
            default:
                button.innerHTML = `
                    <i class="bi bi-search"></i> 
                    ${baseText}
                `;
                button.className = 'btn btn-primary btn-lg';
        }
    }
    
    /**
     * Show success state with timing feedback
     */
    showSuccessState(button, duration) {
        this.updateSubmitButton(button, 'success');
        
        // Show timing feedback
        const timingText = duration < 2000 ? 'quickly' : duration < 5000 ? 'successfully' : 'completed';
        const successMessage = `Research started ${timingText} (${(duration / 1000).toFixed(1)}s)`;
        
        // Update button with timing info after brief delay
        setTimeout(() => {
            button.innerHTML = `
                <i class="bi bi-check-circle me-2"></i>
                ${successMessage}
            `;
        }, 1000);
    }
    
    /**
     * Determine if error should trigger a retry
     */
    shouldRetry(error, retryCount, maxRetries) {
        // Don't retry if we've reached max attempts
        if (retryCount >= maxRetries) {
            return false;
        }
        
        // Don't retry client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
            return false;
        }
        
        // Don't retry validation errors
        if (error.message && error.message.includes('validation')) {
            return false;
        }
        
        // Retry network errors, timeouts, and server errors
        return error.status === 0 || // Network error
               error.status === 408 || // Timeout
               error.status >= 500 || // Server error
               error.name === 'AbortError' ||
               error.message.includes('timeout') ||
               error.message.includes('network');
    }
    
    /**
     * Handle final submission error
     */
    handleSubmissionError(error, button, retryCount) {
        this.updateSubmitButton(button, 'error');
        
        // Determine error message based on error type
        let errorMessage = 'Failed to start research. ';
        let actionMessage = 'Please try again.';
        
        if (error.status === 0 || error.message.includes('network')) {
            errorMessage += 'Network connection failed. ';
            actionMessage = 'Please check your internet connection and try again.';
        } else if (error.status === 408 || error.message.includes('timeout')) {
            errorMessage += 'Request timed out. ';
            actionMessage = 'The server may be busy. Please try again in a moment.';
        } else if (error.status >= 500) {
            errorMessage += 'Server error occurred. ';
            actionMessage = 'Please try again later or contact support if the problem persists.';
        } else if (error.status === 400) {
            errorMessage += 'Invalid request. ';
            actionMessage = 'Please check your input and try again.';
        } else if (retryCount > 0) {
            errorMessage += `Failed after ${retryCount + 1} attempts. `;
            actionMessage = 'Please try again later.';
        }
        
        // Show error notification with action guidance
        this.notifications.showError(errorMessage + actionMessage);
        
        // Reset button after delay
        setTimeout(() => {
            this.updateSubmitButton(button, 'default');
        }, 3000);
    }
    
    /**
     * Focus first form error for accessibility
     */
    focusFirstError() {
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    /**
     * Clear form state after successful submission
     */
    clearFormState() {
        // Clear query input
        const queryInput = document.getElementById('research-query');
        if (queryInput) {
            queryInput.value = '';
            queryInput.classList.remove('is-valid', 'is-invalid');
        }
        
        // Clear character count
        const charCount = document.getElementById('char-count');
        if (charCount) {
            charCount.textContent = '0';
            charCount.className = '';
        }
        
        // Clear files
        this.files = [];
        this.renderFileList();
        
        // Clear file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    /**
     * Delay utility for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Upload files for research session
     */
    async uploadFiles(researchId) {
        if (this.files.length === 0) return;
        
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = progressContainer.querySelector('.progress-bar');
        const statusText = progressContainer.querySelector('.upload-status');
        const cancelBtn = document.getElementById('cancel-upload');
        
        this.isUploading = true;
        this.uploadProgress.clear();
        this.uploadControllers.clear();
        
        progressContainer.classList.remove('d-none');
        cancelBtn.disabled = false;
        
        try {
            let totalFiles = this.files.length;
            let completedFiles = 0;
            let totalBytes = this.files.reduce((sum, file) => sum + file.size, 0);
            let uploadedBytes = 0;
            
            for (let i = 0; i < this.files.length; i++) {
                if (!this.isUploading) {
                    throw new Error('Upload cancelled');
                }
                
                const file = this.files[i];
                const uploadId = file.uploadId || `upload_${i}`;
                
                statusText.textContent = `Uploading "${file.name}"... (${i + 1}/${totalFiles})`;
                
                // Create abort controller for this upload
                const controller = new AbortController();
                this.uploadControllers.set(uploadId, controller);
                
                try {
                    await this.uploadSingleFile(researchId, file, (progress, loaded, total) => {
                        // Update individual file progress
                        this.uploadProgress.set(uploadId, { loaded, total });
                        
                        // Calculate overall progress
                        let totalLoaded = uploadedBytes;
                        for (const [id, prog] of this.uploadProgress) {
                            if (id !== uploadId) {
                                totalLoaded += prog.loaded;
                            } else {
                                totalLoaded += loaded;
                            }
                        }
                        
                        const overallProgress = Math.min((totalLoaded / totalBytes) * 100, 100);
                        progressBar.style.width = `${overallProgress}%`;
                        progressBar.setAttribute('aria-valuenow', overallProgress);
                    }, controller.signal);
                    
                    // File completed successfully
                    uploadedBytes += file.size;
                    completedFiles++;
                    this.uploadControllers.delete(uploadId);
                    
                } catch (error) {
                    if (error.name === 'AbortError') {
                        throw new Error('Upload cancelled');
                    }
                    
                    console.error(`Failed to upload ${file.name}:`, error);
                    this.notifications.showError(`Failed to upload "${file.name}": ${error.message}`);
                    
                    // Continue with other files
                    this.uploadControllers.delete(uploadId);
                }
            }
            
            if (completedFiles > 0) {
                statusText.textContent = `Successfully uploaded ${completedFiles}/${totalFiles} files`;
                progressBar.style.width = '100%';
                progressBar.classList.remove('progress-bar-animated');
                progressBar.classList.add('bg-success');
                
                if (completedFiles < totalFiles) {
                    this.notifications.showWarning(
                        `${completedFiles} of ${totalFiles} files uploaded successfully. Some files failed.`
                    );
                } else {
                    this.notifications.showSuccess('All files uploaded successfully!');
                }
                
                // Hide progress after delay
                setTimeout(() => {
                    progressContainer.classList.add('d-none');
                    progressBar.classList.add('progress-bar-animated');
                    progressBar.classList.remove('bg-success');
                }, 3000);
            } else {
                throw new Error('No files were uploaded successfully');
            }
            
        } catch (error) {
            console.error('File upload failed:', error);
            
            if (error.message === 'Upload cancelled') {
                statusText.textContent = 'Upload cancelled';
                this.notifications.showInfo('File upload cancelled');
            } else {
                statusText.textContent = 'Upload failed';
                this.notifications.showError('File upload failed. Research will continue without files.');
            }
            
            progressBar.classList.remove('progress-bar-animated');
            progressBar.classList.add('bg-danger');
            
            // Hide progress after delay
            setTimeout(() => {
                progressContainer.classList.add('d-none');
                progressBar.classList.add('progress-bar-animated');
                progressBar.classList.remove('bg-danger');
            }, 3000);
            
        } finally {
            this.isUploading = false;
            cancelBtn.disabled = true;
            this.uploadControllers.clear();
            this.uploadProgress.clear();
        }
    }
    
    /**
     * Upload a single file with progress tracking
     */
    async uploadSingleFile(researchId, file, onProgress, signal) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const xhr = new XMLHttpRequest();
            
            // Handle abort signal
            if (signal) {
                signal.addEventListener('abort', () => {
                    xhr.abort();
                });
            }
            
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
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            });
            
            // Error handler
            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });
            
            // Timeout handler
            xhr.addEventListener('timeout', () => {
                reject(new Error('Upload timeout'));
            });
            
            // Abort handler
            xhr.addEventListener('abort', () => {
                reject(new Error('Upload cancelled'));
            });
            
            // Configure request
            xhr.timeout = 60000; // 60 second timeout per file
            xhr.open('POST', `${this.api.baseURL}/research/${researchId}/upload`);
            
            // Add auth headers if needed
            const authHeader = this.api.getAuthHeader();
            if (authHeader) {
                xhr.setRequestHeader('Authorization', authHeader);
            }
            
            xhr.send(formData);
        });
    }
    
    /**
     * Cancel ongoing file uploads
     */
    cancelUpload() {
        if (!this.isUploading) return;
        
        this.isUploading = false;
        
        // Abort all ongoing uploads
        for (const [uploadId, controller] of this.uploadControllers) {
            try {
                controller.abort();
            } catch (error) {
                console.warn(`Failed to abort upload ${uploadId}:`, error);
            }
        }
        
        this.uploadControllers.clear();
        this.uploadProgress.clear();
        
        // Update UI
        const progressContainer = document.getElementById('upload-progress');
        const statusText = progressContainer.querySelector('.upload-status');
        const cancelBtn = document.getElementById('cancel-upload');
        
        statusText.textContent = 'Cancelling uploads...';
        cancelBtn.disabled = true;
        
        this.notifications.showInfo('Cancelling file uploads...');
    }
}