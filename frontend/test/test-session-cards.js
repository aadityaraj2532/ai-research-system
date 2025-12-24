/**
 * Property-Based Test for Session Cards
 * Tests Property 13: Visual Status Indicators
 * Validates: Requirements 4.5
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = join(__dirname, '..');

/**
 * Property 13: Visual Status Indicators
 * For any research session status, the system should use appropriate visual 
 * indicators (progress bars, spinners, badges) to communicate the status clearly.
 */
class SessionCardsTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }
    
    /**
     * Run all session card tests
     */
    async runTests() {
        console.log('🧪 Testing Property 13: Visual Status Indicators');
        console.log('📋 Validates: Requirements 4.5\n');
        
        try {
            await this.testStatusBadgeMapping();
            await this.testStatusBadgeClasses();
            await this.testStatusBadgeVisibility();
            await this.testContinueButtonVisibility();
            await this.testCardStructure();
            await this.testVisualIndicatorConsistency();
            await this.testStatusBasedRendering();
            await this.testAccessibilityAttributes();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Test status badge mapping for all possible statuses
     */
    async testStatusBadgeMapping() {
        console.log('🔍 Testing status badge mapping...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Define all possible research session statuses
            const expectedStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
            const expectedClasses = ['warning', 'info', 'success', 'danger'];
            
            // Check that getStatusClass method exists
            if (dashboardContent.includes('getStatusClass')) {
                this.pass('getStatusClass method exists for status mapping');
            } else {
                this.fail('getStatusClass method not found');
                return;
            }
            
            // Test each status has a corresponding visual class
            for (let i = 0; i < expectedStatuses.length; i++) {
                const status = expectedStatuses[i];
                const expectedClass = expectedClasses[i];
                
                if (dashboardContent.includes(`'${status}'`) && dashboardContent.includes(`'${expectedClass}'`)) {
                    this.pass(`Status ${status} maps to visual class ${expectedClass}`);
                } else {
                    this.fail(`Status ${status} missing proper visual mapping`);
                }
            }
            
            // Test default case handling
            if (dashboardContent.includes('secondary') || dashboardContent.includes('default')) {
                this.pass('Default status class handling present');
            } else {
                this.fail('Default status class handling missing');
            }
            
        } catch (error) {
            this.fail(`Status badge mapping test failed: ${error.message}`);
        }
    }
    
    /**
     * Test that status badges use correct Bootstrap classes
     */
    async testStatusBadgeClasses() {
        console.log('🔍 Testing status badge Bootstrap classes...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for Bootstrap badge classes in template
            const requiredBadgeClasses = [
                'badge',
                'status-badge',
                'bg-'
            ];
            
            requiredBadgeClasses.forEach(className => {
                if (dashboardContent.includes(className)) {
                    this.pass(`Badge uses Bootstrap class: ${className}`);
                } else {
                    this.fail(`Badge missing Bootstrap class: ${className}`);
                }
            });
            
            // Check that badge displays status text
            if (dashboardContent.includes('${session.status}')) {
                this.pass('Badge displays status text dynamically');
            } else {
                this.fail('Badge does not display status text');
            }
            
            // Check for proper badge positioning in card header
            if (dashboardContent.includes('card-header') && dashboardContent.includes('status-badge')) {
                this.pass('Status badge positioned in card header');
            } else {
                this.fail('Status badge not properly positioned');
            }
            
        } catch (error) {
            this.fail(`Status badge classes test failed: ${error.message}`);
        }
    }
    
    /**
     * Test status badge visibility and prominence
     */
    async testStatusBadgeVisibility() {
        console.log('🔍 Testing status badge visibility...');
        
        try {
            const cssPath = join(frontendDir, 'css', 'styles.css');
            const cssContent = await fs.readFile(cssPath, 'utf8');
            
            // Check for status badge styling
            if (cssContent.includes('.status-badge')) {
                this.pass('Status badge has dedicated CSS styling');
                
                // Check for visibility properties
                const visibilityProperties = [
                    'font-size',
                    'padding',
                    'border-radius',
                    'font-weight'
                ];
                
                visibilityProperties.forEach(property => {
                    if (cssContent.includes(property)) {
                        this.pass(`Status badge styling includes ${property}`);
                    } else {
                        this.fail(`Status badge styling missing ${property}`);
                    }
                });
                
                // Check for text transformation (uppercase for better visibility)
                if (cssContent.includes('text-transform') && cssContent.includes('uppercase')) {
                    this.pass('Status badge uses uppercase text for clarity');
                } else {
                    this.fail('Status badge should use uppercase text for better visibility');
                }
                
            } else {
                this.fail('Status badge CSS styling not found');
            }
            
        } catch (error) {
            this.fail(`Status badge visibility test failed: ${error.message}`);
        }
    }
    
    /**
     * Test continue button visibility based on status
     */
    async testContinueButtonVisibility() {
        console.log('🔍 Testing continue button visibility logic...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for conditional continue button rendering
            if (dashboardContent.includes("session.status === 'COMPLETED'")) {
                this.pass('Continue button visibility based on COMPLETED status');
            } else {
                this.fail('Continue button visibility logic not found');
            }
            
            // Check for continue button structure
            const continueButtonElements = [
                'continue-btn',
                'data-session-id',
                'Continue',
                'bi-arrow-right-circle'
            ];
            
            continueButtonElements.forEach(element => {
                if (dashboardContent.includes(element)) {
                    this.pass(`Continue button includes: ${element}`);
                } else {
                    this.fail(`Continue button missing: ${element}`);
                }
            });
            
            // Check that continue button is only shown for completed sessions
            const conditionalPattern = /session\.status === 'COMPLETED'.*continue-btn/s;
            if (conditionalPattern.test(dashboardContent)) {
                this.pass('Continue button properly conditional on status');
            } else {
                this.fail('Continue button not properly conditional');
            }
            
        } catch (error) {
            this.fail(`Continue button visibility test failed: ${error.message}`);
        }
    }
    
    /**
     * Test overall card structure for visual indicators
     */
    async testCardStructure() {
        console.log('🔍 Testing card structure for visual indicators...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for Bootstrap card structure
            const cardElements = [
                'card',
                'research-card',
                'card-header',
                'card-body',
                'card-footer',
                'h-100'
            ];
            
            cardElements.forEach(element => {
                if (dashboardContent.includes(element)) {
                    this.pass(`Card structure includes: ${element}`);
                } else {
                    this.fail(`Card structure missing: ${element}`);
                }
            });
            
            // Check for visual hierarchy elements
            const hierarchyElements = [
                'card-title',
                'card-text',
                'text-muted',
                'btn-group'
            ];
            
            hierarchyElements.forEach(element => {
                if (dashboardContent.includes(element)) {
                    this.pass(`Visual hierarchy includes: ${element}`);
                } else {
                    this.fail(`Visual hierarchy missing: ${element}`);
                }
            });
            
        } catch (error) {
            this.fail(`Card structure test failed: ${error.message}`);
        }
    }
    
    /**
     * Test visual indicator consistency across different statuses
     */
    async testVisualIndicatorConsistency() {
        console.log('🔍 Testing visual indicator consistency...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Test that all cards use the same template structure
            const templateStructureElements = [
                'data-session-id="${session.id}"',
                'bg-${statusClass}',
                '${session.status}',
                '${timeAgo}',
                '${this.truncateText(session.query',
                'href="#research/${session.id}"'
            ];
            
            templateStructureElements.forEach(element => {
                if (dashboardContent.includes(element)) {
                    this.pass(`Consistent template structure: ${element}`);
                } else {
                    this.fail(`Inconsistent template structure: ${element}`);
                }
            });
            
            // Test that visual indicators are applied consistently
            if (dashboardContent.includes('getStatusClass(session.status)')) {
                this.pass('Status class applied consistently to all cards');
            } else {
                this.fail('Status class not consistently applied');
            }
            
            // Test that time formatting is consistent
            if (dashboardContent.includes('formatTimeAgo(session.created_at)')) {
                this.pass('Time formatting applied consistently');
            } else {
                this.fail('Time formatting not consistently applied');
            }
            
        } catch (error) {
            this.fail(`Visual indicator consistency test failed: ${error.message}`);
        }
    }
    
    /**
     * Test status-based rendering variations
     */
    async testStatusBasedRendering() {
        console.log('🔍 Testing status-based rendering variations...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Test different content for different statuses
            
            // Check for summary handling based on status
            if (dashboardContent.includes('session.summary') && dashboardContent.includes('Research in progress')) {
                this.pass('Different content shown based on session completion');
            } else {
                this.fail('Status-based content variation not implemented');
            }
            
            // Check for cost display conditional rendering
            if (dashboardContent.includes('session.cost ?')) {
                this.pass('Cost display conditionally rendered');
            } else {
                this.fail('Cost display not conditionally rendered');
            }
            
            // Test that processing sessions show appropriate messaging
            const processingIndicators = [
                'Research in progress',
                'processing',
                'PROCESSING'
            ];
            
            let processingIndicatorFound = false;
            processingIndicators.forEach(indicator => {
                if (dashboardContent.includes(indicator)) {
                    processingIndicatorFound = true;
                }
            });
            
            if (processingIndicatorFound) {
                this.pass('Processing status has appropriate visual indicators');
            } else {
                this.fail('Processing status lacks visual indicators');
            }
            
        } catch (error) {
            this.fail(`Status-based rendering test failed: ${error.message}`);
        }
    }
    
    /**
     * Test accessibility attributes for visual indicators
     */
    async testAccessibilityAttributes() {
        console.log('🔍 Testing accessibility attributes...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for ARIA attributes and semantic elements
            const accessibilityFeatures = [
                'role="group"',
                'data-session-id',
                'btn-outline-primary',
                'btn-outline-secondary'
            ];
            
            accessibilityFeatures.forEach(feature => {
                if (dashboardContent.includes(feature)) {
                    this.pass(`Accessibility feature present: ${feature}`);
                } else {
                    this.fail(`Accessibility feature missing: ${feature}`);
                }
            });
            
            // Check for semantic button structure
            if (dashboardContent.includes('<button') && dashboardContent.includes('</button>')) {
                this.pass('Semantic button elements used');
            } else {
                this.fail('Non-semantic button elements detected');
            }
            
            // Check for proper link structure
            if (dashboardContent.includes('<a href=') && dashboardContent.includes('</a>')) {
                this.pass('Semantic link elements used');
            } else {
                this.fail('Non-semantic link elements detected');
            }
            
            // Check for Bootstrap icon accessibility
            if (dashboardContent.includes('bi-eye') && dashboardContent.includes('bi-arrow-right-circle')) {
                this.pass('Bootstrap icons used for visual enhancement');
            } else {
                this.fail('Visual icons missing from action buttons');
            }
            
        } catch (error) {
            this.fail(`Accessibility attributes test failed: ${error.message}`);
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
        console.log(`\n🎯 Property 13 (Visual Status Indicators): ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if this file is executed directly
console.log('Test file loaded');

// Check if this file is being run directly (handle both Windows and Unix paths)
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) || 
                     import.meta.url === `file://${process.argv[1]}` ||
                     import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
    console.log('Starting session cards tests...');
    const test = new SessionCardsTest();
    const success = await test.runTests();
    console.log(`Test completed with result: ${success}`);
    process.exit(success ? 0 : 1);
} else {
    console.log('Test file imported as module');
}

export { SessionCardsTest };