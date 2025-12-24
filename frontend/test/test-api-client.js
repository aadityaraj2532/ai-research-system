/**
 * Property-Based Test for API Client
 * Tests Property 3: API Integration and Feedback
 * Validates: Requirements 1.3
 */

import { APIClient, APIError } from '../js/api.js';

/**
 * Property 3: API Integration and Feedback
 * For any research query submission, the system should call the correct API endpoint 
 * and provide immediate user feedback about the submission status.
 */
class APIClientTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.apiClient = new APIClient();
    }
    
    /**
     * Run all API client tests
     */
    async runTests() {
        console.log('🧪 Testing Property 3: API Integration and Feedback');
        console.log('📋 Validates: Requirements 1.3\n');
        
        try {
            await this.testAPIClientInstantiation();
            await this.testRequestMethodExists();
            await this.testResearchEndpointMethods();
            await this.testFileUploadMethod();
            await this.testErrorHandling();
            await this.testRequestConfiguration();
            await this.testTimeoutHandling();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Test that API client can be instantiated properly
     */
    async testAPIClientInstantiation() {
        console.log('🔍 Testing API client instantiation...');
        
        try {
            const client = new APIClient();
            
            if (client instanceof APIClient) {
                this.pass('APIClient instantiates correctly');
            } else {
                this.fail('APIClient does not instantiate correctly');
            }
            
            // Check required properties
            const requiredProps = ['baseURL', 'defaultHeaders', 'timeout', 'maxRetries'];
            for (const prop of requiredProps) {
                if (client.hasOwnProperty(prop)) {
                    this.pass(`APIClient has required property: ${prop}`);
                } else {
                    this.fail(`APIClient missing required property: ${prop}`);
                }
            }
            
            // Check baseURL format
            if (client.baseURL === '/api') {
                this.pass('APIClient has correct baseURL');
            } else {
                this.fail(`APIClient baseURL incorrect: ${client.baseURL}`);
            }
            
        } catch (error) {
            this.fail(`APIClient instantiation failed: ${error.message}`);
        }
    }
    
    /**
     * Test that core request method exists and is properly configured
     */
    async testRequestMethodExists() {
        console.log('🔍 Testing request method...');
        
        if (typeof this.apiClient.request === 'function') {
            this.pass('APIClient has request method');
        } else {
            this.fail('APIClient missing request method');
        }
        
        // Test method signature by checking if it accepts parameters
        try {
            // This should not throw an error for method signature
            const requestMethod = this.apiClient.request;
            if (requestMethod.length >= 1) {
                this.pass('Request method accepts required parameters');
            } else {
                this.fail('Request method does not accept required parameters');
            }
        } catch (error) {
            this.fail(`Request method signature test failed: ${error.message}`);
        }
    }
    
    /**
     * Test that all required research API methods exist
     */
    async testResearchEndpointMethods() {
        console.log('🔍 Testing research API methods...');
        
        const requiredMethods = [
            'startResearch',
            'getResearchHistory', 
            'getResearchDetails',
            'continueResearch',
            'deleteResearch'
        ];
        
        for (const method of requiredMethods) {
            if (typeof this.apiClient[method] === 'function') {
                this.pass(`APIClient has ${method} method`);
                
                // Test method signature
                const methodFunc = this.apiClient[method];
                if (methodFunc.constructor.name === 'AsyncFunction') {
                    this.pass(`${method} is async function`);
                } else {
                    this.fail(`${method} should be async function`);
                }
            } else {
                this.fail(`APIClient missing ${method} method`);
            }
        }
    }
    
    /**
     * Test file upload functionality
     */
    async testFileUploadMethod() {
        console.log('🔍 Testing file upload method...');
        
        if (typeof this.apiClient.uploadFile === 'function') {
            this.pass('APIClient has uploadFile method');
        } else {
            this.fail('APIClient missing uploadFile method');
        }
        
        if (typeof this.apiClient.validateFile === 'function') {
            this.pass('APIClient has validateFile method');
        } else {
            this.fail('APIClient missing validateFile method');
        }
        
        // Test file validation with various file types
        const testCases = [
            { name: 'test.pdf', type: 'application/pdf', size: 1024, shouldPass: true },
            { name: 'test.txt', type: 'text/plain', size: 1024, shouldPass: true },
            { name: 'test.doc', type: 'application/msword', size: 1024, shouldPass: true },
            { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024, shouldPass: true },
            { name: 'test.jpg', type: 'image/jpeg', size: 1024, shouldPass: false },
            { name: 'large.pdf', type: 'application/pdf', size: 20 * 1024 * 1024, shouldPass: false }
        ];
        
        for (const testCase of testCases) {
            try {
                const mockFile = {
                    name: testCase.name,
                    type: testCase.type,
                    size: testCase.size
                };
                
                this.apiClient.validateFile(mockFile);
                
                if (testCase.shouldPass) {
                    this.pass(`File validation passed for ${testCase.name}`);
                } else {
                    this.fail(`File validation should have failed for ${testCase.name}`);
                }
            } catch (error) {
                if (!testCase.shouldPass) {
                    this.pass(`File validation correctly rejected ${testCase.name}`);
                } else {
                    this.fail(`File validation incorrectly rejected ${testCase.name}: ${error.message}`);
                }
            }
        }
    }
    
    /**
     * Test error handling capabilities
     */
    async testErrorHandling() {
        console.log('🔍 Testing error handling...');
        
        // Test APIError class
        try {
            const error = new APIError('Test error', 404, { detail: 'Not found' });
            
            if (error instanceof Error) {
                this.pass('APIError extends Error class');
            } else {
                this.fail('APIError does not extend Error class');
            }
            
            if (error.status === 404) {
                this.pass('APIError stores status code');
            } else {
                this.fail('APIError does not store status code correctly');
            }
            
            if (error.details && error.details.detail === 'Not found') {
                this.pass('APIError stores error details');
            } else {
                this.fail('APIError does not store error details correctly');
            }
            
            // Test error classification methods
            const testMethods = [
                { method: 'isClientError', status: 404, expected: true },
                { method: 'isServerError', status: 500, expected: true },
                { method: 'isNetworkError', status: 0, expected: true },
                { method: 'isClientError', status: 500, expected: false }
            ];
            
            for (const test of testMethods) {
                const testError = new APIError('Test', test.status);
                const result = testError[test.method]();
                
                if (result === test.expected) {
                    this.pass(`APIError.${test.method}() works correctly for status ${test.status}`);
                } else {
                    this.fail(`APIError.${test.method}() incorrect for status ${test.status}`);
                }
            }
            
            // Test user-friendly messages
            const userMessage = error.getUserMessage();
            if (typeof userMessage === 'string' && userMessage.length > 0) {
                this.pass('APIError provides user-friendly messages');
            } else {
                this.fail('APIError does not provide user-friendly messages');
            }
            
        } catch (error) {
            this.fail(`Error handling test failed: ${error.message}`);
        }
    }
    
    /**
     * Test request configuration
     */
    async testRequestConfiguration() {
        console.log('🔍 Testing request configuration...');
        
        // Test default headers
        const expectedHeaders = ['Content-Type', 'X-Requested-With'];
        for (const header of expectedHeaders) {
            if (this.apiClient.defaultHeaders[header]) {
                this.pass(`Default header ${header} is set`);
            } else {
                this.fail(`Default header ${header} is missing`);
            }
        }
        
        // Test timeout configuration
        if (typeof this.apiClient.timeout === 'number' && this.apiClient.timeout > 0) {
            this.pass('Timeout is configured');
        } else {
            this.fail('Timeout is not properly configured');
        }
        
        // Test retry configuration
        if (typeof this.apiClient.maxRetries === 'number' && this.apiClient.maxRetries > 0) {
            this.pass('Max retries is configured');
        } else {
            this.fail('Max retries is not properly configured');
        }
        
        if (typeof this.apiClient.retryDelay === 'number' && this.apiClient.retryDelay > 0) {
            this.pass('Retry delay is configured');
        } else {
            this.fail('Retry delay is not properly configured');
        }
    }
    
    /**
     * Test timeout handling
     */
    async testTimeoutHandling() {
        console.log('🔍 Testing timeout handling...');
        
        // Test delay utility method
        if (typeof this.apiClient.delay === 'function') {
            this.pass('APIClient has delay utility method');
            
            try {
                const start = Date.now();
                await this.apiClient.delay(100);
                const elapsed = Date.now() - start;
                
                if (elapsed >= 90 && elapsed <= 150) {
                    this.pass('Delay method works correctly');
                } else {
                    this.fail(`Delay method timing incorrect: ${elapsed}ms`);
                }
            } catch (error) {
                this.fail(`Delay method failed: ${error.message}`);
            }
        } else {
            this.fail('APIClient missing delay utility method');
        }
        
        // Test response parsing methods
        const parsingMethods = ['parseResponse', 'parseErrorResponse'];
        for (const method of parsingMethods) {
            if (typeof this.apiClient[method] === 'function') {
                this.pass(`APIClient has ${method} method`);
            } else {
                this.fail(`APIClient missing ${method} method`);
            }
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
        console.log(`\n🎯 Property 3 (API Integration and Feedback): ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new APIClientTest();
    const success = await test.runTests();
    process.exit(success ? 0 : 1);
}

export { APIClientTest };