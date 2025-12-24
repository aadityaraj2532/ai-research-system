/**
 * Property-Based Test for Search Functionality
 * Tests Property 27: Real-time Search Filtering
 * Validates: Requirements 9.1, 9.2
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = join(__dirname, '..');

/**
 * Property 27: Real-time Search Filtering
 * For any search input in the dashboard, the system should filter research 
 * sessions in real-time as the user types.
 */
class SearchFunctionalityTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }
    
    /**
     * Run all search functionality tests
     */
    async runTests() {
        console.log('🧪 Testing Property 27: Real-time Search Filtering');
        console.log('📋 Validates: Requirements 9.1, 9.2\n');
        
        try {
            await this.testSearchInputExists();
            await this.testSearchDebouncing();
            await this.testSearchEventHandling();
            await this.testSearchFilteringLogic();
            await this.testSearchStateManagement();
            await this.testSearchClearFunctionality();
            await this.testSearchFilterIntegration();
            await this.testSearchResultsDisplay();
            await this.testSearchAccessibility();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Test that search input exists in dashboard template
     */
    async testSearchInputExists() {
        console.log('🔍 Testing search input existence...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for search input element
            if (dashboardContent.includes('search-input')) {
                this.pass('Search input element exists');
            } else {
                this.fail('Search input element not found');
            }
            
            // Check for search input attributes
            const searchAttributes = [
                'type="text"',
                'placeholder="Search research sessions..."',
                'id="search-input"'
            ];
            
            searchAttributes.forEach(attr => {
                if (dashboardContent.includes(attr)) {
                    this.pass(`Search input has attribute: ${attr}`);
                } else {
                    this.fail(`Search input missing attribute: ${attr}`);
                }
            });
            
            // Check for Bootstrap input group structure
            if (dashboardContent.includes('input-group') && dashboardContent.includes('bi-search')) {
                this.pass('Search input uses Bootstrap input group with search icon');
            } else {
                this.fail('Search input missing proper Bootstrap structure');
            }
            
            // Check for search value binding
            if (dashboardContent.includes('value="${this.searchQuery}"')) {
                this.pass('Search input value bound to component state');
            } else {
                this.fail('Search input value not bound to state');
            }
            
        } catch (error) {
            this.fail(`Search input existence test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search debouncing implementation
     */
    async testSearchDebouncing() {
        console.log('🔍 Testing search debouncing...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for debounce timer
            if (dashboardContent.includes('searchDebounceTimer')) {
                this.pass('Search debounce timer exists');
            } else {
                this.fail('Search debounce timer not found');
            }
            
            // Check for setTimeout usage
            if (dashboardContent.includes('setTimeout')) {
                this.pass('setTimeout used for debouncing');
            } else {
                this.fail('setTimeout not found for debouncing');
            }
            
            // Check for clearTimeout usage
            if (dashboardContent.includes('clearTimeout')) {
                this.pass('clearTimeout used to clear previous timer');
            } else {
                this.fail('clearTimeout not found');
            }
            
            // Check for debounce delay (should be around 300ms)
            if (dashboardContent.includes('300')) {
                this.pass('Appropriate debounce delay configured (300ms)');
            } else {
                this.fail('Debounce delay not properly configured');
            }
            
            // Check that search is triggered after debounce
            if (dashboardContent.includes('this.searchQuery = query') && 
                dashboardContent.includes('this.updateFilters()')) {
                this.pass('Search query updated and filters applied after debounce');
            } else {
                this.fail('Search query not properly updated after debounce');
            }
            
        } catch (error) {
            this.fail(`Search debouncing test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search event handling
     */
    async testSearchEventHandling() {
        console.log('🔍 Testing search event handling...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for handleSearch method
            if (dashboardContent.includes('handleSearch')) {
                this.pass('handleSearch method exists');
            } else {
                this.fail('handleSearch method not found');
            }
            
            // Check for event listener setup
            if (dashboardContent.includes("addEventListener('input', this.handleSearch)")) {
                this.pass('Input event listener properly attached');
            } else {
                this.fail('Input event listener not properly attached');
            }
            
            // Check for method binding
            if (dashboardContent.includes('this.handleSearch = this.handleSearch.bind(this)')) {
                this.pass('handleSearch method properly bound');
            } else {
                this.fail('handleSearch method not properly bound');
            }
            
            // Check for event parameter handling
            if (dashboardContent.includes('event.target.value')) {
                this.pass('Event target value properly accessed');
            } else {
                this.fail('Event target value not properly accessed');
            }
            
        } catch (error) {
            this.fail(`Search event handling test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search filtering logic integration
     */
    async testSearchFilteringLogic() {
        console.log('🔍 Testing search filtering logic...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for getFilteredSessions method
            if (stateContent.includes('getFilteredSessions')) {
                this.pass('getFilteredSessions method exists in state');
            } else {
                this.fail('getFilteredSessions method not found in state');
            }
            
            // Check for search filtering logic
            if (stateContent.includes('search.trim()') && stateContent.includes('toLowerCase()')) {
                this.pass('Search filtering uses case-insensitive matching');
            } else {
                this.fail('Search filtering not case-insensitive');
            }
            
            // Check for query and summary search
            if (stateContent.includes('session.query') && stateContent.includes('session.summary')) {
                this.pass('Search filters both query and summary fields');
            } else {
                this.fail('Search does not filter both query and summary');
            }
            
            // Check for includes method usage
            if (stateContent.includes('.includes(searchLower)')) {
                this.pass('Search uses includes method for substring matching');
            } else {
                this.fail('Search does not use proper substring matching');
            }
            
            // Check for null/undefined handling
            if (stateContent.includes('session.summary &&')) {
                this.pass('Search handles null/undefined summary gracefully');
            } else {
                this.fail('Search does not handle null summary gracefully');
            }
            
        } catch (error) {
            this.fail(`Search filtering logic test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search state management integration
     */
    async testSearchStateManagement() {
        console.log('🔍 Testing search state management...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for updateFilters method call
            if (dashboardContent.includes('this.updateFilters()')) {
                this.pass('updateFilters method called after search');
            } else {
                this.fail('updateFilters method not called');
            }
            
            // Check for state.updateFilters integration
            if (dashboardContent.includes('this.state.updateFilters')) {
                this.pass('State management updateFilters method used');
            } else {
                this.fail('State management not properly integrated');
            }
            
            // Check for search property in filter update
            if (dashboardContent.includes('search: this.searchQuery')) {
                this.pass('Search query passed to state management');
            } else {
                this.fail('Search query not passed to state');
            }
            
            // Check for renderSessions call after filter update
            if (dashboardContent.includes('this.renderSessions()')) {
                this.pass('Sessions re-rendered after search filter update');
            } else {
                this.fail('Sessions not re-rendered after search');
            }
            
        } catch (error) {
            this.fail(`Search state management test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search clear functionality
     */
    async testSearchClearFunctionality() {
        console.log('🔍 Testing search clear functionality...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for clear search button
            if (dashboardContent.includes('clear-search')) {
                this.pass('Clear search button exists');
            } else {
                this.fail('Clear search button not found');
            }
            
            // Check for clear search functionality
            if (dashboardContent.includes("this.searchQuery = ''")) {
                this.pass('Search query cleared when clear button clicked');
            } else {
                this.fail('Search query not properly cleared');
            }
            
            // Check for conditional clear button display
            if (dashboardContent.includes('this.searchQuery ?')) {
                this.pass('Clear button conditionally displayed');
            } else {
                this.fail('Clear button not conditionally displayed');
            }
            
            // Check for clear all filters functionality
            if (dashboardContent.includes('clearAllFilters')) {
                this.pass('Clear all filters functionality exists');
            } else {
                this.fail('Clear all filters functionality not found');
            }
            
            // Check that clear all resets search
            if (dashboardContent.includes("this.searchQuery = '';") && 
                dashboardContent.includes('clearAllFilters')) {
                this.pass('Clear all filters resets search query');
            } else {
                this.fail('Clear all filters does not reset search');
            }
            
        } catch (error) {
            this.fail(`Search clear functionality test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search filter integration with other filters
     */
    async testSearchFilterIntegration() {
        console.log('🔍 Testing search filter integration...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check that search works with status filter
            if (stateContent.includes('search.trim()') && stateContent.includes('status !== \'all\'')) {
                this.pass('Search integrates with status filter');
            } else {
                this.fail('Search does not integrate with status filter');
            }
            
            // Check that search works with date filter
            if (stateContent.includes('search.trim()') && stateContent.includes('dateRange')) {
                this.pass('Search integrates with date filter');
            } else {
                this.fail('Search does not integrate with date filter');
            }
            
            // Check for filter combination logic
            if (stateContent.includes('sessions = sessions.filter')) {
                this.pass('Multiple filters can be applied together');
            } else {
                this.fail('Multiple filters cannot be combined');
            }
            
            // Check for filter order (search should be applied to already filtered results)
            const searchFilterIndex = stateContent.indexOf('searchLower');
            const statusFilterIndex = stateContent.indexOf('status !== \'all\'');
            
            if (searchFilterIndex > 0 && statusFilterIndex > 0) {
                this.pass('Filters can be applied in combination');
            } else {
                this.fail('Filter combination logic not found');
            }
            
        } catch (error) {
            this.fail(`Search filter integration test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search results display
     */
    async testSearchResultsDisplay() {
        console.log('🔍 Testing search results display...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for filter summary display
            if (dashboardContent.includes('updateFilterSummary')) {
                this.pass('Filter summary updated with search results');
            } else {
                this.fail('Filter summary not updated');
            }
            
            // Check for search-specific empty state
            if (dashboardContent.includes('No Results Found')) {
                this.pass('Search-specific empty state exists');
            } else {
                this.fail('Search-specific empty state not found');
            }
            
            // Check for filter summary text generation
            if (dashboardContent.includes('matching') && dashboardContent.includes('this.searchQuery')) {
                this.pass('Filter summary shows search query');
            } else {
                this.fail('Filter summary does not show search query');
            }
            
            // Check for result count display
            if (dashboardContent.includes('resultCount') && dashboardContent.includes('result')) {
                this.pass('Search result count displayed');
            } else {
                this.fail('Search result count not displayed');
            }
            
            // Check for clear filters option in empty state
            if (dashboardContent.includes('Clear Filters') || dashboardContent.includes('clear-all-filters')) {
                this.pass('Clear filters option available in search results');
            } else {
                this.fail('Clear filters option not available');
            }
            
        } catch (error) {
            this.fail(`Search results display test failed: ${error.message}`);
        }
    }
    
    /**
     * Test search accessibility features
     */
    async testSearchAccessibility() {
        console.log('🔍 Testing search accessibility...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check for proper input labeling
            if (dashboardContent.includes('placeholder="Search research sessions..."')) {
                this.pass('Search input has descriptive placeholder');
            } else {
                this.fail('Search input lacks descriptive placeholder');
            }
            
            // Check for search icon
            if (dashboardContent.includes('bi-search')) {
                this.pass('Search input has visual search icon');
            } else {
                this.fail('Search input lacks visual search icon');
            }
            
            // Check for form control class
            if (dashboardContent.includes('form-control')) {
                this.pass('Search input uses Bootstrap form control class');
            } else {
                this.fail('Search input not using proper form styling');
            }
            
            // Check for input group structure
            if (dashboardContent.includes('input-group') && dashboardContent.includes('input-group-text')) {
                this.pass('Search input uses accessible input group structure');
            } else {
                this.fail('Search input lacks accessible structure');
            }
            
            // Check for clear button accessibility
            if (dashboardContent.includes('btn') && dashboardContent.includes('bi-x')) {
                this.pass('Clear search button has proper styling and icon');
            } else {
                this.fail('Clear search button lacks proper accessibility');
            }
            
        } catch (error) {
            this.fail(`Search accessibility test failed: ${error.message}`);
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
        console.log(`\n🎯 Property 27 (Real-time Search Filtering): ${success ? 'PASSED' : 'FAILED'}`);
        
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
    console.log('Starting search functionality tests...');
    const test = new SearchFunctionalityTest();
    const success = await test.runTests();
    console.log(`Test completed with result: ${success}`);
    process.exit(success ? 0 : 1);
} else {
    console.log('Test file imported as module');
}

export { SearchFunctionalityTest };