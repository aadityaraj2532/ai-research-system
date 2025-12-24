/**
 * Notification System
 * Handles toast notifications and user feedback
 */

export class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.defaultDuration = 5000; // 5 seconds
        this.maxNotifications = 5;
        
        this.init();
    }
    
    /**
     * Initialize notification system
     */
    init() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            console.warn('Notification container not found');
            this.createContainer();
        }
    }
    
    /**
     * Create notification container if it doesn't exist
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'position-fixed top-0 end-0 p-3';
        this.container.style.zIndex = '1050';
        document.body.appendChild(this.container);
    }
    
    /**
     * Show notification
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    show(type, message, options = {}) {
        const id = this.generateId();
        const notification = this.createNotification(id, type, message, options);
        
        // Add to container
        this.container.appendChild(notification);
        
        // Store reference
        this.notifications.set(id, {
            element: notification,
            type,
            message,
            timestamp: Date.now()
        });
        
        // Limit number of notifications
        this.limitNotifications();
        
        // Auto-dismiss if duration is set
        const duration = options.duration !== undefined ? options.duration : this.defaultDuration;
        if (duration > 0) {
            setTimeout(() => this.hide(id), duration);
        }
        
        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        return id;
    }
    
    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showSuccess(message, options = {}) {
        return this.show('success', message, options);
    }
    
    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showError(message, options = {}) {
        return this.show('error', message, { duration: 0, ...options }); // Don't auto-dismiss errors
    }
    
    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showWarning(message, options = {}) {
        return this.show('warning', message, options);
    }
    
    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showInfo(message, options = {}) {
        return this.show('info', message, options);
    }
    
    /**
     * Hide notification
     * @param {string} id - Notification ID
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        const element = notification.element;
        
        // Trigger hide animation
        element.classList.remove('show');
        element.classList.add('hiding');
        
        // Remove after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
        }, 300);
    }
    
    /**
     * Hide all notifications
     */
    hideAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.hide(id));
    }
    
    /**
     * Create notification element
     * @param {string} id - Notification ID
     * @param {string} type - Notification type
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     * @returns {HTMLElement} Notification element
     */
    createNotification(id, type, message, options = {}) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('data-notification-id', id);
        
        const icon = this.getIcon(type);
        const title = options.title || this.getTitle(type);
        
        toast.innerHTML = `
            <div class="toast-header">
                <i class="bi ${icon} me-2 text-${this.getBootstrapColor(type)}"></i>
                <strong class="me-auto">${title}</strong>
                <small class="text-muted">${this.formatTime(new Date())}</small>
                <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${this.escapeHtml(message)}
                ${options.actions ? this.renderActions(options.actions) : ''}
            </div>
        `;
        
        // Add close button handler
        const closeBtn = toast.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => this.hide(id));
        
        // Add action handlers
        if (options.actions) {
            this.setupActionHandlers(toast, options.actions);
        }
        
        return toast;
    }
    
    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Bootstrap icon class
     */
    getIcon(type) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Get title for notification type
     * @param {string} type - Notification type
     * @returns {string} Title text
     */
    getTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || titles.info;
    }
    
    /**
     * Get Bootstrap color class for notification type
     * @param {string} type - Notification type
     * @returns {string} Bootstrap color class
     */
    getBootstrapColor(type) {
        const colors = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return colors[type] || colors.info;
    }
    
    /**
     * Render action buttons
     * @param {Array} actions - Action definitions
     * @returns {string} Actions HTML
     */
    renderActions(actions) {
        if (!Array.isArray(actions) || actions.length === 0) {
            return '';
        }
        
        const buttons = actions.map(action => `
            <button type="button" class="btn btn-sm btn-outline-${action.variant || 'primary'} me-2" 
                    data-action="${action.id}">
                ${action.label}
            </button>
        `).join('');
        
        return `<div class="mt-2">${buttons}</div>`;
    }
    
    /**
     * Setup action button handlers
     * @param {HTMLElement} toast - Toast element
     * @param {Array} actions - Action definitions
     */
    setupActionHandlers(toast, actions) {
        actions.forEach(action => {
            const button = toast.querySelector(`[data-action="${action.id}"]`);
            if (button && typeof action.handler === 'function') {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    action.handler();
                    
                    // Hide notification after action unless specified otherwise
                    if (action.keepOpen !== true) {
                        const id = toast.getAttribute('data-notification-id');
                        this.hide(id);
                    }
                });
            }
        });
    }
    
    /**
     * Limit number of visible notifications
     */
    limitNotifications() {
        if (this.notifications.size <= this.maxNotifications) return;
        
        // Get oldest notifications
        const sorted = Array.from(this.notifications.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest notifications
        const toRemove = sorted.slice(0, this.notifications.size - this.maxNotifications);
        toRemove.forEach(([id]) => this.hide(id));
    }
    
    /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Format time for display
     * @param {Date} date - Date object
     * @returns {string} Formatted time
     */
    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Get notification count by type
     * @param {string} type - Notification type
     * @returns {number} Count
     */
    getCountByType(type) {
        return Array.from(this.notifications.values())
            .filter(notification => notification.type === type).length;
    }
    
    /**
     * Get all notifications
     * @returns {Array} Notifications array
     */
    getAll() {
        return Array.from(this.notifications.values());
    }
    
    /**
     * Clear all notifications
     */
    clear() {
        this.hideAll();
    }
    
    /**
     * Show loading notification
     * @param {string} message - Loading message
     * @returns {string} Notification ID
     */
    showLoading(message = 'Loading...') {
        return this.show('info', message, {
            duration: 0,
            title: 'Please wait',
            actions: []
        });
    }
    
    /**
     * Show confirmation notification with actions
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Confirm callback
     * @param {Function} onCancel - Cancel callback
     * @returns {string} Notification ID
     */
    showConfirmation(message, onConfirm, onCancel = null) {
        const actions = [
            {
                id: 'confirm',
                label: 'Confirm',
                variant: 'primary',
                handler: onConfirm
            },
            {
                id: 'cancel',
                label: 'Cancel',
                variant: 'secondary',
                handler: onCancel || (() => {})
            }
        ];
        
        return this.show('warning', message, {
            duration: 0,
            title: 'Confirmation Required',
            actions
        });
    }
}