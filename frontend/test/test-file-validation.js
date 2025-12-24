/**
 * Property-Based Test for File Upload Validation
 * Tests Property 6: File Upload Validation
 * Validates: Requirements 2.2
 */

import { JSDOM } from 'jsdom';
import { ResearchForm } from '../js/components/research-form.js';

/**
 * Property 6: File Upload Validation
 * For any file uploaded by a user, the system should validate file type and size 
 * constraints before allowing the upload to proceed.
 */
class FileValidationTest {
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
    }
    
    /**
     * Run all file validation tests
     */
    async runTests() {
        console.log('🧪 Testing Property 6: File Upload Validation');
        console.log('📋 Validates: Requirements 2.2\n');
        
        try {
            await this.testValidFileTypes();
            await this.testInvalidFileTypes();
            await this.testFileSizeValidation();
            await this.testEmptyFileValidation();
            await this.testMultipleFileValidation();
            await this.testFileExtensionFallback();
            await this.testDuplicateFileHandling();
            await this.testMaxFileLimit();
            
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
            webkitRelativePath: ''
        };
    }
    
    /**
     * Setup form component for testing
     */
    setupFormComponent() {
        const container = document.getElementById('test-container');
        const mockState = { getState: () => ({}) };
        const mockAPI = { 
            baseURL: '/api',
            startResearch: () => Promise.resolve({ id: 'test-id' })
        };
        const mockNotifications = { 
            showError: (msg) => console.log(`Error: ${msg}`),
            showSuccess: (msg) => console.log(`Success: ${msg}`),
            showWarning: (msg) => console.log(`Warning: ${msg}`),
            showInfo: (msg) => console.log(`Info: ${msg}`)
        };
        
        const form = new ResearchForm(container, mockState, mockAPI, mockNotifications);
        form.render();
        
        return form;
    }
    
    /**
     * Test valid file types are accepted
     */
    async testValidFileTypes() {
        console.log('🔍 Testing valid file types...');
        
        try {
            const form = this.setupFormComponent();
            
            // Test all supported file types
            const validFiles = [
                this.createMockFile('document.pdf', 'application/pdf', 1024 * 1024), // 1MB PDF
                this.createMockFile('text.txt', 'text/plain', 512 * 1024), // 512KB TXT
                this.createMockFile('document.doc', 'application/msword', 2 * 1024 * 1024), // 2MB DOC
                this.createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 3 * 1024 * 1024) // 3MB DOCX
            ];
            
            for (const file of validFiles) {
                const isValid = form.validateFile(file);
                if (isValid) {
                    this.pass(`Valid file type accepted: ${file.name} (${file.type})`);
                } else {
                    this.fail(`Valid file type rejected: ${file.name} (${file.type})`);
                }
            }
            
        } catch (error) {
            this.fail(`Valid file types test failed: ${error.message}`);
        }
    }
    
    /**
     * Test invalid file types are rejected
     */
    async testInvalidFileTypes() {
        console.log('🔍 Testing invalid file types...');
        
        try {
            const form = this.setupFormComponent();
            
            // Test unsupported file types
            const invalidFiles = [
                this.createMockFile('image.jpg', 'image/jpeg', 1024 * 1024), // JPEG image
                this.createMockFile('image.png', 'image/png', 1024 * 1024), // PNG image
                this.createMockFile('video.mp4', 'video/mp4', 5 * 1024 * 1024), // MP4 video
                this.createMockFile('audio.mp3', 'audio/mpeg', 2 * 1024 * 1024), // MP3 audio
                this.createMockFile('archive.zip', 'application/zip', 1024 * 1024), // ZIP archive
                this.createMockFile('executable.exe', 'application/x-msdownload', 1024 * 1024), // Executable
                this.createMockFile('spreadsheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024 * 1024) // Excel
            ];
            
            for (const file of invalidFiles) {
                const isValid = form.validateFile(file);
                if (!isValid) {
                    this.pass(`Invalid file type rejected: ${file.name} (${file.type})`);
                } else {
                    this.fail(`Invalid file type accepted: ${file.name} (${file.type})`);
                }
            }
            
        } catch (error) {
            this.fail(`Invalid file types test failed: ${error.message}`);
        }
    }
    
    /**
     * Test file size validation
     */
    async testFileSizeValidation() {
        console.log('🔍 Testing file size validation...');
        
        try {
            const form = this.setupFormComponent();
            const maxSize = 10 * 1024 * 1024; // 10MB limit
            
            // Test files within size limit
            const validSizeFiles = [
                this.createMockFile('small.pdf', 'application/pdf', 1024), // 1KB
                this.createMockFile('medium.pdf', 'application/pdf', 5 * 1024 * 1024), // 5MB
                this.createMockFile('large.pdf', 'application/pdf', maxSize), // Exactly 10MB
                this.createMockFile('almostmax.pdf', 'application/pdf', maxSize - 1) // Just under limit
            ];
            
            for (const file of validSizeFiles) {
                const isValid = form.validateFile(file);
                if (isValid) {
                    this.pass(`File within size limit accepted: ${file.name} (${this.formatFileSize(file.size)})`);
                } else {
                    this.fail(`File within size limit rejected: ${file.name} (${this.formatFileSize(file.size)})`);
                }
            }
            
            // Test files exceeding size limit
            const oversizedFiles = [
                this.createMockFile('toolarge.pdf', 'application/pdf', maxSize + 1), // Just over limit
                this.createMockFile('huge.pdf', 'application/pdf', 20 * 1024 * 1024), // 20MB
                this.createMockFile('massive.pdf', 'application/pdf', 100 * 1024 * 1024) // 100MB
            ];
            
            for (const file of oversizedFiles) {
                const isValid = form.validateFile(file);
                if (!isValid) {
                    this.pass(`Oversized file rejected: ${file.name} (${this.formatFileSize(file.size)})`);
                } else {
                    this.fail(`Oversized file accepted: ${file.name} (${this.formatFileSize(file.size)})`);
                }
            }
            
        } catch (error) {
            this.fail(`File size validation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test empty file validation
     */
    async testEmptyFileValidation() {
        console.log('🔍 Testing empty file validation...');
        
        try {
            const form = this.setupFormComponent();
            
            // Test empty files with different types
            const emptyFiles = [
                this.createMockFile('empty.pdf', 'application/pdf', 0),
                this.createMockFile('empty.txt', 'text/plain', 0),
                this.createMockFile('empty.doc', 'application/msword', 0),
                this.createMockFile('empty.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 0)
            ];
            
            for (const file of emptyFiles) {
                const isValid = form.validateFile(file);
                if (!isValid) {
                    this.pass(`Empty file rejected: ${file.name}`);
                } else {
                    this.fail(`Empty file accepted: ${file.name}`);
                }
            }
            
        } catch (error) {
            this.fail(`Empty file validation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test multiple file validation
     */
    async testMultipleFileValidation() {
        console.log('🔍 Testing multiple file validation...');
        
        try {
            const form = this.setupFormComponent();
            
            // Test batch of mixed valid and invalid files
            const mixedFiles = [
                this.createMockFile('valid1.pdf', 'application/pdf', 1024 * 1024), // Valid
                this.createMockFile('invalid.jpg', 'image/jpeg', 1024 * 1024), // Invalid type
                this.createMockFile('valid2.txt', 'text/plain', 512 * 1024), // Valid
                this.createMockFile('toolarge.pdf', 'application/pdf', 20 * 1024 * 1024), // Too large
                this.createMockFile('valid3.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2 * 1024 * 1024), // Valid
                this.createMockFile('empty.doc', 'application/msword', 0) // Empty
            ];
            
            let validCount = 0;
            let invalidCount = 0;
            
            for (const file of mixedFiles) {
                const isValid = form.validateFile(file);
                if (isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                }
            }
            
            // Should have 3 valid files and 3 invalid files
            if (validCount === 3) {
                this.pass(`Correct number of valid files identified: ${validCount}`);
            } else {
                this.fail(`Incorrect number of valid files identified: ${validCount}, expected 3`);
            }
            
            if (invalidCount === 3) {
                this.pass(`Correct number of invalid files identified: ${invalidCount}`);
            } else {
                this.fail(`Incorrect number of invalid files identified: ${invalidCount}, expected 3`);
            }
            
        } catch (error) {
            this.fail(`Multiple file validation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test file extension fallback validation
     */
    async testFileExtensionFallback() {
        console.log('🔍 Testing file extension fallback validation...');
        
        try {
            const form = this.setupFormComponent();
            
            // Test files with missing or incorrect MIME types but correct extensions
            const extensionFiles = [
                this.createMockFile('document.pdf', '', 1024 * 1024), // No MIME type, PDF extension
                this.createMockFile('text.txt', 'application/octet-stream', 512 * 1024), // Generic MIME, TXT extension
                this.createMockFile('document.doc', 'application/octet-stream', 2 * 1024 * 1024), // Generic MIME, DOC extension
                this.createMockFile('document.docx', '', 3 * 1024 * 1024) // No MIME type, DOCX extension
            ];
            
            for (const file of extensionFiles) {
                const isValid = form.validateFile(file);
                if (isValid) {
                    this.pass(`File with correct extension accepted despite missing/wrong MIME: ${file.name}`);
                } else {
                    this.fail(`File with correct extension rejected: ${file.name}`);
                }
            }
            
            // Test files with wrong extensions
            const wrongExtensionFiles = [
                this.createMockFile('image.jpg', '', 1024 * 1024), // Wrong extension
                this.createMockFile('video.mp4', 'application/octet-stream', 5 * 1024 * 1024), // Wrong extension
                this.createMockFile('noextension', '', 1024 * 1024) // No extension
            ];
            
            for (const file of wrongExtensionFiles) {
                const isValid = form.validateFile(file);
                if (!isValid) {
                    this.pass(`File with wrong extension rejected: ${file.name}`);
                } else {
                    this.fail(`File with wrong extension accepted: ${file.name}`);
                }
            }
            
        } catch (error) {
            this.fail(`File extension fallback test failed: ${error.message}`);
        }
    }
    
    /**
     * Test duplicate file handling
     */
    async testDuplicateFileHandling() {
        console.log('🔍 Testing duplicate file handling...');
        
        try {
            const form = this.setupFormComponent();
            
            // Create identical files (same name and size)
            const originalFile = this.createMockFile('document.pdf', 'application/pdf', 1024 * 1024);
            const duplicateFile = this.createMockFile('document.pdf', 'application/pdf', 1024 * 1024);
            const similarFile = this.createMockFile('document.pdf', 'application/pdf', 2 * 1024 * 1024); // Different size
            
            // Add original file
            form.files = [];
            form.addFiles([originalFile]);
            
            if (form.files.length === 1) {
                this.pass('Original file added successfully');
            } else {
                this.fail(`Expected 1 file, got ${form.files.length}`);
            }
            
            // Try to add duplicate file
            const initialCount = form.files.length;
            form.addFiles([duplicateFile]);
            
            if (form.files.length === initialCount) {
                this.pass('Duplicate file rejected (same name and size)');
            } else {
                this.fail('Duplicate file was accepted');
            }
            
            // Add similar file (different size)
            form.addFiles([similarFile]);
            
            if (form.files.length === initialCount + 1) {
                this.pass('Similar file with different size accepted');
            } else {
                this.fail('Similar file with different size was rejected');
            }
            
        } catch (error) {
            this.fail(`Duplicate file handling test failed: ${error.message}`);
        }
    }
    
    /**
     * Test maximum file limit
     */
    async testMaxFileLimit() {
        console.log('🔍 Testing maximum file limit...');
        
        try {
            const form = this.setupFormComponent();
            const maxFiles = 10; // As defined in the component
            
            // Create files up to the limit
            const files = [];
            for (let i = 1; i <= maxFiles + 5; i++) {
                files.push(this.createMockFile(`file${i}.pdf`, 'application/pdf', 1024 * 1024));
            }
            
            // Add files in batches to test limit enforcement
            form.files = [];
            
            // Add first batch (should all be accepted)
            const firstBatch = files.slice(0, maxFiles);
            form.addFiles(firstBatch);
            
            if (form.files.length === maxFiles) {
                this.pass(`Maximum file limit respected: ${form.files.length}/${maxFiles}`);
            } else {
                this.fail(`Expected ${maxFiles} files, got ${form.files.length}`);
            }
            
            // Try to add more files (should be rejected)
            const extraBatch = files.slice(maxFiles, maxFiles + 3);
            const beforeCount = form.files.length;
            form.addFiles(extraBatch);
            
            if (form.files.length === beforeCount) {
                this.pass('Additional files beyond limit rejected');
            } else {
                this.fail(`Files beyond limit were accepted: ${form.files.length} > ${maxFiles}`);
            }
            
            // Test partial addition when some slots are available
            form.files = files.slice(0, maxFiles - 2); // Leave 2 slots
            const partialBatch = files.slice(maxFiles, maxFiles + 5); // Try to add 5 more
            form.addFiles(partialBatch);
            
            if (form.files.length === maxFiles) {
                this.pass('Partial file addition works correctly when slots available');
            } else {
                this.fail(`Expected ${maxFiles} files after partial addition, got ${form.files.length}`);
            }
            
        } catch (error) {
            this.fail(`Maximum file limit test failed: ${error.message}`);
        }
    }
    
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        console.log(`\n🎯 Property 6 (File Upload Validation): ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if this file is executed directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    try {
        const test = new FileValidationTest();
        const success = await test.runTests();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    }
}

export { FileValidationTest };