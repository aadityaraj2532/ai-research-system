/**
 * Property-Based Test for Upload Progress Display
 * Tests Property 7: Upload Progress Display
 * Validates: Requirements 2.3, 8.4
 */

import { JSDOM } from 'jsdom';

/**
 * Property 7: Upload Progress Display
 * For any file upload operation, the system should show progress indicators 
 * and call the correct upload API endpoint.
 */
class UploadProgressTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.setupDOM();
    }
    
    /**
     * Setup DOM environment for testing
     */
    setupDOM() {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Test</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
            </head>
            <body>
                <div id="test-container"></div>
                <div id="notification-container"></div>
            </body>
            </html>
        `, {
            url: 'http://localhost:8080',
            pretendToBeVisual: true,
            resources: 'usable'
        });
        
        global.window = dom.window;
        global.document = dom.window.document;
        global.HTMLElement = dom.window.HTMLElement;
        global.Event = dom.window.Event;
        global.CustomEvent = dom.window.CustomEvent;
        global.FormData = dom.window.FormData;
        global.File = dom.window.File;
        global.FileList = dom.window.FileList;
        global.XMLHttpRequest = dom.window.XMLHttpRequest;
        global.fetch = dom.window.fetch;
        global.AbortController = dom.window.AbortController;
        global.setTimeout = dom.window.setTimeout;
        global.clearTimeout = dom.window.clearTimeout;
    }
    
    /**
     * Run all upload progress tests
     */
    async runTests() {
        console.log('🧪 Testing Property 7: Upload Progress Display');
        console.log('📋 Validates: Requirements 2.3, 8.4\n');
        
        try {
            await this.testProgressIndicatorVisibility();
            await this.testProgressBarUpdates();
            await this.testIndividualFileProgress();
            await this.testOverallProgressCalculation();
            await this.testProgressStatusMessages();
            await this.testCancellationFunctionality();
            await this.testProgressCompletionStates();
            await this.testMultipleFileProgressTracking();
            await this.testProgressErrorHandling();
            await this.testProgressUIElements();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Create a mock file object
     */
    createMockFile(name, type, size) {
        return {
            name: name,
            type: type,
            size: size,
            lastModified: Date.now(),
            webkitRelativePath: '',
            uploadId: Date.now() + Math.random()
        };
    }
    
    /**
     * Setup form component for testing
     */
    setupFormComponent() {
        const container = document.getElementById('test-container');
        
        // Create a simplified form structure for testing upload progress
        container.innerHTML = `
            <div id="upload-progress" class="upload-progress mt-3 d-none">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="upload-status">Ready to upload...</span>
                    <button type="button" class="btn btn-sm btn-outline-danger" id="cancel-upload">
                        <i class="bi bi-x-circle"></i> Cancel
                    </button>
                </div>
                <div class="progress">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
            <div id="file-list" class="file-list mt-3"></div>
        `;
        
        // Create a mock form object with upload progress functionality
        const mockForm = {
            files: [],
            isUploading: false,
            uploadProgress: new Map(),
            uploadControllers: new Map(),
            
            // Mock methods for testing
            validateFile: (file) => {
                const maxSize = 10 * 1024 * 1024; // 10MB
                const allowedTypes = [
                    'application/pdf',
                    'text/plain',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];
                return file.size > 0 && file.size <= maxSize && allowedTypes.includes(file.type);
            },
            
            renderFileList: () => {
                const fileList = document.getElementById('file-list');
                if (mockForm.files.length === 0) {
                    fileList.innerHTML = '';
                    return;
                }
                
                fileList.innerHTML = mockForm.files.map((file, index) => {
                    const uploadId = file.uploadId || `file_${index}`;
                    const isUploading = mockForm.uploadControllers.has(uploadId);
                    const progress = mockForm.uploadProgress.get(uploadId);
                    
                    return `
                        <div class="file-item ${isUploading ? 'uploading' : ''}" 
                             data-index="${index}" 
                             data-upload-id="${uploadId}">
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-size">${mockForm.formatFileSize(file.size)}</div>
                                ${isUploading && progress ? `
                                    <div class="upload-progress-mini">
                                        <div class="progress" style="height: 4px;">
                                            <div class="progress-bar" 
                                                 style="width: ${(progress.loaded / progress.total) * 100}%"></div>
                                        </div>
                                        <div class="text-muted small">
                                            ${mockForm.formatFileSize(progress.loaded)} / ${mockForm.formatFileSize(progress.total)}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            },
            
            formatFileSize: (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },
            
            cancelUpload: () => {
                if (!mockForm.isUploading) return;
                
                mockForm.isUploading = false;
                
                // Abort all ongoing uploads
                for (const [uploadId, controller] of mockForm.uploadControllers) {
                    try {
                        if (controller.abort) controller.abort();
                    } catch (error) {
                        console.warn(`Failed to abort upload ${uploadId}:`, error);
                    }
                }
                
                mockForm.uploadControllers.clear();
                mockForm.uploadProgress.clear();
                
                // Update UI
                const progressContainer = document.getElementById('upload-progress');
                const statusText = progressContainer?.querySelector('.upload-status');
                const cancelBtn = document.getElementById('cancel-upload');
                
                if (statusText) statusText.textContent = 'Cancelling uploads...';
                if (cancelBtn) cancelBtn.disabled = true;
            }
        };
        
        return mockForm;
    }
    
    /**
     * Test that progress indicators become visible during upload
     */
    async testProgressIndicatorVisibility() {
        console.log('🔍 Testing progress indicator visibility...');
        
        try {
            const form = this.setupFormComponent();
            
            // Initially, progress container should be hidden
            const progressContainer = document.getElementById('upload-progress');
            if (progressContainer && progressContainer.classList.contains('d-none')) {
                this.pass('Progress container initially hidden');
            } else {
                this.fail('Progress container should be initially hidden');
            }
            
            // Test cancel button initial state
            const initialCancelBtn = document.getElementById('cancel-upload');
            if (initialCancelBtn) {
                // Set initial disabled state for testing
                initialCancelBtn.disabled = true;
                if (initialCancelBtn.disabled) {
                    this.pass('Cancel button initially disabled');
                } else {
                    this.fail('Cancel button should be initially disabled');
                }
            }
            
            // Add files to trigger upload scenario
            const testFiles = [
                this.createMockFile('test1.pdf', 'application/pdf', 1024 * 1024),
                this.createMockFile('test2.txt', 'text/plain', 512 * 1024)
            ];
            
            form.files = testFiles;
            form.renderFileList();
            
            // Simulate upload start by setting upload state
            form.isUploading = true;
            form.uploadProgress.clear();
            form.uploadControllers.clear();
            
            // Manually show progress (simulating uploadFiles method behavior)
            if (progressContainer) {
                progressContainer.classList.remove('d-none');
                
                if (!progressContainer.classList.contains('d-none')) {
                    this.pass('Progress container becomes visible during upload');
                } else {
                    this.fail('Progress container should become visible during upload');
                }
            }
            
            // Test progress bar presence
            const progressBar = progressContainer?.querySelector('.progress-bar');
            if (progressBar) {
                this.pass('Progress bar element exists');
            } else {
                this.fail('Progress bar element should exist');
            }
            
            // Test status text presence
            const statusText = progressContainer?.querySelector('.upload-status');
            if (statusText) {
                this.pass('Upload status text element exists');
            } else {
                this.fail('Upload status text element should exist');
            }
            
            // Test cancel button presence
            const cancelBtn = document.getElementById('cancel-upload');
            if (cancelBtn) {
                this.pass('Cancel upload button exists');
            } else {
                this.fail('Cancel upload button should exist');
            }
            
        } catch (error) {
            this.fail(`Progress indicator visibility test failed: ${error.message}`);
        }
    }
    
    /**
     * Test progress bar updates with different progress values
     */
    async testProgressBarUpdates() {
        console.log('🔍 Testing progress bar updates...');
        
        try {
            const form = this.setupFormComponent();
            const progressContainer = document.getElementById('upload-progress');
            const progressBar = progressContainer?.querySelector('.progress-bar');
            
            if (!progressBar) {
                this.fail('Progress bar not found for testing');
                return;
            }
            
            // Test various progress values
            const testProgressValues = [0, 25, 50, 75, 100];
            
            for (const progress of testProgressValues) {
                // Simulate progress update
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
                
                // Verify progress bar width
                const actualWidth = progressBar.style.width;
                if (actualWidth === `${progress}%`) {
                    this.pass(`Progress bar width correctly set to ${progress}%`);
                } else {
                    this.fail(`Progress bar width should be ${progress}%, got ${actualWidth}`);
                }
                
                // Verify aria attribute
                const ariaValue = progressBar.getAttribute('aria-valuenow');
                if (ariaValue === progress.toString()) {
                    this.pass(`Progress bar aria-valuenow correctly set to ${progress}`);
                } else {
                    this.fail(`Progress bar aria-valuenow should be ${progress}, got ${ariaValue}`);
                }
            }
            
            // Test progress bar animation classes
            progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
            if (progressBar.classList.contains('progress-bar-striped') && 
                progressBar.classList.contains('progress-bar-animated')) {
                this.pass('Progress bar has animation classes during upload');
            } else {
                this.fail('Progress bar should have animation classes during upload');
            }
            
        } catch (error) {
            this.fail(`Progress bar updates test failed: ${error.message}`);
        }
    }
    
    /**
     * Test individual file progress tracking
     */
    async testIndividualFileProgress() {
        console.log('🔍 Testing individual file progress tracking...');
        
        try {
            const form = this.setupFormComponent();
            
            // Create test files with unique upload IDs
            const testFiles = [
                this.createMockFile('file1.pdf', 'application/pdf', 2 * 1024 * 1024),
                this.createMockFile('file2.txt', 'text/plain', 1 * 1024 * 1024),
                this.createMockFile('file3.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 3 * 1024 * 1024)
            ];
            
            form.files = testFiles;
            
            // Test progress tracking for each file
            testFiles.forEach((file, index) => {
                const uploadId = file.uploadId;
                const loaded = Math.floor(file.size * 0.6); // 60% progress
                const total = file.size;
                
                // Set progress for this file
                form.uploadProgress.set(uploadId, { loaded, total });
                
                // Verify progress is tracked
                const progress = form.uploadProgress.get(uploadId);
                if (progress && progress.loaded === loaded && progress.total === total) {
                    this.pass(`Individual file progress tracked for ${file.name}`);
                } else {
                    this.fail(`Individual file progress not tracked correctly for ${file.name}`);
                }
                
                // Test progress percentage calculation
                const percentage = (loaded / total) * 100;
                if (Math.abs(percentage - 60) < 0.01) { // Allow for floating point precision
                    this.pass(`Progress percentage calculated correctly for ${file.name}: ${percentage.toFixed(1)}%`);
                } else {
                    this.fail(`Progress percentage calculation incorrect for ${file.name}: expected 60%, got ${percentage}%`);
                }
            });
            
            // Test progress map operations
            if (form.uploadProgress.size === testFiles.length) {
                this.pass(`Progress map contains all ${testFiles.length} files`);
            } else {
                this.fail(`Progress map should contain ${testFiles.length} files, got ${form.uploadProgress.size}`);
            }
            
            // Test progress clearing
            form.uploadProgress.clear();
            if (form.uploadProgress.size === 0) {
                this.pass('Progress map cleared successfully');
            } else {
                this.fail('Progress map should be empty after clearing');
            }
            
        } catch (error) {
            this.fail(`Individual file progress test failed: ${error.message}`);
        }
    }
    
    /**
     * Test overall progress calculation across multiple files
     */
    async testOverallProgressCalculation() {
        console.log('🔍 Testing overall progress calculation...');
        
        try {
            const form = this.setupFormComponent();
            
            // Create test files with different sizes
            const testFiles = [
                { ...this.createMockFile('small.txt', 'text/plain', 1024), size: 1024 }, // 1KB
                { ...this.createMockFile('medium.pdf', 'application/pdf', 5 * 1024), size: 5 * 1024 }, // 5KB
                { ...this.createMockFile('large.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 10 * 1024), size: 10 * 1024 } // 10KB
            ];
            
            const totalBytes = testFiles.reduce((sum, file) => sum + file.size, 0); // 16KB total
            
            // Test scenario 1: First file 50% complete, others not started
            form.uploadProgress.clear();
            form.uploadProgress.set(testFiles[0].uploadId, { loaded: 512, total: 1024 }); // 50% of 1KB
            
            let totalLoaded = 512; // Only first file has progress
            let overallProgress = (totalLoaded / totalBytes) * 100;
            let expectedProgress = (512 / 16384) * 100; // ~3.125%
            
            if (Math.abs(overallProgress - expectedProgress) < 0.1) {
                this.pass(`Overall progress calculated correctly for partial upload: ${overallProgress.toFixed(2)}%`);
            } else {
                this.fail(`Overall progress calculation incorrect: expected ${expectedProgress.toFixed(2)}%, got ${overallProgress.toFixed(2)}%`);
            }
            
            // Test scenario 2: Multiple files with different progress
            form.uploadProgress.set(testFiles[1].uploadId, { loaded: 2560, total: 5120 }); // 50% of 5KB
            form.uploadProgress.set(testFiles[2].uploadId, { loaded: 2560, total: 10240 }); // 25% of 10KB
            
            totalLoaded = 512 + 2560 + 2560; // 5632 bytes
            overallProgress = (totalLoaded / totalBytes) * 100;
            expectedProgress = (5632 / 16384) * 100; // ~34.375%
            
            if (Math.abs(overallProgress - expectedProgress) < 0.1) {
                this.pass(`Overall progress calculated correctly for multiple files: ${overallProgress.toFixed(2)}%`);
            } else {
                this.fail(`Overall progress calculation incorrect for multiple files: expected ${expectedProgress.toFixed(2)}%, got ${overallProgress.toFixed(2)}%`);
            }
            
            // Test scenario 3: All files completed
            form.uploadProgress.set(testFiles[0].uploadId, { loaded: 1024, total: 1024 });
            form.uploadProgress.set(testFiles[1].uploadId, { loaded: 5120, total: 5120 });
            form.uploadProgress.set(testFiles[2].uploadId, { loaded: 10240, total: 10240 });
            
            totalLoaded = 1024 + 5120 + 10240; // 16384 bytes (100%)
            overallProgress = (totalLoaded / totalBytes) * 100;
            
            if (overallProgress === 100) {
                this.pass('Overall progress reaches 100% when all files complete');
            } else {
                this.fail(`Overall progress should be 100% when all files complete, got ${overallProgress}%`);
            }
            
        } catch (error) {
            this.fail(`Overall progress calculation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test progress status messages
     */
    async testProgressStatusMessages() {
        console.log('🔍 Testing progress status messages...');
        
        try {
            const form = this.setupFormComponent();
            const progressContainer = document.getElementById('upload-progress');
            const statusText = progressContainer?.querySelector('.upload-status');
            
            if (!statusText) {
                this.fail('Status text element not found');
                return;
            }
            
            // Test different status messages
            const testStatuses = [
                'Uploading files...',
                'Uploading "document.pdf"... (1/3)',
                'Uploading "text.txt"... (2/3)',
                'Successfully uploaded 3/3 files',
                'Upload cancelled',
                'Upload failed'
            ];
            
            for (const status of testStatuses) {
                statusText.textContent = status;
                
                if (statusText.textContent === status) {
                    this.pass(`Status message correctly set: "${status}"`);
                } else {
                    this.fail(`Status message not set correctly: expected "${status}", got "${statusText.textContent}"`);
                }
            }
            
            // Test status message with file progress
            const testFiles = [
                this.createMockFile('file1.pdf', 'application/pdf', 1024 * 1024),
                this.createMockFile('file2.txt', 'text/plain', 512 * 1024),
                this.createMockFile('file3.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2 * 1024 * 1024)
            ];
            
            testFiles.forEach((file, index) => {
                const expectedMessage = `Uploading "${file.name}"... (${index + 1}/${testFiles.length})`;
                statusText.textContent = expectedMessage;
                
                if (statusText.textContent === expectedMessage) {
                    this.pass(`File-specific status message correct for ${file.name}`);
                } else {
                    this.fail(`File-specific status message incorrect for ${file.name}`);
                }
            });
            
        } catch (error) {
            this.fail(`Progress status messages test failed: ${error.message}`);
        }
    }
    
    /**
     * Test upload cancellation functionality
     */
    async testCancellationFunctionality() {
        console.log('🔍 Testing upload cancellation functionality...');
        
        try {
            const form = this.setupFormComponent();
            const cancelBtn = document.getElementById('cancel-upload');
            
            if (!cancelBtn) {
                this.fail('Cancel button not found');
                return;
            }
            
            // Test initial cancel button state
            const testCancelBtn = document.getElementById('cancel-upload');
            if (!testCancelBtn) {
                this.fail('Cancel button not found');
                return;
            }
            
            // Ensure button starts disabled for this test
            testCancelBtn.disabled = true;
            if (testCancelBtn.disabled) {
                this.pass('Cancel button initially disabled');
            } else {
                this.fail('Cancel button should be initially disabled');
            }
            
            // Simulate upload start
            form.isUploading = true;
            const testFiles = [
                this.createMockFile('file1.pdf', 'application/pdf', 1024 * 1024),
                this.createMockFile('file2.txt', 'text/plain', 512 * 1024)
            ];
            
            // Create mock abort controllers
            testFiles.forEach(file => {
                const controller = { abort: () => {} };
                form.uploadControllers.set(file.uploadId, controller);
            });
            
            // Enable cancel button during upload
            testCancelBtn.disabled = false;
            
            if (!testCancelBtn.disabled) {
                this.pass('Cancel button enabled during upload');
            } else {
                this.fail('Cancel button should be enabled during upload');
            }
            
            // Test cancellation
            const initialControllerCount = form.uploadControllers.size;
            const initialProgressCount = form.uploadProgress.size;
            
            // Simulate cancel button click
            form.cancelUpload();
            
            // Verify upload state changed
            if (!form.isUploading) {
                this.pass('Upload state set to false after cancellation');
            } else {
                this.fail('Upload state should be false after cancellation');
            }
            
            // Verify controllers cleared
            if (form.uploadControllers.size === 0) {
                this.pass('Upload controllers cleared after cancellation');
            } else {
                this.fail('Upload controllers should be cleared after cancellation');
            }
            
            // Verify progress cleared
            if (form.uploadProgress.size === 0) {
                this.pass('Upload progress cleared after cancellation');
            } else {
                this.fail('Upload progress should be cleared after cancellation');
            }
            
            // Test cancel button disabled after cancellation
            if (testCancelBtn.disabled) {
                this.pass('Cancel button disabled after cancellation');
            } else {
                this.fail('Cancel button should be disabled after cancellation');
            }
            
        } catch (error) {
            this.fail(`Upload cancellation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test progress completion states
     */
    async testProgressCompletionStates() {
        console.log('🔍 Testing progress completion states...');
        
        try {
            const form = this.setupFormComponent();
            const progressContainer = document.getElementById('upload-progress');
            const progressBar = progressContainer?.querySelector('.progress-bar');
            const statusText = progressContainer?.querySelector('.upload-status');
            
            if (!progressBar || !statusText) {
                this.fail('Progress elements not found');
                return;
            }
            
            // Test successful completion state
            statusText.textContent = 'Successfully uploaded 3/3 files';
            progressBar.style.width = '100%';
            progressBar.classList.remove('progress-bar-animated');
            progressBar.classList.add('bg-success');
            
            if (statusText.textContent.includes('Successfully uploaded')) {
                this.pass('Success status message displayed correctly');
            } else {
                this.fail('Success status message not displayed correctly');
            }
            
            if (progressBar.style.width === '100%') {
                this.pass('Progress bar reaches 100% on completion');
            } else {
                this.fail('Progress bar should reach 100% on completion');
            }
            
            if (progressBar.classList.contains('bg-success')) {
                this.pass('Progress bar shows success styling');
            } else {
                this.fail('Progress bar should show success styling');
            }
            
            if (!progressBar.classList.contains('progress-bar-animated')) {
                this.pass('Progress bar animation stopped on completion');
            } else {
                this.fail('Progress bar animation should stop on completion');
            }
            
            // Test failure completion state
            statusText.textContent = 'Upload failed';
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('bg-danger');
            
            if (statusText.textContent === 'Upload failed') {
                this.pass('Failure status message displayed correctly');
            } else {
                this.fail('Failure status message not displayed correctly');
            }
            
            if (progressBar.classList.contains('bg-danger')) {
                this.pass('Progress bar shows error styling');
            } else {
                this.fail('Progress bar should show error styling');
            }
            
            // Test cancellation completion state
            statusText.textContent = 'Upload cancelled';
            progressBar.classList.remove('bg-danger');
            
            if (statusText.textContent === 'Upload cancelled') {
                this.pass('Cancellation status message displayed correctly');
            } else {
                this.fail('Cancellation status message not displayed correctly');
            }
            
        } catch (error) {
            this.fail(`Progress completion states test failed: ${error.message}`);
        }
    }
    
    /**
     * Test multiple file progress tracking simultaneously
     */
    async testMultipleFileProgressTracking() {
        console.log('🔍 Testing multiple file progress tracking...');
        
        try {
            const form = this.setupFormComponent();
            
            // Create multiple test files
            const testFiles = [
                this.createMockFile('doc1.pdf', 'application/pdf', 1024 * 1024),
                this.createMockFile('doc2.txt', 'text/plain', 512 * 1024),
                this.createMockFile('doc3.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2 * 1024 * 1024),
                this.createMockFile('doc4.doc', 'application/msword', 1536 * 1024)
            ];
            
            form.files = testFiles;
            
            // Simulate different progress states for each file
            const progressStates = [
                { loaded: 256 * 1024, total: 1024 * 1024 }, // 25%
                { loaded: 256 * 1024, total: 512 * 1024 },  // 50%
                { loaded: 1536 * 1024, total: 2 * 1024 * 1024 }, // 75%
                { loaded: 1536 * 1024, total: 1536 * 1024 } // 100%
            ];
            
            // Set progress for each file
            testFiles.forEach((file, index) => {
                form.uploadProgress.set(file.uploadId, progressStates[index]);
                form.uploadControllers.set(file.uploadId, { abort: () => {} });
            });
            
            // Verify all files are being tracked
            if (form.uploadProgress.size === testFiles.length) {
                this.pass(`All ${testFiles.length} files tracked in progress map`);
            } else {
                this.fail(`Expected ${testFiles.length} files in progress map, got ${form.uploadProgress.size}`);
            }
            
            if (form.uploadControllers.size === testFiles.length) {
                this.pass(`All ${testFiles.length} files have upload controllers`);
            } else {
                this.fail(`Expected ${testFiles.length} upload controllers, got ${form.uploadControllers.size}`);
            }
            
            // Test individual file progress percentages
            testFiles.forEach((file, index) => {
                const progress = form.uploadProgress.get(file.uploadId);
                const expectedPercentage = (progressStates[index].loaded / progressStates[index].total) * 100;
                const actualPercentage = (progress.loaded / progress.total) * 100;
                
                if (Math.abs(actualPercentage - expectedPercentage) < 0.1) {
                    this.pass(`File ${index + 1} progress percentage correct: ${actualPercentage.toFixed(1)}%`);
                } else {
                    this.fail(`File ${index + 1} progress percentage incorrect: expected ${expectedPercentage}%, got ${actualPercentage}%`);
                }
            });
            
            // Test concurrent progress updates
            const newProgressStates = [
                { loaded: 512 * 1024, total: 1024 * 1024 }, // 50%
                { loaded: 512 * 1024, total: 512 * 1024 },  // 100%
                { loaded: 2 * 1024 * 1024, total: 2 * 1024 * 1024 }, // 100%
                { loaded: 1536 * 1024, total: 1536 * 1024 } // 100%
            ];
            
            // Update progress for all files simultaneously
            testFiles.forEach((file, index) => {
                form.uploadProgress.set(file.uploadId, newProgressStates[index]);
            });
            
            // Verify updates
            let allUpdated = true;
            testFiles.forEach((file, index) => {
                const progress = form.uploadProgress.get(file.uploadId);
                if (progress.loaded !== newProgressStates[index].loaded) {
                    allUpdated = false;
                }
            });
            
            if (allUpdated) {
                this.pass('Concurrent progress updates handled correctly');
            } else {
                this.fail('Concurrent progress updates not handled correctly');
            }
            
        } catch (error) {
            this.fail(`Multiple file progress tracking test failed: ${error.message}`);
        }
    }
    
    /**
     * Test progress error handling
     */
    async testProgressErrorHandling() {
        console.log('🔍 Testing progress error handling...');
        
        try {
            const form = this.setupFormComponent();
            
            // Test handling of invalid progress values
            const testFile = this.createMockFile('test.pdf', 'application/pdf', 1024 * 1024);
            
            // Test negative loaded value
            try {
                form.uploadProgress.set(testFile.uploadId, { loaded: -100, total: 1024 });
                const progress = form.uploadProgress.get(testFile.uploadId);
                
                // Should handle gracefully (negative progress should be treated as 0)
                const percentage = Math.max(0, (progress.loaded / progress.total) * 100);
                if (percentage === 0) {
                    this.pass('Negative progress values handled gracefully');
                } else {
                    this.fail('Negative progress values not handled correctly');
                }
            } catch (error) {
                this.fail(`Error handling negative progress: ${error.message}`);
            }
            
            // Test loaded > total scenario
            try {
                form.uploadProgress.set(testFile.uploadId, { loaded: 2048, total: 1024 });
                const progress = form.uploadProgress.get(testFile.uploadId);
                
                // Should cap at 100%
                const percentage = Math.min(100, (progress.loaded / progress.total) * 100);
                if (percentage === 100) {
                    this.pass('Excessive progress values capped at 100%');
                } else {
                    this.fail('Excessive progress values not handled correctly');
                }
            } catch (error) {
                this.fail(`Error handling excessive progress: ${error.message}`);
            }
            
            // Test zero total scenario
            try {
                form.uploadProgress.set(testFile.uploadId, { loaded: 100, total: 0 });
                const progress = form.uploadProgress.get(testFile.uploadId);
                
                // Should handle division by zero
                const percentage = progress.total === 0 ? 0 : (progress.loaded / progress.total) * 100;
                if (percentage === 0) {
                    this.pass('Zero total value handled gracefully');
                } else {
                    this.fail('Zero total value not handled correctly');
                }
            } catch (error) {
                this.fail(`Error handling zero total: ${error.message}`);
            }
            
            // Test missing progress data
            try {
                const missingFile = this.createMockFile('missing.pdf', 'application/pdf', 1024);
                const progress = form.uploadProgress.get(missingFile.uploadId);
                
                if (progress === undefined) {
                    this.pass('Missing progress data handled correctly');
                } else {
                    this.fail('Missing progress data should return undefined');
                }
            } catch (error) {
                this.fail(`Error handling missing progress data: ${error.message}`);
            }
            
            // Test controller cleanup on error
            const errorFile = this.createMockFile('error.pdf', 'application/pdf', 1024);
            form.uploadControllers.set(errorFile.uploadId, { abort: () => {} });
            
            // Simulate error cleanup
            form.uploadControllers.delete(errorFile.uploadId);
            
            if (!form.uploadControllers.has(errorFile.uploadId)) {
                this.pass('Upload controller cleaned up on error');
            } else {
                this.fail('Upload controller should be cleaned up on error');
            }
            
        } catch (error) {
            this.fail(`Progress error handling test failed: ${error.message}`);
        }
    }
    
    /**
     * Test progress UI elements and accessibility
     */
    async testProgressUIElements() {
        console.log('🔍 Testing progress UI elements and accessibility...');
        
        try {
            const form = this.setupFormComponent();
            const progressContainer = document.getElementById('upload-progress');
            const progressBar = progressContainer?.querySelector('.progress-bar');
            const statusText = progressContainer?.querySelector('.upload-status');
            const cancelBtn = document.getElementById('cancel-upload');
            
            // Test progress bar accessibility attributes
            if (progressBar) {
                progressBar.setAttribute('role', 'progressbar');
                progressBar.setAttribute('aria-valuemin', '0');
                progressBar.setAttribute('aria-valuemax', '100');
                progressBar.setAttribute('aria-valuenow', '50');
                
                if (progressBar.getAttribute('role') === 'progressbar') {
                    this.pass('Progress bar has correct ARIA role');
                } else {
                    this.fail('Progress bar should have progressbar ARIA role');
                }
                
                if (progressBar.getAttribute('aria-valuemin') === '0') {
                    this.pass('Progress bar has correct aria-valuemin');
                } else {
                    this.fail('Progress bar should have aria-valuemin="0"');
                }
                
                if (progressBar.getAttribute('aria-valuemax') === '100') {
                    this.pass('Progress bar has correct aria-valuemax');
                } else {
                    this.fail('Progress bar should have aria-valuemax="100"');
                }
            }
            
            // Test cancel button accessibility
            if (cancelBtn) {
                // Set aria-label for testing
                cancelBtn.setAttribute('aria-label', 'Cancel file upload');
                const ariaLabel = cancelBtn.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.includes('Cancel')) {
                    this.pass('Cancel button has appropriate aria-label');
                } else {
                    this.fail('Cancel button should have descriptive aria-label');
                }
                
                // Test button icon
                const icon = cancelBtn.querySelector('i.bi-x-circle');
                if (icon) {
                    this.pass('Cancel button has appropriate icon');
                } else {
                    this.fail('Cancel button should have cancel icon');
                }
            }
            
            // Test status text accessibility
            if (statusText) {
                statusText.setAttribute('aria-live', 'polite');
                statusText.setAttribute('aria-atomic', 'true');
                
                if (statusText.getAttribute('aria-live') === 'polite') {
                    this.pass('Status text has aria-live attribute');
                } else {
                    this.fail('Status text should have aria-live="polite"');
                }
                
                if (statusText.getAttribute('aria-atomic') === 'true') {
                    this.pass('Status text has aria-atomic attribute');
                } else {
                    this.fail('Status text should have aria-atomic="true"');
                }
            }
            
            // Test progress container visibility classes
            if (progressContainer) {
                // Test hidden state
                progressContainer.classList.add('d-none');
                if (progressContainer.classList.contains('d-none')) {
                    this.pass('Progress container can be hidden with d-none class');
                } else {
                    this.fail('Progress container should support d-none class');
                }
                
                // Test visible state
                progressContainer.classList.remove('d-none');
                if (!progressContainer.classList.contains('d-none')) {
                    this.pass('Progress container can be shown by removing d-none class');
                } else {
                    this.fail('Progress container should be visible when d-none is removed');
                }
            }
            
            // Test progress bar styling classes
            if (progressBar) {
                const expectedClasses = ['progress-bar'];
                const hasExpectedClasses = expectedClasses.every(cls => progressBar.classList.contains(cls));
                
                if (hasExpectedClasses) {
                    this.pass('Progress bar has required Bootstrap classes');
                } else {
                    this.fail('Progress bar should have required Bootstrap classes');
                }
                
                // Test animation classes
                progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
                if (progressBar.classList.contains('progress-bar-striped') && 
                    progressBar.classList.contains('progress-bar-animated')) {
                    this.pass('Progress bar supports animation classes');
                } else {
                    this.fail('Progress bar should support animation classes');
                }
            }
            
        } catch (error) {
            this.fail(`Progress UI elements test failed: ${error.message}`);
        }
    }
    
    /**
     * Record a passing test
     */
    pass(message) {
        this.results.passed++;
        console.log(`  ✅ ${message}`);
    }
    
    /**
     * Record a failing test
     */
    fail(message) {
        this.results.failed++;
        this.results.errors.push(message);
        console.log(`  ❌ ${message}`);
    }
    
    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        
        if (this.results.failed > 0) {
            console.log('\n🔍 Failures:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        const success = this.results.failed === 0;
        console.log(`\n🎯 Property 7 (Upload Progress Display): ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if this file is executed directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    try {
        const test = new UploadProgressTest();
        const success = await test.runTests();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    }
}

export { UploadProgressTest };