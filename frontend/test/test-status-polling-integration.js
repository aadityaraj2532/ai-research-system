/**
 * Status Polling Integration Tests
 * Tests the integration of StatusPoller with components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatusPoller } from '../js/status-poller.js';
import { SessionViewer } from '../js/components/session-viewer.js';
import { ResearchDashboard } from '../js/components/dashboard.js';

describe('Status Polling Integration', () => {
    let mockApi, mockNotifications, mockState, mockContainer;
    let statusPoller, sessionViewer, dashboard;

    beforeEach(() => {
        // Mock dependencies
        mockApi = {
            getResearchDetails: vi.fn(),
            getResearchHistory: vi.fn()
        };
        
        mockNotifications = {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showWarning: vi.fn(),
            showInfo: vi.fn()
        };
        
        mockState = {
            subscribe: vi.fn(() => () => {}),
            getState: vi.fn(() => ({ researchHistory: [] })),
            setResearchHistory: vi.fn(),
            getFilteredSessions: vi.fn(() => [])
        };
        
        mockContainer = {
            innerHTML: '',
            addEventListener: vi.fn(),
            querySelector: vi.fn(),
            querySelectorAll: vi.fn(() => [])
        };
        
        // Mock DOM methods
        global.document = {
            getElementById: vi.fn(() => mockContainer),
            querySelector: vi.fn(),
            querySelectorAll: vi.fn(() => []),
            addEventListener: vi.fn(),
            hidden: false
        };
        
        global.window = {
            addEventListener: vi.fn(),
            location: { hash: '#test' }
        };
        
        global.setInterval = vi.fn();
        global.clearInterval = vi.fn();
        global.setTimeout = vi.fn();
        global.clearTimeout = vi.fn();
        
        // Create instances
        statusPoller = new StatusPoller(mockApi, mockNotifications);
        sessionViewer = new SessionViewer(mockContainer, mockState, mockApi, mockNotifications, statusPoller);
        dashboard = new ResearchDashboard(mockContainer, mockState, mockApi, mockNotifications, statusPoller);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('StatusPoller Integration', () => {
        it('should initialize StatusPoller correctly', () => {
            expect(statusPoller).toBeDefined();
            expect(statusPoller.api).toBe(mockApi);
            expect(statusPoller.notifications).toBe(mockNotifications);
            expect(statusPoller.activeSessions).toBeInstanceOf(Map);
            expect(statusPoller.pollingTimers).toBeInstanceOf(Map);
        });

        it('should start polling for active session', () => {
            const sessionId = 'test-session-123';
            const callback = vi.fn();
            
            statusPoller.startPolling(sessionId, callback);
            
            expect(statusPoller.activeSessions.has(sessionId)).toBe(true);
            expect(statusPoller.statusCallbacks.has(sessionId)).toBe(true);
            expect(global.setInterval).toHaveBeenCalled();
        });

        it('should stop polling for session', () => {
            const sessionId = 'test-session-123';
            const callback = vi.fn();
            
            statusPoller.startPolling(sessionId, callback);
            statusPoller.stopPolling(sessionId);
            
            expect(statusPoller.activeSessions.has(sessionId)).toBe(false);
            expect(statusPoller.statusCallbacks.has(sessionId)).toBe(false);
            expect(global.clearInterval).toHaveBeenCalled();
        });

        it('should handle polling errors with retry logic', async () => {
            const sessionId = 'test-session-123';
            const callback = vi.fn();
            const error = new Error('Network error');
            
            mockApi.getResearchDetails.mockRejectedValue(error);
            
            statusPoller.startPolling(sessionId, callback, { maxRetries: 1 });
            
            // Simulate polling attempt
            await statusPoller.pollSession(sessionId);
            
            expect(statusPoller.retryCount.get(sessionId)).toBe(1);
            expect(global.setTimeout).toHaveBeenCalled();
        });
    });

    describe('SessionViewer Integration', () => {
        it('should accept StatusPoller in constructor', () => {
            expect(sessionViewer.statusPoller).toBe(statusPoller);
        });

        it('should start polling for active session on render', async () => {
            const sessionId = 'test-session-123';
            const mockSession = {
                id: sessionId,
                status: 'PROCESSING',
                query: 'Test query',
                created_at: new Date().toISOString()
            };
            
            mockApi.getResearchDetails.mockResolvedValue(mockSession);
            vi.spyOn(statusPoller, 'startPolling');
            
            await sessionViewer.render(sessionId);
            
            expect(statusPoller.startPolling).toHaveBeenCalledWith(
                sessionId,
                sessionViewer.handleStatusUpdate,
                expect.objectContaining({
                    interval: 3000,
                    onlyActiveStates: true
                })
            );
        });

        it('should not start polling for completed session', async () => {
            const sessionId = 'test-session-123';
            const mockSession = {
                id: sessionId,
                status: 'COMPLETED',
                query: 'Test query',
                created_at: new Date().toISOString()
            };
            
            mockApi.getResearchDetails.mockResolvedValue(mockSession);
            vi.spyOn(statusPoller, 'startPolling');
            
            await sessionViewer.render(sessionId);
            
            expect(statusPoller.startPolling).not.toHaveBeenCalled();
        });

        it('should stop polling when component is destroyed', () => {
            vi.spyOn(statusPoller, 'stopPolling');
            sessionViewer.currentSession = { id: 'test-session-123' };
            
            sessionViewer.destroy();
            
            expect(statusPoller.stopPolling).toHaveBeenCalledWith('test-session-123');
        });
    });

    describe('Dashboard Integration', () => {
        it('should accept StatusPoller in constructor', () => {
            expect(dashboard.statusPoller).toBe(statusPoller);
            expect(dashboard.activePolling).toBeInstanceOf(Set);
        });

        it('should start polling for active sessions on load', async () => {
            const mockSessions = [
                { id: 'session-1', status: 'PROCESSING', query: 'Test 1' },
                { id: 'session-2', status: 'COMPLETED', query: 'Test 2' },
                { id: 'session-3', status: 'PENDING', query: 'Test 3' }
            ];
            
            mockApi.getResearchHistory.mockResolvedValue(mockSessions);
            vi.spyOn(statusPoller, 'startPolling');
            
            await dashboard.loadResearchSessions();
            
            // Should start polling for PROCESSING and PENDING sessions only
            expect(statusPoller.startPolling).toHaveBeenCalledTimes(2);
            expect(statusPoller.startPolling).toHaveBeenCalledWith(
                'session-1',
                expect.any(Function),
                expect.objectContaining({ interval: 10000 })
            );
            expect(statusPoller.startPolling).toHaveBeenCalledWith(
                'session-3',
                expect.any(Function),
                expect.objectContaining({ interval: 10000 })
            );
        });

        it('should stop all polling when component is destroyed', () => {
            dashboard.activePolling.add('session-1');
            dashboard.activePolling.add('session-2');
            vi.spyOn(statusPoller, 'stopPolling');
            
            dashboard.destroy();
            
            expect(statusPoller.stopPolling).toHaveBeenCalledWith('session-1');
            expect(statusPoller.stopPolling).toHaveBeenCalledWith('session-2');
            expect(dashboard.activePolling.size).toBe(0);
        });

        it('should update session data when status changes', () => {
            const sessionId = 'test-session-123';
            const updatedSession = {
                id: sessionId,
                status: 'COMPLETED',
                query: 'Test query'
            };
            
            const currentSessions = [
                { id: sessionId, status: 'PROCESSING', query: 'Test query' }
            ];
            
            mockState.getState.mockReturnValue({ researchHistory: currentSessions });
            
            dashboard.handleMultiSessionStatusUpdate(sessionId, updatedSession, false);
            
            expect(mockState.setResearchHistory).toHaveBeenCalledWith([updatedSession]);
        });
    });

    describe('Status Update Handling', () => {
        it('should handle session status updates correctly', () => {
            const sessionId = 'test-session-123';
            const updatedSession = {
                id: sessionId,
                status: 'COMPLETED',
                query: 'Test query'
            };
            
            sessionViewer.currentSession = { id: sessionId, status: 'PROCESSING' };
            vi.spyOn(sessionViewer, 'renderSession');
            vi.spyOn(sessionViewer, 'showStatusChangeNotification');
            
            sessionViewer.handleStatusUpdate(updatedSession, false);
            
            expect(sessionViewer.currentSession).toBe(updatedSession);
            expect(sessionViewer.renderSession).toHaveBeenCalledWith(updatedSession);
            expect(sessionViewer.showStatusChangeNotification).toHaveBeenCalledWith('PROCESSING', 'COMPLETED');
        });

        it('should show appropriate notifications for status changes', () => {
            sessionViewer.showStatusChangeNotification('PROCESSING', 'COMPLETED');
            expect(mockNotifications.showSuccess).toHaveBeenCalledWith('Research completed successfully!');
            
            sessionViewer.showStatusChangeNotification('PROCESSING', 'FAILED');
            expect(mockNotifications.showError).toHaveBeenCalledWith('Research failed. Check the details below.');
            
            sessionViewer.showStatusChangeNotification('PENDING', 'PROCESSING');
            expect(mockNotifications.showInfo).toHaveBeenCalledWith('Research processing has started...');
        });
    });

    describe('Polling State Management', () => {
        it('should track active polling sessions correctly', () => {
            expect(statusPoller.getActiveSessions()).toEqual([]);
            
            statusPoller.startPolling('session-1', vi.fn());
            statusPoller.startPolling('session-2', vi.fn());
            
            expect(statusPoller.getActiveSessions()).toEqual(['session-1', 'session-2']);
            
            statusPoller.stopPolling('session-1');
            expect(statusPoller.getActiveSessions()).toEqual(['session-2']);
        });

        it('should provide polling status information', () => {
            const sessionId = 'test-session-123';
            
            expect(statusPoller.getPollingStatus(sessionId)).toBeNull();
            
            statusPoller.startPolling(sessionId, vi.fn());
            const status = statusPoller.getPollingStatus(sessionId);
            
            expect(status).toEqual({
                isPolling: true,
                config: expect.any(Object),
                retryCount: 0,
                timerId: expect.any(Number)
            });
        });
    });
});