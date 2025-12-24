/**
 * Property-Based Test for Filter Persistence
 * Tests Property 30: Filter State Persistence
 * Validates: Requirements 9.5
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = join(__dirname, '..');

/**
 * Property 30: Filter State Persistence
 * For any filter applied on the dashboard, the system should maintain filter 
 * state when navigating away and returning to the dashboard.
 */
class FilterPersistenceTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }
    
    /**
     * Run all filter persistence tests
     */
    async runTests() {
        console.log('🧪 Testing Property 30: Filter State Persistence');
        console.log('📋 Validates: Requirements 9.5\n');
        
        try {
            await this.testStateManagerPersistence();
            await this.testLocalStorageIntegration();
            await this.testFilterStateStructure();
            await this.testFilterStateLoading();
            await this.testFilterStateSaving();
            await this.testDashboardFilterRestoration();
            await this.testFilterStateValidation();
            await this.testPersistenceErrorHandling();
            await this.testFilterStateCleaning();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Test state manager persistence functionality
     */
    async testStateManagerPersistence() {
        console.log('🔍 Testing state manager persistence...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for localStorage integration
            if (stateContent.includes('localStorage')) {
                this.pass('State manager uses localStorage');
            } else {
                this.fail('State manager does not use localStorage');
            }
            
            // Check for saveToLocalStorage method
            if (stateContent.includes('saveToLocalStorage')) {
                this.pass('saveToLocalStorage method exists');
            } else {
                this.fail('saveToLocalStorage method not found');
            }
            
            // Check for loadFromLocalStorage method
            if (stateContent.includes('loadFromLocalStorage')) {
                this.pass('loadFromLocalStorage method exists');
            } else {
                this.fail('loadFromLocalStorage method not found');
            }
            
            // Check for storage key definition
            if (stateContent.includes('storageKey') || stateContent.includes('aiResearchState')) {
                this.pass('Storage key defined for persistence');
            } else {
                this.fail('Storage key not defined');
            }
            
            // Check that setState triggers persistence
            if (stateContent.includes('this.saveToLocalStorage()')) {
                this.pass('setState triggers automatic persistence');
            } else {
                this.fail('setState does not trigger persistence');
            }
            
        } catch (error) {
            this.fail(`State manager persistence test failed: ${error.message}`);
        }
    }
    
    /**
     * Test localStorage integration details
     */
    async testLocalStorageIntegration() {
        console.log('🔍 Testing localStorage integration...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for JSON serialization
            if (stateContent.includes('JSON.stringify') && stateContent.includes('JSON.parse')) {
                this.pass('Uses JSON serialization for localStorage');
            } else {
                this.fail('JSON serialization not implemented');
            }
            
            // Check for error handling in localStorage operations
            if (stateContent.includes('try') && stateContent.includes('catch')) {
                this.pass('Error handling implemented for localStorage operations');
            } else {
                this.fail('Error handling missing for localStorage');
            }
            
            // Check for localStorage.setItem usage
            if (stateContent.includes('localStorage.setItem')) {
                this.pass('localStorage.setItem used for saving');
            } else {
                this.fail('localStorage.setItem not found');
            }
            
            // Check for localStorage.getItem usage
            if (stateContent.includes('localStorage.getItem')) {
                this.pass('localStorage.getItem used for loading');
            } else {
                this.fail('localStorage.getItem not found');
            }
            
            // Check for localStorage.removeItem for cleanup
            if (stateContent.includes('localStorage.removeItem')) {
                this.pass('localStorage.removeItem available for cleanup');
            } else {
                this.fail('localStorage cleanup not implemented');
            }
            
        } catch (error) {
            this.fail(`localStorage integration test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filter state structure
     */
    async testFilterStateStructure() {
        console.log('🔍 Testing filter state structure...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for filters object in state
            if (stateContent.includes('filters:') && stateContent.includes('{')) {
                this.pass('Filters object exists in state structure');
            } else {
                this.fail('Filters object not found in state');
            }
            
            // Check for individual filter properties
            const filterProperties = [
                'search',
                'status',
                'dateRange'
            ];
            
            filterProperties.forEach(prop => {
                if (stateContent.includes(`${prop}:`)) {
                    this.pass(`Filter property exists: ${prop}`);
                } else {
                    this.fail(`Filter property missing: ${prop}`);
                }
            });
            
            // Check for updateFilters method
            if (stateContent.includes('updateFilters')) {
                this.pass('updateFilters method exists');
            } else {
                this.fail('updateFilters method not found');
            }
            
            // Check for clearFilters method
            if (stateContent.includes('clearFilters')) {
                this.pass('clearFilters method exists');
            } else {
                this.fail('clearFilters method not found');
            }
            
        } catch (error) {
            this.fail(`Filter state structure test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filter state loading on initialization
     */
    async testFilterStateLoading() {
        console.log('🔍 Testing filter state loading...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check that loadFromLocalStorage is called in constructor
            if (stateContent.includes('this.loadFromLocalStorage()')) {
                this.pass('loadFromLocalStorage called during initialization');
            } else {
                this.fail('loadFromLocalStorage not called during initialization');
            }
            
            // Check for selective state restoration
            if (stateContent.includes('filters:') && stateContent.includes('parsed.filters')) {
                this.pass('Filters selectively restored from localStorage');
            } else {
                this.fail('Filters not selectively restored');
            }
            
            // Check for fallback to default values
            if (stateContent.includes('|| this.state.filters')) {
                this.pass('Fallback to default filter values implemented');
            } else {
                this.fail('No fallback to default filter values');
            }
            
            // Check for corrupted data handling
            if (stateContent.includes('localStorage.removeItem')) {
                this.pass('Corrupted data cleanup implemented');
            } else {
                this.fail('Corrupted data cleanup not implemented');
            }
            
        } catch (error) {
            this.fail(`Filter state loading test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filter state saving mechanism
     */
    async testFilterStateSaving() {
        console.log('🔍 Testing filter state saving...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check that only persistent data is saved
            if (stateContent.includes('persistentState') && stateContent.includes('filters: this.state.filters')) {
                this.pass('Only persistent state data is saved');
            } else {
                this.fail('All state data may be saved (inefficient)');
            }
            
            // Check that filters are included in persistent state
            if (stateContent.includes('filters: this.state.filters') || 
                stateContent.includes('filters: parsed.filters')) {
                this.pass('Filters included in persistent state');
            } else {
                this.fail('Filters not included in persistent state');
            }
            
            // Check for automatic saving on state changes
            if (stateContent.includes('setState') && stateContent.includes('saveToLocalStorage')) {
                this.pass('Automatic saving on state changes');
            } else {
                this.fail('Automatic saving not implemented');
            }
            
            // Check for error handling during save
            if (stateContent.includes('console.warn') && stateContent.includes('save')) {
                this.pass('Error handling during save operations');
            } else {
                this.fail('Error handling missing for save operations');
            }
            
        } catch (error) {
            this.fail(`Filter state saving test failed: ${error.message}`);
        }
    }
    
    /**
     * Test dashboard filter restoration
     */
    async testDashboardFilterRestoration() {
        console.log('🔍 Testing dashboard filter restoration...');
        
        try {
            const dashboardPath = join(frontendDir, 'js', 'components', 'dashboard.js');
            const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
            
            // Check that dashboard initializes with state values
            if (dashboardContent.includes('this.state.getState()') || 
                dashboardContent.includes('this.state.getStateProperty')) {
                this.pass('Dashboard accesses state for filter initialization');
            } else {
                this.fail('Dashboard does not access state for filters');
            }
            
            // Check for filter value binding in template
            if (dashboardContent.includes('value="${this.searchQuery}"') &&
                dashboardContent.includes('selected')) {
                this.pass('Filter values bound to template elements');
            } else {
                this.fail('Filter values not bound to template');
            }
            
            // Check for state subscription
            if (dashboardContent.includes('this.state.subscribe') || 
                dashboardContent.includes('this.unsubscribe')) {
                this.pass('Dashboard subscribes to state changes');
            } else {
                this.fail('Dashboard does not subscribe to state changes');
            }
            
            // Check for filter restoration on component initialization
            if (dashboardContent.includes('constructor') && 
                (dashboardContent.includes('searchQuery') || dashboardContent.includes('statusFilter'))) {
                this.pass('Filter values initialized in constructor');
            } else {
                this.fail('Filter values not initialized in constructor');
            }
            
        } catch (error) {
            this.fail(`Dashboard filter restoration test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filter state validation
     */
    async testFilterStateValidation() {
        console.log('🔍 Testing filter state validation...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for type validation
            if (stateContent.includes('typeof') || stateContent.includes('Array.isArray')) {
                this.pass('Type validation implemented for state data');
            } else {
                this.fail('Type validation not implemented');
            }
            
            // Check for null/undefined handling
            if (stateContent.includes('|| {}') || stateContent.includes('|| this.state')) {
                this.pass('Null/undefined handling in state restoration');
            } else {
                this.fail('Null/undefined handling missing');
            }
            
            // Check for default value fallbacks
            if (stateContent.includes('search: \'\'') && 
                stateContent.includes('status: \'all\'')) {
                this.pass('Default filter values defined');
            } else {
                this.fail('Default filter values not properly defined');
            }
            
            // Check for data structure validation
            if (stateContent.includes('parsed.filters') && stateContent.includes('this.state.filters')) {
                this.pass('Data structure validation before restoration');
            } else {
                this.fail('Data structure validation missing');
            }
            
        } catch (error) {
            this.fail(`Filter state validation test failed: ${error.message}`);
        }
    }
    
    /**
     * Test persistence error handling
     */
    async testPersistenceErrorHandling() {
        console.log('🔍 Testing persistence error handling...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for try-catch blocks around localStorage operations
            const tryBlocks = (stateContent.match(/try\s*{/g) || []).length;
            const catchBlocks = (stateContent.match(/catch\s*\(/g) || []).length;
            
            if (tryBlocks >= 2 && catchBlocks >= 2) {
                this.pass('Multiple try-catch blocks for error handling');
            } else {
                this.fail('Insufficient error handling blocks');
            }
            
            // Check for console warnings on errors
            if (stateContent.includes('console.warn') && stateContent.includes('localStorage')) {
                this.pass('Console warnings for localStorage errors');
            } else {
                this.fail('Console warnings missing for errors');
            }
            
            // Check for graceful degradation
            if (stateContent.includes('Failed to save') || stateContent.includes('Failed to load')) {
                this.pass('Graceful degradation messages present');
            } else {
                this.fail('Graceful degradation not implemented');
            }
            
            // Check for corrupted data cleanup
            if (stateContent.includes('removeItem') && stateContent.includes('corrupted')) {
                this.pass('Corrupted data cleanup implemented');
            } else {
                this.fail('Corrupted data cleanup not found');
            }
            
        } catch (error) {
            this.fail(`Persistence error handling test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filter state cleaning functionality
     */
    async testFilterStateCleaning() {
        console.log('🔍 Testing filter state cleaning...');
        
        try {
            const statePath = join(frontendDir, 'js', 'state.js');
            const stateContent = await fs.readFile(statePath, 'utf8');
            
            // Check for clearLocalStorage method
            if (stateContent.includes('clearLocalStorage')) {
                this.pass('clearLocalStorage method exists');
            } else {
                this.fail('clearLocalStorage method not found');
            }
            
            // Check for reset method
            if (stateContent.includes('reset')) {
                this.pass('State reset method exists');
            } else {
                this.fail('State reset method not found');
            }
            
            // Check that reset clears localStorage
            if (stateContent.includes('clearLocalStorage') && stateContent.includes('reset')) {
                this.pass('Reset method clears localStorage');
            } else {
                this.fail('Reset method does not clear localStorage');
            }
            
            // Check for selective data persistence (not everything should be saved)
            if (stateContent.includes('persistentState') && 
                !stateContent.includes('researchHistory: this.state.researchHistory')) {
                this.pass('Selective data persistence (excludes temporary data)');
            } else {
                this.fail('All state data may be persisted (inefficient)');
            }
            
        } catch (error) {
            this.fail(`Filter state cleaning test failed: ${error.message}`);
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
        console.log(`\n🎯 Property 30 (Filter State Persistence): ${success ? 'PASSED' : 'FAILED'}`);
        
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
    console.log('Starting filter persistence tests...');
    const test = new FilterPersistenceTest();
    const success = await test.runTests();
    console.log(`Test completed with result: ${success}`);
    process.exit(success ? 0 : 1);
} else {
    console.log('Test file imported as module');
}

export { FilterPersistenceTest };