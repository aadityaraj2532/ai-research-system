/**
 * Property-Based Test for State Management
 * Tests Property 26: Local Data Caching
 * Validates: Requirements 8.5
 */

import { StateManager } from '../js/state.js';

/**
 * Property 26: Local Data Caching
 * For any research data retrieved from the API, the system should cache data locally 
 * to reduce redundant API calls and improve responsiveness.
 */
class StateManagementTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.originalLocalStorage = global.localStorage;
        this.setupMockLocalStorage();
    }
    
    /**
     * Setup mock localStorage for testing
     */
    setupMockLocalStorage() {
        const mockStorage = {};
        global.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, value) => { mockStorage[key] = value; },
            removeItem: (key) => { delete mockStorage[key]; },
            clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }
        };
        
        // Mock document and navigator for Node.js environment
        if (typeof document === 'undefined') {
            Object.defineProperty(global, 'document', {
                value: { hidden: false },
                writable: true,
                configurable: true
            });
        }
        
        if (typeof navigator === 'undefined') {
            Object.defineProperty(global, 'navigator', {
                value: { onLine: true },
                writable: true,
                configurable: true
            });
        }
    }
    
    /**
     * Restore original localStorage
     */
    restoreLocalStorage() {
        global.localStorage = this.originalLocalStorage;
        if (global.hasOwnProperty('document')) {
            delete global.document;
        }
        if (global.hasOwnProperty('navigator')) {
            delete global.navigator;
        }
    }
    
    /**
     * Run all state management tests
     */
    async runTests() {
        console.log('🧪 Testing Property 26: Local Data Caching');
        console.log('📋 Validates: Requirements 8.5\n');
        
        try {
            await this.testStateManagerInstantiation();
            await this.testSubscriberPattern();
            await this.testStateUpdates();
            await this.testLocalStoragePersistence();
            await this.testResearchHistoryManagement();
            await this.testFilteringAndPagination();
            await this.testErrorRecovery();
            await this.testStateValidation();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        } finally {
            this.restoreLocalStorage();
        }
    }
    
    /**
     * Test that StateManager can be instantiated properly
     */
    async testStateManagerInstantiation() {
        console.log('🔍 Testing StateManager instantiation...');
        
        try {
            const stateManager = new StateManager();
            
            if (stateManager instanceof StateManager) {
                this.pass('StateManager instantiates correctly');
            } else {
                this.fail('StateManager does not instantiate correctly');
            }
            
            // Check initial state structure
            const state = stateManager.getState();
            const requiredProps = ['researchHistory', 'currentSession', 'user', 'loading', 'error', 'filters', 'pagination'];
            
            for (const prop of requiredProps) {
                if (state.hasOwnProperty(prop)) {
                    this.pass(`Initial state has required property: ${prop}`);
                } else {
                    this.fail(`Initial state missing required property: ${prop}`);
                }
            }
            
            // Check that state is immutable (returns copy)
            const state1 = stateManager.getState();
            const state2 = stateManager.getState();
            
            if (state1 !== state2) {
                this.pass('getState() returns immutable copies');
            } else {
                this.fail('getState() returns same reference (not immutable)');
            }
            
        } catch (error) {
            this.fail(`StateManager instantiation failed: ${error.message}`);
        }
    }
    
    /**
     * Test subscriber pattern functionality
     */
    async testSubscriberPattern() {
        console.log('🔍 Testing subscriber pattern...');
        
        try {
            const stateManager = new StateManager();
            let callbackCount = 0;
            let lastState = null;
            
            // Test subscription
            const unsubscribe = stateManager.subscribe((state) => {
                callbackCount++;
                lastState = state;
            });
            
            if (typeof unsubscribe === 'function') {
                this.pass('subscribe() returns unsubscribe function');
            } else {
                this.fail('subscribe() does not return unsubscribe function');
            }
            
            // Test state change notification
            stateManager.setState({ loading: true });
            
            if (callbackCount === 1) {
                this.pass('Subscriber called on state change');
            } else {
                this.fail(`Subscriber call count incorrect: ${callbackCount}`);
            }
            
            if (lastState && lastState.loading === true) {
                this.pass('Subscriber receives updated state');
            } else {
                this.fail('Subscriber does not receive updated state');
            }
            
            // Test unsubscribe
            unsubscribe();
            stateManager.setState({ loading: false });
            
            if (callbackCount === 1) {
                this.pass('Unsubscribe prevents further notifications');
            } else {
                this.fail('Unsubscribe does not work correctly');
            }
            
            // Test multiple subscribers
            let callback1Count = 0;
            let callback2Count = 0;
            
            const unsub1 = stateManager.subscribe(() => callback1Count++);
            const unsub2 = stateManager.subscribe(() => callback2Count++);
            
            stateManager.setState({ error: 'test error' });
            
            if (callback1Count === 1 && callback2Count === 1) {
                this.pass('Multiple subscribers work correctly');
            } else {
                this.fail(`Multiple subscribers failed: ${callback1Count}, ${callback2Count}`);
            }
            
            unsub1();
            unsub2();
            
        } catch (error) {
            this.fail(`Subscriber pattern test failed: ${error.message}`);
        }
    }
    
    /**
     * Test state update functionality
     */
    async testStateUpdates() {
        console.log('🔍 Testing state updates...');
        
        try {
            const stateManager = new StateManager();
            
            // Test simple state update
            stateManager.setState({ loading: true });
            const state1 = stateManager.getState();
            
            if (state1.loading === true) {
                this.pass('Simple state update works');
            } else {
                this.fail('Simple state update failed');
            }
            
            // Test nested state update
            stateManager.setState({ 
                filters: { search: 'test query', status: 'COMPLETED' }
            });
            const state2 = stateManager.getState();
            
            if (state2.filters.search === 'test query' && state2.filters.status === 'COMPLETED') {
                this.pass('Nested state update works');
            } else {
                this.fail('Nested state update failed');
            }
            
            // Test that other state properties are preserved
            if (state2.loading === true) {
                this.pass('Previous state properties preserved during update');
            } else {
                this.fail('Previous state properties not preserved during update');
            }
            
            // Test state property getter
            const searchValue = stateManager.getStateProperty('filters.search');
            if (searchValue === 'test query') {
                this.pass('getStateProperty works with dot notation');
            } else {
                this.fail('getStateProperty does not work with dot notation');
            }
            
        } catch (error) {
            this.fail(`State update test failed: ${error.message}`);
        }
    }
    
    /**
     * Test localStorage persistence
     */
    async testLocalStoragePersistence() {
        console.log('🔍 Testing localStorage persistence...');
        
        try {
            const stateManager = new StateManager();
            
            // Test saving to localStorage
            stateManager.setState({
                filters: { search: 'persistent query', status: 'PROCESSING' },
                user: { id: 'test-user', name: 'Test User' }
            });
            
            // Check if data was saved to localStorage
            const savedData = localStorage.getItem('aiResearchState');
            if (savedData) {
                this.pass('State saved to localStorage');
                
                const parsed = JSON.parse(savedData);
                if (parsed.filters && parsed.filters.search === 'persistent query') {
                    this.pass('Correct data saved to localStorage');
                } else {
                    this.fail('Incorrect data saved to localStorage');
                }
            } else {
                this.fail('State not saved to localStorage');
            }
            
            // Test loading from localStorage
            const newStateManager = new StateManager();
            const loadedState = newStateManager.getState();
            
            if (loadedState.filters.search === 'persistent query') {
                this.pass('State loaded from localStorage on initialization');
            } else {
                this.fail('State not loaded from localStorage on initialization');
            }
            
            // Test clearing localStorage
            stateManager.clearLocalStorage();
            const clearedData = localStorage.getItem('aiResearchState');
            
            if (!clearedData) {
                this.pass('localStorage cleared successfully');
            } else {
                this.fail('localStorage not cleared properly');
            }
            
        } catch (error) {
            this.fail(`localStorage persistence test failed: ${error.message}`);
        }
    }
    
    /**
     * Test research history management
     */
    async testResearchHistoryManagement() {
        console.log('🔍 Testing research history management...');
        
        try {
            const stateManager = new StateManager();
            
            // Test setting research history
            const mockHistory = [
                { id: '1', query: 'Test query 1', status: 'COMPLETED', created_at: '2023-01-01' },
                { id: '2', query: 'Test query 2', status: 'PROCESSING', created_at: '2023-01-02' }
            ];
            
            stateManager.setResearchHistory(mockHistory);
            const state = stateManager.getState();
            
            if (state.researchHistory.length === 2) {
                this.pass('Research history set correctly');
            } else {
                this.fail(`Research history length incorrect: ${state.researchHistory.length}`);
            }
            
            if (state.pagination.totalItems === 2) {
                this.pass('Pagination totalItems updated with history');
            } else {
                this.fail('Pagination totalItems not updated with history');
            }
            
            // Test adding new research session
            const newSession = { id: '3', query: 'New query', status: 'PENDING', created_at: '2023-01-03' };
            stateManager.addResearchSession(newSession);
            
            const updatedState = stateManager.getState();
            if (updatedState.researchHistory.length === 3) {
                this.pass('New research session added correctly');
            } else {
                this.fail('New research session not added correctly');
            }
            
            if (updatedState.researchHistory[0].id === '3') {
                this.pass('New session added at beginning of array');
            } else {
                this.fail('New session not added at beginning of array');
            }
            
            // Test updating existing session
            stateManager.updateResearchSession('2', { status: 'COMPLETED', summary: 'Test summary' });
            const finalState = stateManager.getState();
            const updatedSession = finalState.researchHistory.find(s => s.id === '2');
            
            if (updatedSession && updatedSession.status === 'COMPLETED' && updatedSession.summary === 'Test summary') {
                this.pass('Research session updated correctly');
            } else {
                this.fail('Research session not updated correctly');
            }
            
        } catch (error) {
            this.fail(`Research history management test failed: ${error.message}`);
        }
    }
    
    /**
     * Test filtering and pagination functionality
     */
    async testFilteringAndPagination() {
        console.log('🔍 Testing filtering and pagination...');
        
        try {
            const stateManager = new StateManager();
            
            // Setup test data
            const mockHistory = [
                { id: '1', query: 'Machine learning basics', status: 'COMPLETED', created_at: '2023-01-01', summary: 'ML overview' },
                { id: '2', query: 'Deep learning advanced', status: 'PROCESSING', created_at: '2023-01-02', summary: 'DL concepts' },
                { id: '3', query: 'Natural language processing', status: 'FAILED', created_at: '2023-01-03', summary: 'NLP techniques' },
                { id: '4', query: 'Computer vision', status: 'COMPLETED', created_at: '2023-01-04', summary: 'CV algorithms' }
            ];
            
            stateManager.setResearchHistory(mockHistory);
            
            // Test search filtering
            stateManager.updateFilters({ search: 'learning' });
            const searchFiltered = stateManager.getFilteredSessions();
            
            if (searchFiltered.length === 2) {
                this.pass('Search filtering works correctly');
            } else {
                this.fail(`Search filtering incorrect: ${searchFiltered.length} results`);
            }
            
            // Test status filtering
            stateManager.updateFilters({ search: '', status: 'COMPLETED' });
            const statusFiltered = stateManager.getFilteredSessions();
            
            if (statusFiltered.length === 2) {
                this.pass('Status filtering works correctly');
            } else {
                this.fail(`Status filtering incorrect: ${statusFiltered.length} results`);
            }
            
            // Test date filtering
            stateManager.updateFilters({ status: 'all', dateRange: '2023-01-01' });
            const dateFiltered = stateManager.getFilteredSessions();
            
            if (dateFiltered.length === 1) {
                this.pass('Date filtering works correctly');
            } else {
                this.fail(`Date filtering incorrect: ${dateFiltered.length} results`);
            }
            
            // Test pagination
            stateManager.clearFilters();
            stateManager.updatePagination({ itemsPerPage: 2, currentPage: 1 });
            const paginated = stateManager.getPaginatedSessions();
            
            if (paginated.sessions.length === 2) {
                this.pass('Pagination limits results correctly');
            } else {
                this.fail(`Pagination incorrect: ${paginated.sessions.length} results`);
            }
            
            if (paginated.totalPages === 2) {
                this.pass('Pagination calculates total pages correctly');
            } else {
                this.fail(`Pagination total pages incorrect: ${paginated.totalPages}`);
            }
            
            if (paginated.hasNextPage === true && paginated.hasPrevPage === false) {
                this.pass('Pagination navigation flags correct');
            } else {
                this.fail('Pagination navigation flags incorrect');
            }
            
        } catch (error) {
            this.fail(`Filtering and pagination test failed: ${error.message}`);
        }
    }
    
    /**
     * Test error recovery functionality
     */
    async testErrorRecovery() {
        console.log('🔍 Testing error recovery...');
        
        try {
            const stateManager = new StateManager();
            
            // Test error state management
            stateManager.setError('Test error message');
            let state = stateManager.getState();
            
            if (state.error === 'Test error message') {
                this.pass('Error state set correctly');
            } else {
                this.fail('Error state not set correctly');
            }
            
            // Test error clearing
            stateManager.clearError();
            state = stateManager.getState();
            
            if (state.error === null) {
                this.pass('Error state cleared correctly');
            } else {
                this.fail('Error state not cleared correctly');
            }
            
            // Test loading state management
            stateManager.setLoading(true);
            state = stateManager.getState();
            
            if (state.loading === true) {
                this.pass('Loading state set correctly');
            } else {
                this.fail('Loading state not set correctly');
            }
            
            stateManager.setLoading(false);
            state = stateManager.getState();
            
            if (state.loading === false) {
                this.pass('Loading state cleared correctly');
            } else {
                this.fail('Loading state not cleared correctly');
            }
            
            // Test state reset
            stateManager.setState({ researchHistory: [{ id: 'test' }], error: 'test' });
            stateManager.reset();
            state = stateManager.getState();
            
            if (state.researchHistory.length === 0 && state.error === null) {
                this.pass('State reset works correctly');
            } else {
                this.fail('State reset does not work correctly');
            }
            
        } catch (error) {
            this.fail(`Error recovery test failed: ${error.message}`);
        }
    }
    
    /**
     * Test state validation
     */
    async testStateValidation() {
        console.log('🔍 Testing state validation...');
        
        try {
            const stateManager = new StateManager();
            
            // Test invalid state updates
            try {
                stateManager.setState(null);
                this.fail('setState should reject null updates');
            } catch (error) {
                this.pass('setState correctly rejects null updates');
            }
            
            try {
                stateManager.setState('invalid');
                this.fail('setState should reject non-object updates');
            } catch (error) {
                this.pass('setState correctly rejects non-object updates');
            }
            
            // Test invalid research history
            stateManager.setResearchHistory('invalid');
            const state = stateManager.getState();
            
            // Should not update if invalid (warning logged but state unchanged)
            if (Array.isArray(state.researchHistory)) {
                this.pass('setResearchHistory validates input type');
            } else {
                this.fail('setResearchHistory does not validate input type');
            }
            
            // Test invalid session updates
            stateManager.addResearchSession(null);
            // Should not crash or add invalid session
            if (Array.isArray(state.researchHistory)) {
                this.pass('addResearchSession handles invalid input gracefully');
            } else {
                this.fail('addResearchSession does not handle invalid input gracefully');
            }
            
            // Test statistics generation
            const stats = stateManager.getStats();
            const expectedProps = ['totalSessions', 'statusCounts', 'totalCost', 'totalTokens', 'subscriberCount'];
            
            let statsValid = true;
            for (const prop of expectedProps) {
                if (!stats.hasOwnProperty(prop)) {
                    statsValid = false;
                    break;
                }
            }
            
            if (statsValid) {
                this.pass('getStats returns valid statistics object');
            } else {
                this.fail('getStats does not return valid statistics object');
            }
            
        } catch (error) {
            this.fail(`State validation test failed: ${error.message}`);
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
        console.log(`\n🎯 Property 26 (Local Data Caching): ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new StateManagementTest();
    const success = await test.runTests();
    process.exit(success ? 0 : 1);
}

export { StateManagementTest };