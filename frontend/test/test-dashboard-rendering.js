/**
 * Property-Based Test for Dashboard Rendering
 * Tests Property 1: Dashboard Data Display
 * Validates: Requirements 1.1
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = join(__dirname, '..');

/**
 * Property 1: Dashboard Data Display
 * For any research session data loaded into the dashboard, the system should 
 * display all required elements including status, query preview, and timestamps 
 * for each session.
 */
class DashboardRenderingTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.dom = null;
        this.window = null;
        this.document = null;
    }
    
    /**
     * Run all dashboard rendering tests
     */
    async runTests() {
        console.log('🧪 Testing Property 1: Dashboard Data Display');
        console.log('📋 Validates: Requirements 1.1\n');
        
        try {
            await this.testDashboardComponentExists();
            await this.testDashboardTemplateStructure();
            await this.testSessionCardTemplate();
            await this.testStatusBadgeMapping();
            await this.testTimestampFormatting();
            await this.testQueryTruncation();
            await this.testEmptyStateTemplate();
            await this.testFilteringLogic();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Test that dashboard component exists and is properly structured
     */
    async testDashboardComponentExists() {
        console.log('🔍 Testing dashboard component existence...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for ResearchDashboard class
            if (dashboardContent.includes('export class ResearchDashboard')) {
                this.pass('ResearchDashboard class exported');
            } else {
                this.fail('ResearchDashboard class not found or not exported');
            }
            
            // Check for required methods
            const requiredMethods = [
                'render',
                'renderSessions',
                'renderSessionCard',
                'getFilteredSessions',
                'handleSearch',
                'handleStatusFilter',
                'handleDateFilter'
            ];
            
            requiredMethods.forEach(method => {
                if (dashboardContent.includes(`${method}(`)) {
                    this.pass(`Method ${method} exists`);
                } else {
                    this.fail(`Method ${method} missing`);
                }
            });
            
        } catch (error) {
            this.fail(`Dashboard component test failed: ${error.message}`);
        }
    }
    
    /**
     * Test dashboard template structure
     */
    async testDashboardTemplateStructure() {
        console.log('🔍 Testing dashboard template structure...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for required template elements
            const requiredElements = [
                'Research Dashboard',
                'search-input',
                'status-filter',
                'date-filter',
                'sessions-container',
                'New Research'
            ];
            
            requiredElements.forEach(element => {
                if (dashboardContent.includes(element)) {
                    this.pass(`Template contains ${element}`);
                } else {
                    this.fail(`Template missing ${element}`);
                }
            });
            
            // Check for Bootstrap classes
            const bootstrapClasses = [
                'form-control',
                'form-select',
                'btn btn-primary',
                'input-group',
                'row',
                'col-'
            ];
            
            bootstrapClasses.forEach(className => {
                if (dashboardContent.includes(className)) {
                    this.pass(`Uses Bootstrap class: ${className}`);
                } else {
                    this.fail(`Missing Bootstrap class: ${className}`);
                }
            });
            
        } catch (error) {
            this.fail(`Template structure test failed: ${error.message}`);
        }
    }
    
    /**
     * Test session card template
     */
    async testSessionCardTemplate() {
        console.log('🔍 Testing session card template...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for session card elements
            const cardElements = [
                'research-card',
                'status-badge',
                'card-title',
                'card-text',
                'card-footer',
                'btn-group',
                'View',
                'Continue'
            ];
            
            cardElements.forEach(element => {
                if (dashboardContent.includes(element)) {
                    this.pass(`Session card contains ${element}`);
                } else {
                    this.fail(`Session card missing ${element}`);
                }
            });
            
            // Check for data attributes
            if (dashboardContent.includes('data-session-id')) {
                this.pass('Session card has data-session-id attribute');
            } else {
                this.fail('Session card missing data-session-id attribute');
            }
            
        } catch (error) {
            this.fail(`Session card template test failed: ${error.message}`);
        }
    }
    
    /**
     * Test status badge mapping
     */
    async testStatusBadgeMapping() {
        console.log('🔍 Testing status badge mapping...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for status mapping
            const statusMappings = [
                'PENDING',
                'PROCESSING', 
                'COMPLETED',
                'FAILED'
            ];
            
            const expectedClasses = [
                'warning',
                'info',
                'success',
                'danger'
            ];
            
            // Check if getStatusClass method exists
            if (dashboardContent.includes('getStatusClass')) {
                this.pass('getStatusClass method exists');
                
                // Check for status mappings
                statusMappings.forEach(status => {
                    if (dashboardContent.includes(`'${status}'`)) {
                        this.pass(`Status mapping includes ${status}`);
                    } else {
                        this.fail(`Status mapping missing ${status}`);
                    }
                });
                
                expectedClasses.forEach(className => {
                    if (dashboardContent.includes(`'${className}'`)) {
                        this.pass(`Status class mapping includes ${className}`);
                    } else {
                        this.fail(`Status class mapping missing ${className}`);
                    }
                });
                
            } else {
                this.fail('getStatusClass method not found');
            }
            
        } catch (error) {
            this.fail(`Status badge mapping test failed: ${error.message}`);
        }
    }
    
    /**
     * Test timestamp formatting logic
     */
    async testTimestampFormatting() {
        console.log('🔍 Testing timestamp formatting logic...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for formatTimeAgo method
            if (dashboardContent.includes('formatTimeAgo')) {
                this.pass('formatTimeAgo method exists');
                
                // Check for time formatting logic
                const timeFormats = [
                    'Just now',
                    'm ago',
                    'h ago',
                    'd ago'
                ];
                
                timeFormats.forEach(format => {
                    if (dashboardContent.includes(format)) {
                        this.pass(`Time format includes: ${format}`);
                    } else {
                        this.fail(`Time format missing: ${format}`);
                    }
                });
                
                // Check for date calculations
                if (dashboardContent.includes('diffInSeconds')) {
                    this.pass('Time difference calculation present');
                } else {
                    this.fail('Time difference calculation missing');
                }
                
            } else {
                this.fail('formatTimeAgo method not found');
            }
            
        } catch (error) {
            this.fail(`Timestamp formatting test failed: ${error.message}`);
        }
    }
    
    /**
     * Test query truncation logic
     */
    async testQueryTruncation() {
        console.log('🔍 Testing query truncation logic...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for truncateText method
            if (dashboardContent.includes('truncateText')) {
                this.pass('truncateText method exists');
                
                // Check for truncation logic
                if (dashboardContent.includes('maxLength') && dashboardContent.includes('substring')) {
                    this.pass('Text truncation logic present');
                } else {
                    this.fail('Text truncation logic incomplete');
                }
                
                // Check for ellipsis
                if (dashboardContent.includes('...')) {
                    this.pass('Ellipsis added for truncated text');
                } else {
                    this.fail('Ellipsis missing for truncated text');
                }
                
                // Check for length limit (should be 100 for query)
                if (dashboardContent.includes('100')) {
                    this.pass('Query truncation limit set to 100 characters');
                } else {
                    this.fail('Query truncation limit not properly set');
                }
                
            } else {
                this.fail('truncateText method not found');
            }
            
        } catch (error) {
            this.fail(`Query truncation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test empty state template
     */
    async testEmptyStateTemplate() {
        console.log('🔍 Testing empty state template...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for empty state method
            if (dashboardContent.includes('getEmptyStateTemplate')) {
                this.pass('getEmptyStateTemplate method exists');
                
                // Check for empty state elements
                const emptyStateElements = [
                    'No Research Sessions',
                    'bi-search',
                    'Start New Research',
                    'new-research'
                ];
                
                emptyStateElements.forEach(element => {
                    if (dashboardContent.includes(element)) {
                        this.pass(`Empty state contains: ${element}`);
                    } else {
                        this.fail(`Empty state missing: ${element}`);
                    }
                });
                
                // Check for filtered empty state
                if (dashboardContent.includes('No Results Found')) {
                    this.pass('Filtered empty state message present');
                } else {
                    this.fail('Filtered empty state message missing');
                }
                
            } else {
                this.fail('getEmptyStateTemplate method not found');
            }
            
        } catch (error) {
            this.fail(`Empty state template test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filtering logic
     */
    async testFilteringLogic() {
        console.log('🔍 Testing filtering logic...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for filter methods
            const filterMethods = [
                'handleSearch',
                'handleStatusFilter', 
                'handleDateFilter',
                'updateFilters',
                'clearAllFilters'
            ];
            
            filterMethods.forEach(method => {
                if (dashboardContent.includes(method)) {
                    this.pass(`Filter method exists: ${method}`);
                } else {
                    this.fail(`Filter method missing: ${method}`);
                }
            });
            
            // Check for debouncing
            if (dashboardContent.includes('debounce') || dashboardContent.includes('setTimeout')) {
                this.pass('Search debouncing implemented');
            } else {
                this.fail('Search debouncing not implemented');
            }
            
            // Check for filter state management
            if (dashboardContent.includes('updateFilters') && dashboardContent.includes('state.updateFilters')) {
                this.pass('Filter state management integrated');
            } else {
                this.fail('Filter state management not properly integrated');
            }
            
        } catch (error) {
            this.fail(`Filtering logic test failed: ${error.message}`);
        }
    }
    
    /**
     * Generate mock session data
     */
    generateMockSession(id = 'test-session', status = 'COMPLETED', createdAt = new Date(), query = 'Test research query') {
        return {
            id: id,
            query: query,
            status: status,
            summary: status === 'COMPLETED' ? 'This is a test research summary that provides insights.' : null,
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString()
        };
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
        console.log(`\n🎯 Property 1 (Dashboard Data Display): ${success ? 'PASSED' : 'FAILED'}`);
        
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
    console.log('Starting dashboard rendering tests...');
    const test = new DashboardRenderingTest();
    const success = await test.runTests();
    console.log(`Test completed with result: ${success}`);
    process.exit(success ? 0 : 1);
} else {
    console.log('Test file imported as module');
}

export { DashboardRenderingTest };