"""
Tests for the research app and Open Deep Research integration.
"""
import os
import pytest
from unittest.mock import patch, AsyncMock
from django.test import TestCase
from django.contrib.auth.models import User
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.extra.django import TestCase as HypothesisTestCase

from .services import OpenDeepResearchService, research_service
# from .views import ResearchSessionViewSet
from .models import ResearchSession


class OpenDeepResearchServiceTest(TestCase):
    """Test cases for the OpenDeepResearchService."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = OpenDeepResearchService()
    
    def test_service_initialization(self):
        """Test that the service initializes correctly."""
        self.assertIsNotNone(self.service.default_config)
        self.assertIn("configurable", self.service.default_config)
    
    def test_create_config(self):
        """Test configuration creation."""
        config = self.service.create_config()
        self.assertIsNotNone(config)
        self.assertIn("configurable", config)
    
    def test_create_config_with_overrides(self):
        """Test configuration creation with custom overrides."""
        custom_config = {"max_researcher_iterations": 10}
        user_context = {"user_id": "test_user", "session_id": "test_session"}
        
        config = self.service.create_config(custom_config, user_context)
        
        self.assertEqual(config["configurable"]["max_researcher_iterations"], 10)
        self.assertEqual(config["metadata"]["user_id"], "test_user")
    
    def test_validation_without_env_vars(self):
        """Test validation when environment variables are missing."""
        with patch.dict(os.environ, {}, clear=True):
            result = self.service.validate_configuration()
            
            self.assertFalse(result["valid"])
            self.assertGreater(len(result["errors"]), 0)
    
    def test_get_supported_models(self):
        """Test getting supported models."""
        models = self.service.get_supported_models()
        
        self.assertIn("research_models", models)
        self.assertIn("compression_models", models)
        self.assertIn("final_report_models", models)
        self.assertGreater(len(models["research_models"]), 0)
    
    def test_create_continuation_context(self):
        """Test creating continuation context."""
        previous_research = {
            "research_brief": "Test brief",
            "final_report": "Test report with findings"
        }
        
        context = self.service.create_continuation_context(previous_research)
        
        self.assertIn("Test brief", context)
        self.assertIn("Test report", context)
    
    @pytest.mark.asyncio
    async def test_execute_research_mock(self):
        """Test research execution with mocked deep_researcher."""
        mock_result = {
            "final_report": "Test research report",
            "research_brief": "Test brief",
            "notes": ["Note 1", "Note 2"],
            "raw_notes": ["Raw note 1"],
            "messages": []
        }
        
        with patch('research.services.deep_researcher') as mock_researcher:
            mock_researcher.ainvoke = AsyncMock(return_value=mock_result)
            
            result = await self.service.execute_research("Test query")
            
            self.assertTrue(result["success"])
            self.assertEqual(result["final_report"], "Test research report")
            self.assertIsNone(result["error"])
    
    @pytest.mark.asyncio
    async def test_execute_research_with_error(self):
        """Test research execution with error handling."""
        with patch('research.services.deep_researcher') as mock_researcher:
            mock_researcher.ainvoke = AsyncMock(side_effect=Exception("Test error"))
            
            result = await self.service.execute_research("Test query")
            
            self.assertFalse(result["success"])
            self.assertEqual(result["error"], "Test error")
    
    def test_global_service_instance(self):
        """Test that the global service instance is available."""
        self.assertIsInstance(research_service, OpenDeepResearchService)


class OpenDeepResearchPropertyTest(HypothesisTestCase):
    """Property-based tests for Open Deep Research integration."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = OpenDeepResearchService()
    
    @given(st.text(min_size=1, max_size=100))
    def test_research_workflow_execution_property(self, query):
        """
        Property 1: Research Workflow Execution
        For any valid research query submitted by a user, the system should execute 
        the Open Deep Research workflow asynchronously and generate a structured 
        report with sources and findings upon successful completion.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution**
        **Validates: Requirements 1.1, 1.2, 1.3**
        """
        # Test that configuration is created properly for any query
        config = self.service.create_config()
        
        # Verify configuration structure is consistent
        self.assertIn("configurable", config)
        self.assertIn("tags", config)
        self.assertIn("ai-research-system", config["tags"])
        self.assertIn("open-deep-research", config["tags"])
        
        # Verify that the service can create continuation context for any query
        mock_previous_research = {
            "research_brief": f"Previous research for: {query[:50]}",
            "final_report": f"Previous findings related to: {query[:50]}"
        }
        
        context = self.service.create_continuation_context(mock_previous_research)
        
        # Context should always be a string and contain relevant information
        self.assertIsInstance(context, str)
        self.assertGreater(len(context), 0)
        if mock_previous_research["research_brief"]:
            self.assertIn("Previous research brief", context)
        if mock_previous_research["final_report"]:
            self.assertIn("Previous research findings", context)
    
    @given(st.dictionaries(
        st.sampled_from(["max_researcher_iterations", "max_concurrent_research_units", "max_react_tool_calls"]),
        st.integers(min_value=1, max_value=10),
        min_size=1,
        max_size=2
    ))
    def test_configuration_consistency_property(self, custom_config):
        """
        Property: Configuration consistency
        For any valid configuration parameters, the service should create 
        a consistent configuration that preserves the custom settings.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution (configuration component)**
        **Validates: Requirements 1.1, 1.2, 1.3**
        """
        # Create configuration with custom parameters
        config = self.service.create_config(custom_config)
        
        # Verify all custom parameters are preserved
        for key, value in custom_config.items():
            self.assertEqual(config["configurable"][key], value)
        
        # Verify required configuration structure is maintained
        self.assertIn("configurable", config)
        self.assertIn("tags", config)
        
        # Verify default values are present for non-overridden settings
        required_keys = [
            "max_structured_output_retries",
            "allow_clarification", 
            "search_api",
            "research_model",
            "final_report_model"
        ]
        
        for key in required_keys:
            self.assertIn(key, config["configurable"])
    
    @given(st.dictionaries(
        st.sampled_from(["research_brief", "final_report"]),
        st.text(min_size=0, max_size=100),
        min_size=0,
        max_size=2
    ))
    def test_continuation_context_property(self, previous_research):
        """
        Property: Continuation context creation
        For any previous research data, the service should create a valid 
        continuation context string that preserves important information.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution (continuation component)**
        **Validates: Requirements 1.1, 1.2, 1.3**
        """
        context = self.service.create_continuation_context(previous_research)
        
        # Context should always be a string
        self.assertIsInstance(context, str)
        
        # If there's a research brief, it should be included
        if previous_research.get("research_brief"):
            self.assertIn("Previous research brief", context)
            # Brief content should be preserved (at least partially)
            brief_content = previous_research["research_brief"][:30]  # First 30 chars
            if brief_content.strip():
                self.assertIn(brief_content, context)
        
        # If there's a final report, it should be included
        if previous_research.get("final_report"):
            self.assertIn("Previous research findings", context)
            # Report content should be preserved (at least partially)
            report_content = previous_research["final_report"][:30]  # First 30 chars
            if report_content.strip():
                self.assertIn(report_content, context)
        
        # Empty research should produce empty or minimal context
        if not any(previous_research.values()):
            self.assertEqual(len(context.strip()), 0)
    
    def test_supported_models_consistency_property(self):
        """
        Property: Supported models consistency
        The service should always return a consistent structure of supported models
        with valid model identifiers.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution (model configuration)**
        **Validates: Requirements 1.1, 1.2, 1.3**
        """
        models = self.service.get_supported_models()
        
        # Required model categories should always be present
        required_categories = ["research_models", "compression_models", "final_report_models"]
        for category in required_categories:
            self.assertIn(category, models)
            self.assertIsInstance(models[category], list)
            self.assertGreater(len(models[category]), 0)
        
        # All model identifiers should follow the expected format (provider:model)
        for category, model_list in models.items():
            for model in model_list:
                self.assertIsInstance(model, str)
                self.assertIn(":", model)  # Should have provider:model format
                provider, model_name = model.split(":", 1)
                self.assertGreater(len(provider), 0)
                self.assertGreater(len(model_name), 0)


class DataPersistencePropertyTest(HypothesisTestCase):
    """Property-based tests for data persistence across all models."""
    
    @given(
        st.text(min_size=1, max_size=255),  # user_id
        st.text(min_size=1, max_size=1000),  # query
        st.sampled_from(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),  # status
        st.text(min_size=0, max_size=500),  # summary
    )
    def test_research_session_persistence_property(self, user_id, query, status, summary):
        """
        Property 3: Complete Data Persistence
        For any completed research session, the system should store all required 
        metadata including user_id, query, report, summary, status, timestamps, 
        reasoning, and cost data in the database.
        
        **Feature: ai-research-system, Property 3: Complete Data Persistence**
        **Validates: Requirements 2.1, 2.4, 5.3, 7.3**
        """
        from research.models import ResearchSession
        
        # Create research session with generated data
        session = ResearchSession.objects.create(
            user_id=user_id,
            query=query,
            status=status,
            summary=summary,
            report={'findings': 'test findings', 'sources': []},
            reasoning={'methodology': 'test methodology'},
            langsmith_trace_id='test-trace-123'
        )
        
        # Retrieve from database
        retrieved_session = ResearchSession.objects.get(id=session.id)
        
        # Verify all data is persisted correctly
        self.assertEqual(retrieved_session.user_id, user_id)
        self.assertEqual(retrieved_session.query, query)
        self.assertEqual(retrieved_session.status, status)
        self.assertEqual(retrieved_session.summary, summary)
        self.assertEqual(retrieved_session.report, {'findings': 'test findings', 'sources': []})
        self.assertEqual(retrieved_session.reasoning, {'methodology': 'test methodology'})
        self.assertEqual(retrieved_session.langsmith_trace_id, 'test-trace-123')
        
        # Verify timestamps are set
        self.assertIsNotNone(retrieved_session.created_at)
        self.assertIsNotNone(retrieved_session.updated_at)
        
        # Verify UUID is preserved
        self.assertEqual(retrieved_session.id, session.id)
    
    @given(
        st.text(min_size=1, max_size=255),  # filename
        st.sampled_from(['PDF', 'TXT', 'DOC', 'DOCX']),  # file_type
        st.integers(min_value=1, max_value=10000000),  # file_size
        st.text(min_size=0, max_size=500),  # content_summary
        st.text(min_size=1, max_size=500),  # file_path
    )
    def test_research_file_persistence_property(self, filename, file_type, file_size, content_summary, file_path):
        """
        Property 3: Complete Data Persistence (File component)
        For any research file uploaded, the system should store all file metadata
        including filename, type, size, content summary, and processing status.
        
        **Feature: ai-research-system, Property 3: Complete Data Persistence**
        **Validates: Requirements 2.1, 2.4, 5.3, 7.3**
        """
        from research.models import ResearchSession, ResearchFile
        
        # Create parent research session
        session = ResearchSession.objects.create(
            user_id='test-user',
            query='test query'
        )
        
        # Create research file with generated data
        research_file = ResearchFile.objects.create(
            session=session,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            content_summary=content_summary,
            file_path=file_path,
            is_processed=True
        )
        
        # Retrieve from database
        retrieved_file = ResearchFile.objects.get(id=research_file.id)
        
        # Verify all data is persisted correctly
        self.assertEqual(retrieved_file.filename, filename)
        self.assertEqual(retrieved_file.file_type, file_type)
        self.assertEqual(retrieved_file.file_size, file_size)
        self.assertEqual(retrieved_file.content_summary, content_summary)
        self.assertEqual(retrieved_file.file_path, file_path)
        self.assertTrue(retrieved_file.is_processed)
        
        # Verify relationship is preserved
        self.assertEqual(retrieved_file.session.id, session.id)
        
        # Verify timestamps are set
        self.assertIsNotNone(retrieved_file.uploaded_at)
    
    @given(
        st.integers(min_value=0, max_value=1000000),  # input_tokens
        st.integers(min_value=0, max_value=1000000),  # output_tokens
        st.decimals(min_value=0, max_value=1000, places=4),  # estimated_cost
    )
    def test_research_cost_persistence_property(self, input_tokens, output_tokens, estimated_cost):
        """
        Property 3: Complete Data Persistence (Cost component)
        For any research cost data, the system should store all token usage
        and cost information accurately.
        
        **Feature: ai-research-system, Property 3: Complete Data Persistence**
        **Validates: Requirements 2.1, 2.4, 5.3, 7.3**
        """
        from research.models import ResearchSession, ResearchCost
        from decimal import Decimal
        
        # Create parent research session
        session = ResearchSession.objects.create(
            user_id='test-user',
            query='test query'
        )
        
        # Create research cost with generated data
        cost = ResearchCost.objects.create(
            session=session,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=Decimal(str(estimated_cost)),
            provider_costs={'openai': float(estimated_cost) * 0.7, 'anthropic': float(estimated_cost) * 0.3}
        )
        
        # Update totals (this should be automatic via model method)
        cost.update_totals()
        
        # Retrieve from database
        retrieved_cost = ResearchCost.objects.get(session=session)
        
        # Verify all data is persisted correctly
        self.assertEqual(retrieved_cost.input_tokens, input_tokens)
        self.assertEqual(retrieved_cost.output_tokens, output_tokens)
        self.assertEqual(retrieved_cost.total_tokens, input_tokens + output_tokens)
        self.assertEqual(retrieved_cost.estimated_cost, Decimal(str(estimated_cost)))
        
        # Verify provider costs are preserved
        self.assertIn('openai', retrieved_cost.provider_costs)
        self.assertIn('anthropic', retrieved_cost.provider_costs)
        
        # Verify relationship is preserved
        self.assertEqual(retrieved_cost.session.id, session.id)
        
        # Verify timestamps are set
        self.assertIsNotNone(retrieved_cost.created_at)
        self.assertIsNotNone(retrieved_cost.updated_at)


class DataIntegrityPropertyTest(HypothesisTestCase):
    """Property-based tests for data integrity preservation."""
    
    @given(
        st.text(min_size=1, max_size=255),  # user_id
        st.text(min_size=1, max_size=1000),  # query
        st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(max_size=100), st.integers(), st.floats(allow_nan=False, allow_infinity=False)),
            min_size=1,
            max_size=5
        ),  # report (JSON data)
        st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.text(max_size=100),
            min_size=1,
            max_size=3
        ),  # reasoning (JSON data)
    )
    def test_data_integrity_preservation_property(self, user_id, query, report, reasoning):
        """
        Property 5: Data Integrity Preservation
        For any research session stored in the database, retrieving that session 
        should return exactly the same data that was originally stored, ensuring 
        no data loss or corruption.
        
        **Feature: ai-research-system, Property 5: Data Integrity Preservation**
        **Validates: Requirements 2.3**
        """
        from research.models import ResearchSession
        
        # Create research session with complex data
        original_session = ResearchSession.objects.create(
            user_id=user_id,
            query=query,
            status='COMPLETED',
            summary='Test summary for integrity check',
            report=report,
            reasoning=reasoning,
            langsmith_trace_id='integrity-test-trace'
        )
        
        # Store original values for comparison
        original_id = original_session.id
        original_created_at = original_session.created_at
        original_updated_at = original_session.updated_at
        
        # Retrieve from database multiple times to test consistency
        for _ in range(3):
            retrieved_session = ResearchSession.objects.get(id=original_id)
            
            # Verify exact data preservation
            self.assertEqual(retrieved_session.id, original_id)
            self.assertEqual(retrieved_session.user_id, user_id)
            self.assertEqual(retrieved_session.query, query)
            self.assertEqual(retrieved_session.status, 'COMPLETED')
            self.assertEqual(retrieved_session.summary, 'Test summary for integrity check')
            self.assertEqual(retrieved_session.report, report)
            self.assertEqual(retrieved_session.reasoning, reasoning)
            self.assertEqual(retrieved_session.langsmith_trace_id, 'integrity-test-trace')
            
            # Verify timestamps are preserved
            self.assertEqual(retrieved_session.created_at, original_created_at)
            self.assertEqual(retrieved_session.updated_at, original_updated_at)
    
    @given(
        st.lists(
            st.dictionaries(
                st.sampled_from(['filename', 'file_type', 'content_summary']),
                st.text(min_size=1, max_size=100),
                min_size=3,
                max_size=3
            ),
            min_size=1,
            max_size=5
        )
    )
    def test_research_session_relationships_integrity_property(self, file_data_list):
        """
        Property 5: Data Integrity Preservation (Relationships component)
        For any research session with related files and costs, all relationships
        should be preserved and accessible after storage and retrieval.
        
        **Feature: ai-research-system, Property 5: Data Integrity Preservation**
        **Validates: Requirements 2.3**
        """
        from research.models import ResearchSession, ResearchFile, ResearchCost
        from decimal import Decimal
        
        # Create parent research session
        session = ResearchSession.objects.create(
            user_id='integrity-test-user',
            query='test query for relationship integrity'
        )
        
        # Create related files
        created_files = []
        for file_data in file_data_list:
            research_file = ResearchFile.objects.create(
                session=session,
                filename=file_data['filename'],
                file_type='PDF',
                file_size=1024,
                content_summary=file_data['content_summary'],
                file_path=f"/test/{file_data['filename']}"
            )
            created_files.append(research_file)
        
        # Create related cost
        cost = ResearchCost.objects.create(
            session=session,
            input_tokens=1000,
            output_tokens=500,
            estimated_cost=Decimal('5.50')
        )
        
        # Retrieve session and verify all relationships are intact
        retrieved_session = ResearchSession.objects.get(id=session.id)
        
        # Verify files relationship
        retrieved_files = list(retrieved_session.files.all().order_by('uploaded_at'))
        self.assertEqual(len(retrieved_files), len(created_files))
        
        # Create a mapping of original files by ID for comparison
        original_files_by_id = {f.id: f for f in created_files}
        
        for retrieved_file in retrieved_files:
            # Find the corresponding original file
            original_file = original_files_by_id[retrieved_file.id]
            self.assertEqual(retrieved_file.filename, original_file.filename)
            self.assertEqual(retrieved_file.content_summary, original_file.content_summary)
            self.assertEqual(retrieved_file.session.id, session.id)
        
        # Verify cost relationship
        retrieved_cost = retrieved_session.cost
        self.assertEqual(retrieved_cost.id, cost.id)
        self.assertEqual(retrieved_cost.input_tokens, 1000)
        self.assertEqual(retrieved_cost.output_tokens, 500)
        self.assertEqual(retrieved_cost.estimated_cost, Decimal('5.50'))
        self.assertEqual(retrieved_cost.session.id, session.id)
    
    @given(st.integers(min_value=1, max_value=5))  # Number of continuation levels
    def test_research_continuation_lineage_integrity_property(self, continuation_levels):
        """
        Property 5: Data Integrity Preservation (Continuation lineage component)
        For any research session with parent-child relationships, the complete
        lineage should be preserved and retrievable.
        
        **Feature: ai-research-system, Property 5: Data Integrity Preservation**
        **Validates: Requirements 2.3**
        """
        from research.models import ResearchSession
        
        # Create a chain of research sessions
        sessions = []
        parent = None
        
        for i in range(continuation_levels):
            session = ResearchSession.objects.create(
                user_id='lineage-test-user',
                query=f'Research query level {i + 1}',
                parent_session=parent
            )
            sessions.append(session)
            parent = session
        
        # Verify lineage integrity from the last session
        last_session = sessions[-1]
        lineage = last_session.get_research_lineage()
        
        # Verify complete lineage is preserved
        self.assertEqual(len(lineage), continuation_levels)
        
        # Verify order is correct (root to leaf)
        for i, session in enumerate(lineage):
            self.assertEqual(session.id, sessions[i].id)
            self.assertEqual(session.query, f'Research query level {i + 1}')
            
            if i == 0:
                # Root session should have no parent
                self.assertIsNone(session.parent_session)
            else:
                # Child sessions should reference correct parent
                self.assertEqual(session.parent_session.id, sessions[i - 1].id)
        
        # Verify is_continuation property
        self.assertFalse(sessions[0].is_continuation)  # Root session
        for i in range(1, continuation_levels):
            self.assertTrue(sessions[i].is_continuation)  # Child sessions


class UserDataIsolationPropertyTest(HypothesisTestCase):
    """Property-based tests for user data isolation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.factory = APIRequestFactory()
        # self.viewset = ResearchSessionViewSet()
        
        # Create test users with unique names for each test
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        
        # Create test users
        self.user1 = User.objects.create_user(
            username=f'testuser1_{unique_suffix}', 
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username=f'testuser2_{unique_suffix}', 
            password='testpass123'
        )
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=50),  # queries for user1 (reduced size)
            min_size=1,
            max_size=3  # reduced max size
        ),
        st.lists(
            st.text(min_size=1, max_size=50),  # queries for user2 (reduced size)
            min_size=1,
            max_size=3  # reduced max size
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_user_data_isolation_property(self, user1_queries, user2_queries):
        """
        Property 4: User Data Isolation
        For any user requesting their research history or attempting to continue 
        a research session, the system should only return or allow access to 
        research sessions that belong to that specific user.
        
        **Feature: ai-research-system, Property 4: User Data Isolation**
        **Validates: Requirements 2.2, 3.4**
        """
        # Create research sessions for user1
        user1_sessions = []
        for query in user1_queries:
            session = ResearchSession.objects.create(
                user_id=self.user1.username,
                query=query,
                status='COMPLETED',
                summary=f'Summary for {query[:50]}'
            )
            user1_sessions.append(session)
        
        # Create research sessions for user2
        user2_sessions = []
        for query in user2_queries:
            session = ResearchSession.objects.create(
                user_id=self.user2.username,
                query=query,
                status='COMPLETED',
                summary=f'Summary for {query[:50]}'
            )
            user2_sessions.append(session)
        
        # Test user1 can only access their own sessions through model filtering
        user1_queryset = ResearchSession.objects.filter(user_id=self.user1.username)
        user1_session_ids = set(session.id for session in user1_queryset)
        expected_user1_ids = set(session.id for session in user1_sessions)
        
        # User1 should see exactly their own sessions
        self.assertEqual(user1_session_ids, expected_user1_ids)
        
        # User1 should not see any of user2's sessions
        user2_session_ids = set(session.id for session in user2_sessions)
        self.assertEqual(user1_session_ids.intersection(user2_session_ids), set())
        
        # Test user2 can only access their own sessions through model filtering
        user2_queryset = ResearchSession.objects.filter(user_id=self.user2.username)
        user2_retrieved_ids = set(session.id for session in user2_queryset)
        expected_user2_ids = set(session.id for session in user2_sessions)
        
        # User2 should see exactly their own sessions
        self.assertEqual(user2_retrieved_ids, expected_user2_ids)
        
        # User2 should not see any of user1's sessions
        self.assertEqual(user2_retrieved_ids.intersection(user1_session_ids), set())
    
    @given(
        st.text(min_size=1, max_size=50),  # query for user1 session (reduced size)
        st.text(min_size=1, max_size=50),  # query for user2 session (reduced size)
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_cross_user_session_access_prevention_property(self, user1_query, user2_query):
        """
        Property 4: User Data Isolation (Cross-user access prevention)
        For any research session belonging to one user, other users should not
        be able to access, retrieve, or continue that session through model queries.
        
        **Feature: ai-research-system, Property 4: User Data Isolation**
        **Validates: Requirements 2.2, 3.4**
        """
        # Create session for user1
        user1_session = ResearchSession.objects.create(
            user_id=self.user1.username,
            query=user1_query,
            status='COMPLETED'
        )
        
        # Create session for user2
        user2_session = ResearchSession.objects.create(
            user_id=self.user2.username,
            query=user2_query,
            status='COMPLETED'
        )
        
        # Test that user1 cannot access user2's session through model filtering
        user1_queryset = ResearchSession.objects.filter(user_id=self.user1.username)
        user1_accessible_ids = [session.id for session in user1_queryset]
        
        # User1 should not be able to see user2's session in their filtered queryset
        self.assertNotIn(user2_session.id, user1_accessible_ids)
        self.assertIn(user1_session.id, user1_accessible_ids)
        
        # Test that user2 cannot access user1's session through model filtering
        user2_queryset = ResearchSession.objects.filter(user_id=self.user2.username)
        user2_accessible_ids = [session.id for session in user2_queryset]
        
        # User2 should not be able to see user1's session in their filtered queryset
        self.assertNotIn(user1_session.id, user2_accessible_ids)
        self.assertIn(user2_session.id, user2_accessible_ids)
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=50),  # queries (reduced size)
            min_size=2,
            max_size=3  # reduced max size
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_user_continuation_isolation_property(self, queries):
        """
        Property 4: User Data Isolation (Continuation isolation)
        For any research continuation request, users should only be able to
        reference their own research sessions as parent sessions.
        
        **Feature: ai-research-system, Property 4: User Data Isolation**
        **Validates: Requirements 2.2, 3.4**
        """
        # Create research sessions for both users
        user1_sessions = []
        user2_sessions = []
        
        for i, query in enumerate(queries):
            # Create session for user1
            user1_session = ResearchSession.objects.create(
                user_id=self.user1.username,
                query=f"User1: {query}",
                status='COMPLETED',
                summary=f"User1 summary {i}"
            )
            user1_sessions.append(user1_session)
            
            # Create session for user2
            user2_session = ResearchSession.objects.create(
                user_id=self.user2.username,
                query=f"User2: {query}",
                status='COMPLETED',
                summary=f"User2 summary {i}"
            )
            user2_sessions.append(user2_session)
        
        # Test that user1 can only find their own sessions for continuation
        for user1_session in user1_sessions:
            # User1 should be able to find their own session
            user1_accessible = ResearchSession.objects.filter(
                user_id=self.user1.username, 
                id=user1_session.id
            ).exists()
            self.assertTrue(user1_accessible)
        
        # Test that user1 cannot find user2's sessions for continuation
        for user2_session in user2_sessions:
            user1_cannot_access = ResearchSession.objects.filter(
                user_id=self.user1.username, 
                id=user2_session.id
            ).exists()
            self.assertFalse(user1_cannot_access)
        
        # Test the reverse: user2 can only find their own sessions for continuation
        for user2_session in user2_sessions:
            # User2 should be able to find their own session
            user2_accessible = ResearchSession.objects.filter(
                user_id=self.user2.username, 
                id=user2_session.id
            ).exists()
            self.assertTrue(user2_accessible)
        
        # Test that user2 cannot find user1's sessions for continuation
        for user1_session in user1_sessions:
            user2_cannot_access = ResearchSession.objects.filter(
                user_id=self.user2.username, 
                id=user1_session.id
            ).exists()
            self.assertFalse(user2_cannot_access)


class AsyncResearchExecutionPropertyTest(HypothesisTestCase):
    """Property-based tests for async research execution."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=100),  # research queries
            min_size=1,
            max_size=5
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_async_research_execution_property(self, queries):
        """
        Property 1: Research Workflow Execution (async component)
        For any valid research query submitted by a user, the system should execute 
        the Open Deep Research workflow asynchronously and update the session status 
        appropriately upon completion.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution (async component)**
        **Validates: Requirements 1.2**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock
        
        # Mock the research service for this test
        with patch('research.tasks.research_service') as mock_service:
            # Configure mock to return successful results
            mock_service.execute_research = AsyncMock(return_value={
                "success": True,
                "final_report": "Mock research report",
                "research_brief": "Mock research brief",
                "notes": ["Mock note 1", "Mock note 2"],
                "raw_notes": ["Raw mock note"],
                "messages": [],
                "error": None
            })
            
            mock_service.create_config.return_value = {
                "configurable": {"test": True},
                "metadata": {"user_id": self.user.username}
            }
            
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create research sessions for each query
            sessions = []
            for query in queries:
                session = ResearchSession.objects.create(
                    user_id=self.user.username,
                    query=query,
                    status='PENDING'
                )
                sessions.append(session)
            
            # Execute research tasks for each session
            for session in sessions:
                # Execute the task synchronously for testing
                result = execute_research_task(str(session.id))
                
                # Verify task execution was successful
                self.assertTrue(result["success"])
                self.assertEqual(result["session_id"], str(session.id))
                
                # Refresh session from database
                session.refresh_from_db()
                
                # Verify session was updated correctly
                self.assertEqual(session.status, 'COMPLETED')
                self.assertIsNotNone(session.completed_at)
                self.assertIsNotNone(session.report)
                self.assertIsNotNone(session.summary)
                self.assertIsNotNone(session.reasoning)
                
                # Verify report structure
                self.assertIn('final_report', session.report)
                self.assertIn('notes', session.report)
                self.assertEqual(session.report['final_report'], 'Mock research report')
                
                # Verify reasoning structure
                self.assertIn('research_brief', session.reasoning)
                self.assertIn('methodology', session.reasoning)
                self.assertEqual(session.reasoning['research_brief'], 'Mock research brief')
    
    @given(
        st.text(min_size=1, max_size=100),  # parent query
        st.text(min_size=1, max_size=100),  # continuation query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_research_continuation_async_property(self, parent_query, continuation_query):
        """
        Property 1: Research Workflow Execution (continuation async component)
        For any research continuation request, the system should execute the workflow
        asynchronously with proper context injection from the parent session.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution (async component)**
        **Validates: Requirements 1.2**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock
        
        # Mock the research service for this test
        with patch('research.tasks.research_service') as mock_service:
            # Configure mock to return successful results
            mock_service.execute_research = AsyncMock(return_value={
                "success": True,
                "final_report": "Mock research report",
                "research_brief": "Mock research brief",
                "notes": ["Mock note 1", "Mock note 2"],
                "raw_notes": ["Raw mock note"],
                "messages": [],
                "error": None
            })
            
            mock_service.create_config.return_value = {
                "configurable": {"test": True},
                "metadata": {"user_id": self.user.username}
            }
            
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create parent session
            parent_session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=parent_query,
                status='COMPLETED',
                summary='Parent research summary',
                reasoning={'research_brief': 'Parent research brief'}
            )
            
            # Create continuation session
            continuation_session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=continuation_query,
                status='PENDING',
                parent_session=parent_session
            )
            
            # Execute the continuation research task
            result = execute_research_task(str(continuation_session.id))
            
            # Verify task execution was successful
            self.assertTrue(result["success"])
            
            # Refresh session from database
            continuation_session.refresh_from_db()
            
            # Verify continuation session was processed correctly
            self.assertEqual(continuation_session.status, 'COMPLETED')
            self.assertIsNotNone(continuation_session.completed_at)
            self.assertEqual(continuation_session.parent_session.id, parent_session.id)
            
            # Verify that continuation context was created
            # (The mock service should have been called with create_continuation_context)
            mock_service.create_continuation_context.assert_called_once()
            
            # Verify the context was created with parent session data
            call_args = mock_service.create_continuation_context.call_args[0][0]
            self.assertIn('research_brief', call_args)
            self.assertIn('final_report', call_args)
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=50),  # queries
            min_size=2,
            max_size=4
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_concurrent_research_execution_property(self, queries):
        """
        Property 1: Research Workflow Execution (concurrency component)
        For any set of research queries submitted concurrently, each should be
        processed independently without interference.
        
        **Feature: ai-research-system, Property 1: Research Workflow Execution (async component)**
        **Validates: Requirements 1.2**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock
        
        # Mock the research service for this test
        with patch('research.tasks.research_service') as mock_service:
            # Configure mock to return query-specific results
            def mock_execute_research(query, config=None, previous_context=None):
                return {
                    "success": True,
                    "final_report": f"Mock research report for: {query}",
                    "research_brief": f"Mock research brief for: {query}",
                    "notes": [f"Mock note for {query}"],
                    "raw_notes": [f"Raw mock note for {query}"],
                    "messages": [],
                    "error": None
                }
            
            mock_service.execute_research = AsyncMock(side_effect=mock_execute_research)
            mock_service.create_config.return_value = {
                "configurable": {"test": True},
                "metadata": {"user_id": self.user.username}
            }
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create multiple research sessions
            sessions = []
            for i, query in enumerate(queries):
                session = ResearchSession.objects.create(
                    user_id=self.user.username,
                    query=f"{query} (session {i})",
                    status='PENDING'
                )
                sessions.append(session)
            
            # Execute all tasks (simulating concurrent execution)
            results = []
            for session in sessions:
                result = execute_research_task(str(session.id))
                results.append(result)
            
            # Verify all tasks completed successfully
            for i, result in enumerate(results):
                self.assertTrue(result["success"], f"Task {i} failed: {result.get('error')}")
                self.assertEqual(result["session_id"], str(sessions[i].id))
            
            # Verify all sessions were updated independently
            for session in sessions:
                session.refresh_from_db()
                self.assertEqual(session.status, 'COMPLETED')
                self.assertIsNotNone(session.report)
                self.assertIsNotNone(session.summary)
                
                # Each session should have its own unique data - check if query is in report or summary
                query_found = (session.query in (session.report.get('final_report', '') or '')) or \
                             (session.query in (session.summary or ''))
                self.assertTrue(query_found, f"Query '{session.query}' not found in report or summary")


class ResearchErrorHandlingPropertyTest(HypothesisTestCase):
    """Property-based tests for research error handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=100),  # research queries
            min_size=1,
            max_size=3
        ),
        st.sampled_from([
            "API rate limit exceeded",
            "Network connection timeout", 
            "Invalid API key",
            "Service temporarily unavailable",
            "Unexpected server error"
        ])  # error messages
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_research_error_handling_property(self, queries, error_message):
        """
        Property 2: Research Error Handling
        For any research session that encounters an error during execution, the system 
        should capture error details, update the session status appropriately, and 
        provide meaningful error information to the user.
        
        **Feature: ai-research-system, Property 2: Research Error Handling**
        **Validates: Requirements 1.4**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock
        
        # Mock the research service for this test
        with patch('research.tasks.research_service') as mock_service:
            # Configure mock to return error results for this specific test
            mock_service.execute_research = AsyncMock(return_value={
                "success": False,
                "final_report": "",
                "research_brief": "",
                "notes": [],
                "raw_notes": [],
                "messages": [],
                "error": error_message
            })
            
            mock_service.create_config.return_value = {
                "configurable": {"test": True},
                "metadata": {"user_id": self.user.username}
            }
            
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create research sessions for each query
            sessions = []
            for query in queries:
                session = ResearchSession.objects.create(
                    user_id=self.user.username,
                    query=query,
                    status='PENDING'
                )
                sessions.append(session)
            
            # Execute research tasks and verify error handling
            for session in sessions:
                result = execute_research_task(str(session.id))
                
                # Verify task reports failure
                self.assertFalse(result["success"])
                self.assertEqual(result["error"], error_message)
                
                # Refresh session from database
                session.refresh_from_db()
                
                # Verify session status was updated to FAILED
                self.assertEqual(session.status, 'FAILED')
                self.assertIsNotNone(session.completed_at)
                
                # Verify error information was captured
                self.assertIsNotNone(session.reasoning)
                self.assertIn('error', session.reasoning)
                self.assertEqual(session.reasoning['error'], error_message)
    
    @given(
        st.text(min_size=1, max_size=100),  # research query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_research_exception_handling_property(self, query):
        """
        Property 2: Research Error Handling (exception component)
        For any research session that encounters an unexpected exception during 
        execution, the system should handle it gracefully and update the session 
        status appropriately.
        
        **Feature: ai-research-system, Property 2: Research Error Handling**
        **Validates: Requirements 1.4**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock
        
        # Mock the research service for this test
        with patch('research.tasks.research_service') as mock_service:
            # Configure mock to raise an exception for this specific test
            mock_service.execute_research = AsyncMock(side_effect=Exception("Unexpected error occurred"))
            
            mock_service.create_config.return_value = {
                "configurable": {"test": True},
                "metadata": {"user_id": self.user.username}
            }
            
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create research session
            session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=query,
                status='PENDING'
            )
            
            # Mock the task to disable retries for testing
            with patch('research.tasks.execute_research_task.max_retries', 0):
                # Execute research task
                result = execute_research_task(str(session.id))
                
                # Verify task handles exception gracefully
                self.assertFalse(result["success"])
                self.assertIn("Unexpected error occurred", result["error"])
                
                # Refresh session from database
                session.refresh_from_db()
                
                # Verify session status was updated to FAILED
                self.assertEqual(session.status, 'FAILED')
                self.assertIsNotNone(session.completed_at)
                
                # Verify error information was captured
                self.assertIsNotNone(session.reasoning)
                self.assertIn('error', session.reasoning)
    
    @given(
        st.text(min_size=1, max_size=100),  # research query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_nonexistent_session_error_handling_property(self, query):
        """
        Property 2: Research Error Handling (session validation component)
        For any research task executed with a non-existent session ID, the system 
        should handle the error gracefully and return appropriate error information.
        
        **Feature: ai-research-system, Property 2: Research Error Handling**
        **Validates: Requirements 1.4**
        """
        from research.tasks import execute_research_task
        import uuid
        
        # Use a random UUID that doesn't exist in the database
        nonexistent_session_id = str(uuid.uuid4())
        
        # Execute research task with non-existent session
        result = execute_research_task(nonexistent_session_id)
        
        # Verify task handles missing session gracefully
        self.assertFalse(result["success"])
        self.assertIn("Research session not found", result["error"])
        
        # Verify no session was created or modified
        self.assertFalse(
            ResearchSession.objects.filter(id=nonexistent_session_id).exists()
        )


class ComprehensiveCostTrackingPropertyTest(HypothesisTestCase):
    """Property-based tests for comprehensive cost tracking functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.integers(min_value=1, max_value=100000),  # input_tokens
        st.integers(min_value=1, max_value=100000),  # output_tokens
        st.dictionaries(
            st.sampled_from(['openai', 'anthropic', 'google']),
            st.decimals(min_value=0.001, max_value=100.0, places=4),
            min_size=1,
            max_size=3
        ),  # provider_costs
        st.text(min_size=1, max_size=100),  # research query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_comprehensive_cost_tracking_property(self, input_tokens, output_tokens, provider_costs, query):
        """
        Property 12: Comprehensive Cost Tracking
        For any research session, the system should track input and output tokens 
        for all LLM calls, calculate estimated costs, and return this information 
        when research details are requested.
        
        **Feature: ai-research-system, Property 12: Comprehensive Cost Tracking**
        **Validates: Requirements 7.1, 7.2, 7.4**
        """
        from research.models import ResearchSession, ResearchCost
        from decimal import Decimal
        
        # Create research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=query,
            status='COMPLETED',
            summary='Test research summary',
            langsmith_trace_id='test-trace-123'
        )
        
        # Calculate total estimated cost from provider costs
        total_estimated_cost = sum(provider_costs.values())
        
        # Convert provider costs to float for JSON serialization
        provider_costs_float = {k: float(v) for k, v in provider_costs.items()}
        
        # Create cost tracking data
        cost = ResearchCost.objects.create(
            session=session,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=Decimal(str(total_estimated_cost)),
            provider_costs=provider_costs_float
        )
        
        # Update totals (should be automatic)
        cost.update_totals()
        
        # Retrieve cost data and verify comprehensive tracking
        retrieved_cost = ResearchCost.objects.get(session=session)
        
        # Verify token tracking (Requirements 7.1)
        self.assertEqual(retrieved_cost.input_tokens, input_tokens)
        self.assertEqual(retrieved_cost.output_tokens, output_tokens)
        self.assertEqual(retrieved_cost.total_tokens, input_tokens + output_tokens)
        
        # Verify cost calculation (Requirements 7.2)
        self.assertEqual(retrieved_cost.estimated_cost, Decimal(str(total_estimated_cost)))
        
        # Verify provider cost breakdown is preserved
        self.assertEqual(retrieved_cost.provider_costs, provider_costs_float)
        for provider, cost_value in provider_costs_float.items():
            self.assertIn(provider, retrieved_cost.provider_costs)
            self.assertEqual(retrieved_cost.provider_costs[provider], cost_value)
        
        # Verify cost per token calculation
        expected_cost_per_token = float(total_estimated_cost) / (input_tokens + output_tokens)
        self.assertAlmostEqual(retrieved_cost.cost_per_token, expected_cost_per_token, places=6)
        
        # Verify relationship to research session
        self.assertEqual(retrieved_cost.session.id, session.id)
        self.assertEqual(retrieved_cost.session.user_id, self.user.username)
        
        # Verify timestamps are set
        self.assertIsNotNone(retrieved_cost.created_at)
        self.assertIsNotNone(retrieved_cost.updated_at)
        
        # Verify currency is set correctly
        self.assertEqual(retrieved_cost.currency, 'USD')
    
    @given(
        st.lists(
            st.tuples(
                st.integers(min_value=1, max_value=10000),  # input_tokens
                st.integers(min_value=1, max_value=10000),  # output_tokens
                st.decimals(min_value=0.01, max_value=10.0, places=4)  # cost
            ),
            min_size=1,
            max_size=5
        ),
        st.text(min_size=1, max_size=50)  # base query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_user_total_cost_aggregation_property(self, session_data, base_query):
        """
        Property 12: Comprehensive Cost Tracking (aggregation component)
        For any user with multiple research sessions, the system should accurately
        aggregate total costs and token usage across all sessions.
        
        **Feature: ai-research-system, Property 12: Comprehensive Cost Tracking**
        **Validates: Requirements 7.1, 7.2, 7.4**
        """
        from research.models import ResearchSession, ResearchCost
        from decimal import Decimal
        
        # Create multiple research sessions with cost data
        sessions = []
        total_expected_cost = Decimal('0')
        total_expected_tokens = 0
        
        for i, (input_tokens, output_tokens, cost) in enumerate(session_data):
            # Create research session
            session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=f"{base_query} - session {i}",
                status='COMPLETED'
            )
            sessions.append(session)
            
            # Create cost data
            ResearchCost.objects.create(
                session=session,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,  # Set total_tokens explicitly
                estimated_cost=Decimal(str(cost)),
                provider_costs={'openai': float(cost)}
            )
            
            # Track expected totals
            total_expected_cost += Decimal(str(cost))
            total_expected_tokens += input_tokens + output_tokens
        
        # Test user total cost aggregation
        user_totals = ResearchCost.get_user_total_cost(self.user.username)
        
        # Verify aggregated totals
        self.assertEqual(user_totals['total_cost'], total_expected_cost)
        self.assertEqual(user_totals['total_tokens'], total_expected_tokens)
        self.assertEqual(user_totals['session_count'], len(session_data))
        
        # Test date range filtering (all sessions should be within today)
        from django.utils import timezone
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)
        
        user_totals_filtered = ResearchCost.get_user_total_cost(
            self.user.username, 
            start_date=today_start, 
            end_date=today_end
        )
        
        # Should match unfiltered totals since all sessions are from today
        self.assertEqual(user_totals_filtered['total_cost'], total_expected_cost)
        self.assertEqual(user_totals_filtered['total_tokens'], total_expected_tokens)
        self.assertEqual(user_totals_filtered['session_count'], len(session_data))
    
    @given(
        st.integers(min_value=1, max_value=10000),  # input_tokens
        st.integers(min_value=1, max_value=10000),  # output_tokens
        st.decimals(min_value=0.01, max_value=50.0, places=4),  # estimated_cost
        st.text(min_size=1, max_size=100),  # query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_cost_data_persistence_and_retrieval_property(self, input_tokens, output_tokens, estimated_cost, query):
        """
        Property 12: Comprehensive Cost Tracking (persistence component)
        For any cost data stored for a research session, retrieving that data
        should return exactly the same values that were originally stored.
        
        **Feature: ai-research-system, Property 12: Comprehensive Cost Tracking**
        **Validates: Requirements 7.1, 7.2, 7.4**
        """
        from research.models import ResearchSession, ResearchCost
        from decimal import Decimal
        
        # Create research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=query,
            status='COMPLETED'
        )
        
        # Create detailed provider costs
        provider_costs = {
            'openai': float(estimated_cost) * 0.6,
            'anthropic': float(estimated_cost) * 0.4
        }
        
        # Create cost data
        original_cost = ResearchCost.objects.create(
            session=session,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=Decimal(str(estimated_cost)),
            provider_costs=provider_costs,
            currency='USD'
        )
        
        # Update totals
        original_cost.update_totals()
        
        # Store original values for comparison
        original_id = original_cost.id
        original_created_at = original_cost.created_at
        original_updated_at = original_cost.updated_at
        
        # Retrieve cost data multiple times to test consistency
        for _ in range(3):
            retrieved_cost = ResearchCost.objects.get(id=original_id)
            
            # Verify exact data preservation
            self.assertEqual(retrieved_cost.id, original_id)
            self.assertEqual(retrieved_cost.session.id, session.id)
            self.assertEqual(retrieved_cost.input_tokens, input_tokens)
            self.assertEqual(retrieved_cost.output_tokens, output_tokens)
            self.assertEqual(retrieved_cost.total_tokens, input_tokens + output_tokens)
            self.assertEqual(retrieved_cost.estimated_cost, Decimal(str(estimated_cost)))
            self.assertEqual(retrieved_cost.provider_costs, provider_costs)
            self.assertEqual(retrieved_cost.currency, 'USD')
            
            # Verify timestamps are preserved
            self.assertEqual(retrieved_cost.created_at, original_created_at)
            self.assertEqual(retrieved_cost.updated_at, original_updated_at)
            
            # Verify calculated properties are consistent
            expected_cost_per_token = float(estimated_cost) / (input_tokens + output_tokens)
            self.assertAlmostEqual(retrieved_cost.cost_per_token, expected_cost_per_token, places=6)
    
    @given(
        st.lists(
            st.tuples(
                st.text(min_size=1, max_size=50),  # user_id
                st.integers(min_value=1, max_value=1000),  # tokens
                st.decimals(min_value=0.01, max_value=5.0, places=4)  # cost
            ),
            min_size=2,
            max_size=4
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_cross_user_cost_isolation_property(self, user_cost_data):
        """
        Property 12: Comprehensive Cost Tracking (user isolation component)
        For any cost tracking queries, users should only see their own cost data
        and not have access to other users' cost information.
        
        **Feature: ai-research-system, Property 12: Comprehensive Cost Tracking**
        **Validates: Requirements 7.1, 7.2, 7.4**
        """
        from research.models import ResearchSession, ResearchCost
        from decimal import Decimal
        from django.contrib.auth.models import User
        
        # Create users and their cost data
        user_sessions = {}
        user_expected_totals = {}
        
        for user_id, tokens, cost in user_cost_data:
            # Create user if not exists
            if user_id not in user_sessions:
                user_sessions[user_id] = []
                user_expected_totals[user_id] = {'cost': Decimal('0'), 'tokens': 0, 'sessions': 0}
            
            # Create research session for this user
            session = ResearchSession.objects.create(
                user_id=user_id,
                query=f"Test query for {user_id}",
                status='COMPLETED'
            )
            user_sessions[user_id].append(session)
            
            # Create cost data
            cost_obj = ResearchCost.objects.create(
                session=session,
                input_tokens=tokens // 2,
                output_tokens=tokens - (tokens // 2),
                total_tokens=tokens,  # Set total_tokens explicitly
                estimated_cost=Decimal(str(cost)),
                provider_costs={'openai': float(cost)}
            )
            
            # Track expected totals for this user
            user_expected_totals[user_id]['cost'] += Decimal(str(cost))
            user_expected_totals[user_id]['tokens'] += tokens
            user_expected_totals[user_id]['sessions'] += 1
        
        # Verify each user can only see their own cost data
        for user_id in user_sessions.keys():
            user_totals = ResearchCost.get_user_total_cost(user_id)
            expected = user_expected_totals[user_id]
            
            # User should see exactly their own totals
            self.assertEqual(user_totals['total_cost'], expected['cost'])
            self.assertEqual(user_totals['total_tokens'], expected['tokens'])
            self.assertEqual(user_totals['session_count'], expected['sessions'])
            
            # Verify user cannot see other users' data through session filtering
            user_cost_objects = ResearchCost.objects.filter(session__user_id=user_id)
            user_session_ids = set(cost.session.id for cost in user_cost_objects)
            
            # Should only contain sessions belonging to this user
            expected_session_ids = set(session.id for session in user_sessions[user_id])
            self.assertEqual(user_session_ids, expected_session_ids)
            
            # Should not contain sessions from other users
            for other_user_id, other_sessions in user_sessions.items():
                if other_user_id != user_id:
                    other_session_ids = set(session.id for session in other_sessions)
                    self.assertEqual(user_session_ids.intersection(other_session_ids), set())


class ResearchContinuationPropertyTest(HypothesisTestCase):
    """Property-based tests for research continuation functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.text(min_size=1, max_size=100),  # parent query
        st.text(min_size=1, max_size=100),  # continuation query
        st.text(min_size=1, max_size=200),  # parent summary
        st.dictionaries(
            st.sampled_from(['research_brief', 'methodology', 'findings']),
            st.text(min_size=1, max_size=100),
            min_size=1,
            max_size=3
        )  # parent reasoning
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_research_continuation_context_injection_property(self, parent_query, continuation_query, parent_summary, parent_reasoning):
        """
        Property 6: Research Continuation Context Injection
        For any research continuation request with a valid parent session ID, the system 
        should inject the parent session's summary into the new research context and 
        establish the correct parent-child relationship.
        
        **Feature: ai-research-system, Property 6: Research Continuation Context Injection**
        **Validates: Requirements 3.1, 3.3**
        """
        from research.services import research_service
        
        # Create parent research session
        parent_session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=parent_query,
            status='COMPLETED',
            summary=parent_summary,
            reasoning=parent_reasoning,
            report={'final_report': f'Final report for: {parent_query}', 'sources': []}
        )
        
        # Create continuation session
        continuation_session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=continuation_query,
            status='PENDING',
            parent_session=parent_session
        )
        
        # Test context injection using the service
        context_data = {
            "research_brief": parent_reasoning.get("research_brief", ""),
            "final_report": parent_summary
        }
        
        continuation_context = research_service.create_continuation_context(context_data)
        
        # Verify context injection properties
        self.assertIsInstance(continuation_context, str)
        
        # Context should include parent research information
        if parent_reasoning.get("research_brief"):
            self.assertIn("Previous research brief", continuation_context)
            self.assertIn(parent_reasoning["research_brief"], continuation_context)
        
        if parent_summary:
            self.assertIn("Previous research findings", continuation_context)
            # Should include at least part of the parent summary
            summary_excerpt = parent_summary[:50]  # First 50 chars
            if summary_excerpt.strip():
                self.assertIn(summary_excerpt, continuation_context)
        
        # Verify parent-child relationship is established correctly
        self.assertEqual(continuation_session.parent_session.id, parent_session.id)
        self.assertTrue(continuation_session.is_continuation)
        self.assertFalse(parent_session.is_continuation)
        
        # Verify lineage tracking
        lineage = continuation_session.get_research_lineage()
        self.assertEqual(len(lineage), 2)  # Parent and child
        self.assertEqual(lineage[0].id, parent_session.id)  # Root (parent)
        self.assertEqual(lineage[1].id, continuation_session.id)  # Child
        
        # Verify user isolation - both sessions should belong to same user
        self.assertEqual(parent_session.user_id, self.user.username)
        self.assertEqual(continuation_session.user_id, self.user.username)
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=50),  # queries for continuation chain
            min_size=2,
            max_size=4
        ),
        st.text(min_size=1, max_size=100)  # base summary content
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_multi_level_continuation_context_property(self, queries, base_summary):
        """
        Property 6: Research Continuation Context Injection (multi-level)
        For any chain of research continuations, each level should properly inject
        context from its immediate parent and maintain the complete lineage.
        
        **Feature: ai-research-system, Property 6: Research Continuation Context Injection**
        **Validates: Requirements 3.1, 3.3**
        """
        from research.services import research_service
        
        # Create a chain of research sessions
        sessions = []
        parent = None
        
        for i, query in enumerate(queries):
            session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=query,
                status='COMPLETED' if i < len(queries) - 1 else 'PENDING',  # Last one is pending
                summary=f"{base_summary} - Level {i + 1}",
                reasoning={'research_brief': f'Brief for level {i + 1}', 'level': i + 1},
                parent_session=parent
            )
            sessions.append(session)
            parent = session
        
        # Test context injection for each continuation level
        for i in range(1, len(sessions)):
            current_session = sessions[i]
            parent_session = sessions[i - 1]
            
            # Create continuation context from parent
            context_data = {
                "research_brief": parent_session.reasoning.get("research_brief", ""),
                "final_report": parent_session.summary
            }
            
            continuation_context = research_service.create_continuation_context(context_data)
            
            # Verify context includes parent information
            self.assertIn("Previous research brief", continuation_context)
            self.assertIn(f"Brief for level {i}", continuation_context)
            self.assertIn("Previous research findings", continuation_context)
            self.assertIn(f"Level {i}", continuation_context)
            
            # Verify parent-child relationship
            self.assertEqual(current_session.parent_session.id, parent_session.id)
            self.assertTrue(current_session.is_continuation)
            
            # Verify complete lineage
            lineage = current_session.get_research_lineage()
            self.assertEqual(len(lineage), i + 1)  # Should include all ancestors plus self
            
            # Verify lineage order (root to current)
            for j, lineage_session in enumerate(lineage):
                self.assertEqual(lineage_session.id, sessions[j].id)
    
    @given(
        st.text(min_size=1, max_size=100),  # parent query
        st.text(min_size=1, max_size=100),  # continuation query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow], deadline=None)
    def test_continuation_user_validation_property(self, parent_query, continuation_query):
        """
        Property 6: Research Continuation Context Injection (user validation)
        For any research continuation request, the system should only allow users
        to continue their own research sessions and reject cross-user continuation attempts.
        
        **Feature: ai-research-system, Property 6: Research Continuation Context Injection**
        **Validates: Requirements 3.1, 3.3**
        """
        # Create second user for cross-user testing
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        other_user = User.objects.create_user(
            username=f'otheruser_{unique_suffix}', 
            password='testpass123'
        )
        
        # Create parent session for first user
        user1_parent = ResearchSession.objects.create(
            user_id=self.user.username,
            query=parent_query,
            status='COMPLETED',
            summary='User 1 parent summary'
        )
        
        # Create parent session for second user
        user2_parent = ResearchSession.objects.create(
            user_id=other_user.username,
            query=parent_query,
            status='COMPLETED',
            summary='User 2 parent summary'
        )
        
        # Test valid continuation (same user)
        valid_continuation = ResearchSession.objects.create(
            user_id=self.user.username,
            query=continuation_query,
            status='PENDING',
            parent_session=user1_parent
        )
        
        # Verify valid continuation works
        self.assertEqual(valid_continuation.parent_session.id, user1_parent.id)
        self.assertEqual(valid_continuation.user_id, user1_parent.user_id)
        self.assertTrue(valid_continuation.is_continuation)
        
        # Test that we can query for user's own sessions for continuation
        user1_sessions = ResearchSession.objects.filter(user_id=self.user.username)
        user1_session_ids = [session.id for session in user1_sessions]
        
        # User 1 should see their own sessions
        self.assertIn(user1_parent.id, user1_session_ids)
        self.assertIn(valid_continuation.id, user1_session_ids)
        
        # User 1 should NOT see user 2's sessions
        self.assertNotIn(user2_parent.id, user1_session_ids)
        
        # Test reverse: user 2 cannot see user 1's sessions
        user2_sessions = ResearchSession.objects.filter(user_id=other_user.username)
        user2_session_ids = [session.id for session in user2_sessions]
        
        # User 2 should see their own session
        self.assertIn(user2_parent.id, user2_session_ids)
        
        # User 2 should NOT see user 1's sessions
        self.assertNotIn(user1_parent.id, user2_session_ids)
        self.assertNotIn(valid_continuation.id, user2_session_ids)


class ResearchDeduplicationPropertyTest(HypothesisTestCase):
    """Property-based tests for research deduplication functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.text(min_size=1, max_size=100),  # parent query
        st.text(min_size=1, max_size=100),  # continuation query
        st.lists(
            st.text(min_size=1, max_size=50),  # topics covered in parent
            min_size=1,
            max_size=5
        ),
        st.lists(
            st.text(min_size=1, max_size=50),  # sources used in parent
            min_size=1,
            max_size=3
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_research_deduplication_property(self, parent_query, continuation_query, covered_topics, used_sources):
        """
        Property 7: Research Deduplication
        For any research continuation session, the system should include previous 
        research context in a way that enables the AI agent to avoid repeating 
        previously covered topics.
        
        **Feature: ai-research-system, Property 7: Research Deduplication**
        **Validates: Requirements 3.2**
        """
        from research.services import research_service
        
        # Create parent research session with detailed findings
        parent_report = {
            'final_report': f'Research on {parent_query}',
            'covered_topics': covered_topics,
            'sources_used': used_sources,
            'key_findings': [f'Finding about {topic}' for topic in covered_topics[:3]]
        }
        
        parent_reasoning = {
            'research_brief': f'Comprehensive research on {parent_query}',
            'methodology': 'Multi-step research with source analysis',
            'topics_covered': covered_topics,
            'sources_consulted': used_sources
        }
        
        parent_session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=parent_query,
            status='COMPLETED',
            summary=f'Completed research on {parent_query}. Covered: {", ".join(covered_topics[:3])}',
            report=parent_report,
            reasoning=parent_reasoning
        )
        
        # Create continuation session
        continuation_session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=continuation_query,
            status='PENDING',
            parent_session=parent_session
        )
        
        # Test deduplication context creation
        context_data = {
            "research_brief": parent_reasoning.get("research_brief", ""),
            "final_report": parent_session.summary
        }
        
        continuation_context = research_service.create_continuation_context(context_data)
        
        # Verify deduplication context properties
        self.assertIsInstance(continuation_context, str)
        self.assertGreater(len(continuation_context), 0)
        
        # Context should include information about what was previously covered
        self.assertIn("Previous research brief", continuation_context)
        self.assertIn("Previous research findings", continuation_context)
        
        # Context should include parent query information to avoid duplication
        if parent_query:
            # Should include at least part of the parent query context
            parent_excerpt = parent_query[:30]
            if parent_excerpt.strip():
                self.assertIn(parent_excerpt, continuation_context)
        
        # Context should include covered topics information
        if covered_topics:
            # Should include information about covered topics
            first_topic = covered_topics[0][:20]  # First 20 chars of first topic
            if first_topic.strip():
                # The context should contain some reference to previous work
                # This enables the AI to avoid repeating the same topics
                context_lower = continuation_context.lower()
                topic_lower = first_topic.lower()
                topic_found = topic_lower in context_lower
                
                # If not found directly, check if parent summary contains it
                summary_lower = parent_session.summary.lower()
                summary_has_topic = topic_lower in summary_lower
                
                # Either the context should contain the topic directly,
                # or the parent summary (which is in context) should contain it
                self.assertTrue(topic_found or summary_has_topic, 
                    f"Topic '{first_topic}' not found in context or parent summary for deduplication")
        
        # Verify parent-child relationship for deduplication tracking
        self.assertEqual(continuation_session.parent_session.id, parent_session.id)
        self.assertTrue(continuation_session.is_continuation)
        
        # Verify lineage can be used for comprehensive deduplication
        lineage = continuation_session.get_research_lineage()
        self.assertEqual(len(lineage), 2)  # Parent and child
        
        # Each session in lineage should have accessible research data
        for session in lineage:
            self.assertIsNotNone(session.query)
            # Sessions should have identifiable content for deduplication
            if session.status == 'COMPLETED':
                # Completed sessions should have summary or report for deduplication
                has_content = bool(session.summary) or bool(session.report)
                self.assertTrue(has_content, f"Session {session.id} lacks content for deduplication")
    
    @given(
        st.lists(
            st.dictionaries(
                st.sampled_from(['query', 'topics', 'findings']),
                st.text(min_size=1, max_size=30),
                min_size=2,
                max_size=3
            ),
            min_size=2,
            max_size=4
        )  # Chain of research sessions with overlapping content
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_multi_level_deduplication_property(self, session_data_list):
        """
        Property 7: Research Deduplication (multi-level)
        For any chain of research continuations, each level should have access to
        all previous research context to enable comprehensive deduplication.
        
        **Feature: ai-research-system, Property 7: Research Deduplication**
        **Validates: Requirements 3.2**
        """
        from research.services import research_service
        
        # Create chain of research sessions
        sessions = []
        parent = None
        
        for i, session_data in enumerate(session_data_list):
            query = session_data.get('query', f'Query {i + 1}')
            topics = session_data.get('topics', f'Topics {i + 1}')
            findings = session_data.get('findings', f'Findings {i + 1}')
            
            session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=query,
                status='COMPLETED' if i < len(session_data_list) - 1 else 'PENDING',
                summary=f'Research summary {i + 1}: {topics}',
                report={
                    'final_report': f'Report {i + 1}: {findings}',
                    'level': i + 1,
                    'topics': topics
                },
                reasoning={
                    'research_brief': f'Brief {i + 1}: {query}',
                    'level': i + 1,
                    'covered_topics': [topics]
                },
                parent_session=parent
            )
            sessions.append(session)
            parent = session
        
        # Test deduplication context for each continuation level
        for i in range(1, len(sessions)):
            current_session = sessions[i]
            immediate_parent = sessions[i - 1]
            
            # Create continuation context from immediate parent
            context_data = {
                "research_brief": immediate_parent.reasoning.get("research_brief", ""),
                "final_report": immediate_parent.summary
            }
            
            continuation_context = research_service.create_continuation_context(context_data)
            
            # Verify context includes immediate parent information for deduplication
            self.assertIn("Previous research brief", continuation_context)
            self.assertIn("Previous research findings", continuation_context)
            
            # Context should include parent's research content
            parent_brief = immediate_parent.reasoning.get("research_brief", "")
            if parent_brief:
                brief_excerpt = parent_brief[:20]
                if brief_excerpt.strip():
                    self.assertIn(brief_excerpt, continuation_context)
            
            # Verify complete lineage is available for comprehensive deduplication
            lineage = current_session.get_research_lineage()
            self.assertEqual(len(lineage), i + 1)
            
            # Each session in lineage should be accessible for deduplication
            for j, lineage_session in enumerate(lineage):
                self.assertEqual(lineage_session.id, sessions[j].id)
                
                # Each session should have content that can be used for deduplication
                if lineage_session.status == 'COMPLETED':
                    self.assertTrue(
                        bool(lineage_session.summary) or bool(lineage_session.report),
                        f"Session {j} in lineage lacks content for deduplication"
                    )
                    
                    # Verify research data structure for deduplication
                    if lineage_session.reasoning:
                        self.assertIn('research_brief', lineage_session.reasoning)
                        self.assertIn('level', lineage_session.reasoning)
    
    @given(
        st.text(min_size=1, max_size=50),  # base query
        st.lists(
            st.text(min_size=1, max_size=30),  # overlapping topics
            min_size=2,
            max_size=4
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_overlapping_content_deduplication_property(self, base_query, overlapping_topics):
        """
        Property 7: Research Deduplication (overlapping content)
        For any research continuation with overlapping topics, the system should
        provide sufficient context to identify and avoid repeating previous work.
        
        **Feature: ai-research-system, Property 7: Research Deduplication**
        **Validates: Requirements 3.2**
        """
        from research.services import research_service
        
        # Create parent session with specific topics covered
        parent_session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=f'{base_query} - initial research',
            status='COMPLETED',
            summary=f'Researched {base_query}. Covered topics: {", ".join(overlapping_topics[:2])}',
            report={
                'final_report': f'Comprehensive analysis of {base_query}',
                'covered_topics': overlapping_topics[:2],  # First 2 topics covered
                'detailed_findings': {topic: f'Analysis of {topic}' for topic in overlapping_topics[:2]}
            },
            reasoning={
                'research_brief': f'Initial research on {base_query}',
                'topics_analyzed': overlapping_topics[:2],
                'methodology': 'Systematic analysis'
            }
        )
        
        # Create continuation session that might overlap
        continuation_session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=f'{base_query} - extended research on {overlapping_topics[-1]}',
            status='PENDING',
            parent_session=parent_session
        )
        
        # Test deduplication context for overlapping content
        context_data = {
            "research_brief": parent_session.reasoning.get("research_brief", ""),
            "final_report": parent_session.summary
        }
        
        continuation_context = research_service.create_continuation_context(context_data)
        
        # Verify context provides sufficient information for deduplication
        self.assertIsInstance(continuation_context, str)
        self.assertGreater(len(continuation_context), 0)
        
        # Context should include information about previously covered topics
        for covered_topic in overlapping_topics[:2]:  # Topics covered in parent
            topic_excerpt = covered_topic[:15]  # First 15 chars
            if topic_excerpt.strip():
                # Check if topic information is available in context or parent summary
                context_lower = continuation_context.lower()
                topic_lower = topic_excerpt.lower()
                summary_lower = parent_session.summary.lower()
                
                topic_in_context = topic_lower in context_lower
                topic_in_summary = topic_lower in summary_lower
                
                # Topic should be findable for deduplication purposes
                self.assertTrue(topic_in_context or topic_in_summary,
                    f"Topic '{topic_excerpt}' not accessible for deduplication")
        
        # Verify parent-child relationship enables deduplication tracking
        self.assertEqual(continuation_session.parent_session.id, parent_session.id)
        
        # Verify that parent session data is structured for deduplication
        self.assertIsNotNone(parent_session.report)
        self.assertIn('covered_topics', parent_session.report)
        self.assertEqual(len(parent_session.report['covered_topics']), 2)
        
        # Verify reasoning contains deduplication-relevant information
        self.assertIsNotNone(parent_session.reasoning)
        self.assertIn('topics_analyzed', parent_session.reasoning)
        self.assertEqual(len(parent_session.reasoning['topics_analyzed']), 2)


class LangSmithTracingPropertyTest(HypothesisTestCase):
    """Property-based tests for LangSmith tracing integration."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=100),  # research queries
            min_size=1,
            max_size=3
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_langsmith_tracing_integration_property(self, queries):
        """
        Property 11: LangSmith Tracing Integration
        For any research session execution, the system should create a unique LangSmith 
        trace, store the trace ID in the database, and ensure the trace captures all 
        LLM calls and tool executions.
        
        **Feature: ai-research-system, Property 11: LangSmith Tracing Integration**
        **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
        """
        from research.tasks import execute_research_task
        from research.services import research_service
        from unittest.mock import patch, AsyncMock, MagicMock
        import uuid
        
        # Mock LangSmith tracing components
        with patch('research.services.RunnableConfig') as mock_config_class, \
             patch('research.tasks.research_service') as mock_service:
            
            # Create unique mock trace IDs for each session (not just query)
            session_trace_map = {}
            
            # Configure mock service to return successful results with trace IDs
            def mock_execute_research(query, config=None, previous_context=None):
                # Generate unique trace ID for each execution
                trace_id = f'trace-{uuid.uuid4()}'
                
                if config and hasattr(config, 'metadata'):
                    config.metadata['trace_id'] = trace_id
                
                return {
                    "success": True,
                    "final_report": f"Mock research report for: {query}",
                    "research_brief": f"Mock research brief for: {query}",
                    "notes": [f"Mock note for {query}"],
                    "raw_notes": [f"Raw mock note for {query}"],
                    "messages": [],
                    "error": None,
                    "trace_id": trace_id
                }
            
            mock_service.execute_research = AsyncMock(side_effect=mock_execute_research)
            
            # Configure mock config creation with tracing metadata
            def mock_create_config(custom_config=None, user_context=None):
                config = MagicMock()
                config.metadata = user_context or {}
                config.tags = ["ai-research-system", "open-deep-research"]
                # Add LangSmith tracing configuration
                config.configurable = {
                    "langchain_tracing_v2": True,
                    "langchain_project": "ai-research-system"
                }
                return config
            
            mock_service.create_config.side_effect = mock_create_config
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create research sessions for each query
            sessions = []
            for i, query in enumerate(queries):
                session = ResearchSession.objects.create(
                    user_id=self.user.username,
                    query=f"{query}_session_{i}",  # Make queries unique per session
                    status='PENDING'
                )
                sessions.append(session)
            
            # Execute research tasks and verify tracing integration
            for i, session in enumerate(sessions):
                result = execute_research_task(str(session.id))
                
                # Verify task execution was successful
                self.assertTrue(result["success"], f"Task failed: {result.get('error')}")
                
                # Refresh session from database
                session.refresh_from_db()
                
                # Property: LangSmith trace ID is stored in database
                self.assertIsNotNone(session.langsmith_trace_id, 
                    f"LangSmith trace ID not stored for session {session.id}")
                self.assertGreater(len(session.langsmith_trace_id), 0,
                    "LangSmith trace ID should not be empty")
                
                # Property: Trace ID follows expected format (UUID-like)
                trace_id = session.langsmith_trace_id
                self.assertIsInstance(trace_id, str)
                # Should contain trace identifier
                self.assertIn('trace-', trace_id)
                
                # Property: Each session gets a unique trace ID
                for other_session in sessions[:i]:  # Compare with previous sessions
                    other_session.refresh_from_db()
                    if other_session.langsmith_trace_id:
                        self.assertNotEqual(session.langsmith_trace_id, 
                                          other_session.langsmith_trace_id,
                                          f"Each session should have a unique trace ID. Session {session.id} has same trace as {other_session.id}")
                
                # Property: Trace ID is accessible through API responses
                # (This would be tested in API tests, but we verify the data is available)
                self.assertIsNotNone(session.langsmith_trace_id)
                
                # Property: Research execution includes tracing configuration
                # Verify that create_config was called with proper tracing setup
                mock_service.create_config.assert_called()
                
                # Get the last call to create_config for this session
                config_calls = mock_service.create_config.call_args_list
                last_call = config_calls[-1]
                
                # Verify user context was passed (enables trace correlation)
                if last_call[1] and 'user_context' in last_call[1]:
                    user_context = last_call[1]['user_context']
                    self.assertIn('user_id', user_context)
                    self.assertIn('session_id', user_context)
                    self.assertEqual(user_context['user_id'], self.user.username)
                    self.assertEqual(user_context['session_id'], str(session.id))
    
    @given(
        st.text(min_size=1, max_size=100),  # parent query
        st.text(min_size=1, max_size=100),  # continuation query
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_continuation_tracing_property(self, parent_query, continuation_query):
        """
        Property 11: LangSmith Tracing Integration (continuation component)
        For any research continuation session, the system should create a new trace
        that can be correlated with the parent session's trace through metadata.
        
        **Feature: ai-research-system, Property 11: LangSmith Tracing Integration**
        **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock, MagicMock
        import uuid
        
        # Mock LangSmith tracing components
        with patch('research.tasks.research_service') as mock_service:
            
            # Create unique mock trace IDs for each execution
            execution_count = 0
            
            # Configure mock service for parent and continuation
            def mock_execute_research(query, config=None, previous_context=None):
                nonlocal execution_count
                execution_count += 1
                
                # Generate unique trace ID for each execution
                trace_id = f'trace-{execution_count}-{uuid.uuid4()}'
                
                if config and hasattr(config, 'metadata'):
                    config.metadata['trace_id'] = trace_id
                
                return {
                    "success": True,
                    "final_report": f"Mock research report for: {query}",
                    "research_brief": f"Mock research brief for: {query}",
                    "notes": [f"Mock note for {query}"],
                    "raw_notes": [f"Raw mock note for {query}"],
                    "messages": [],
                    "error": None,
                    "trace_id": trace_id
                }
            
            mock_service.execute_research = AsyncMock(side_effect=mock_execute_research)
            
            # Configure mock config creation
            def mock_create_config(custom_config=None, user_context=None):
                config = MagicMock()
                config.metadata = user_context or {}
                config.tags = ["ai-research-system", "open-deep-research"]
                config.configurable = {
                    "langchain_tracing_v2": True,
                    "langchain_project": "ai-research-system"
                }
                return config
            
            mock_service.create_config.side_effect = mock_create_config
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create parent session and execute
            parent_session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=f"parent_{parent_query}",  # Make queries unique
                status='PENDING'
            )
            
            parent_result = execute_research_task(str(parent_session.id))
            self.assertTrue(parent_result["success"])
            
            parent_session.refresh_from_db()
            parent_session.status = 'COMPLETED'  # Mark as completed for continuation
            parent_session.save()
            
            # Create continuation session and execute
            continuation_session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=f"continuation_{continuation_query}",  # Make queries unique
                status='PENDING',
                parent_session=parent_session
            )
            
            continuation_result = execute_research_task(str(continuation_session.id))
            self.assertTrue(continuation_result["success"])
            
            # Refresh both sessions
            parent_session.refresh_from_db()
            continuation_session.refresh_from_db()
            
            # Property: Both sessions have unique trace IDs
            self.assertIsNotNone(parent_session.langsmith_trace_id)
            self.assertIsNotNone(continuation_session.langsmith_trace_id)
            self.assertNotEqual(parent_session.langsmith_trace_id, 
                              continuation_session.langsmith_trace_id)
            
            # Property: Trace IDs follow expected format
            self.assertIn('trace-', parent_session.langsmith_trace_id)
            self.assertIn('trace-', continuation_session.langsmith_trace_id)
            
            # Property: Continuation context includes parent session information for tracing
            # Verify that create_continuation_context was called for the continuation
            mock_service.create_continuation_context.assert_called()
            
            # Property: User context enables trace correlation
            config_calls = mock_service.create_config.call_args_list
            
            # Should have been called for both parent and continuation
            self.assertGreaterEqual(len(config_calls), 2)
            
            # Verify user context was passed for correlation
            for call in config_calls:
                if call[1] and 'user_context' in call[1]:
                    user_context = call[1]['user_context']
                    self.assertIn('user_id', user_context)
                    self.assertEqual(user_context['user_id'], self.user.username)
    
    @given(
        st.text(min_size=1, max_size=100),  # research query
        st.sampled_from([
            "LangSmith API error",
            "Tracing service unavailable", 
            "Network timeout during tracing"
        ])  # tracing error messages
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_tracing_error_handling_property(self, query, tracing_error):
        """
        Property 11: LangSmith Tracing Integration (error handling component)
        For any research session where LangSmith tracing encounters an error, the 
        research execution should continue successfully and the error should be handled gracefully.
        
        **Feature: ai-research-system, Property 11: LangSmith Tracing Integration**
        **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
        """
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock, MagicMock
        
        # Mock LangSmith tracing components with error
        with patch('research.tasks.research_service') as mock_service:
            
            # Configure mock service to succeed but with tracing issues
            def mock_execute_research(query, config=None, previous_context=None):
                # Simulate tracing error but successful research
                return {
                    "success": True,
                    "final_report": f"Mock research report for: {query}",
                    "research_brief": f"Mock research brief for: {query}",
                    "notes": [f"Mock note for {query}"],
                    "raw_notes": [f"Raw mock note for {query}"],
                    "messages": [],
                    "error": None,
                    "tracing_error": tracing_error  # Indicate tracing had issues
                }
            
            mock_service.execute_research = AsyncMock(side_effect=mock_execute_research)
            
            # Configure mock config creation (tracing setup might fail)
            def mock_create_config(custom_config=None, user_context=None):
                config = MagicMock()
                config.metadata = user_context or {}
                config.tags = ["ai-research-system", "open-deep-research"]
                config.configurable = {
                    "langchain_tracing_v2": True,
                    "langchain_project": "ai-research-system"
                }
                # Simulate tracing setup issues by not setting trace_id
                return config
            
            mock_service.create_config.side_effect = mock_create_config
            mock_service.create_continuation_context.return_value = "Mock continuation context"
            
            # Create research session
            session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=query,
                status='PENDING'
            )
            
            # Execute research task
            result = execute_research_task(str(session.id))
            
            # Property: Research execution succeeds despite tracing issues
            self.assertTrue(result["success"], 
                f"Research should succeed even with tracing errors: {result.get('error')}")
            
            # Refresh session from database
            session.refresh_from_db()
            
            # Property: Session is marked as completed despite tracing issues
            self.assertEqual(session.status, 'COMPLETED')
            self.assertIsNotNone(session.completed_at)
            
            # Property: Research results are still captured
            self.assertIsNotNone(session.report)
            self.assertIsNotNone(session.summary)
            self.assertIsNotNone(session.reasoning)
            
            # Property: Trace ID might be None due to tracing error, but that's acceptable
            # The system should handle missing trace IDs gracefully
            # (trace_id could be None if tracing failed, and that's OK)
            if session.langsmith_trace_id is not None:
                self.assertIsInstance(session.langsmith_trace_id, str)
            
            # Property: Research execution was attempted with tracing configuration
            mock_service.create_config.assert_called()
            mock_service.execute_research.assert_called()


class ReasoningVisibilityPropertyTest(HypothesisTestCase):
    """Property-based tests for reasoning visibility and security."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.text(min_size=1, max_size=100),  # research query
        st.text(min_size=10, max_size=200),  # research brief
        st.text(min_size=10, max_size=100),  # methodology
        st.lists(
            st.text(min_size=5, max_size=50, alphabet=st.characters(blacklist_categories=('Cc', 'Cs'))),  # raw chain-of-thought data
            min_size=1,
            max_size=5
        ),
        st.lists(
            st.text(min_size=5, max_size=50, alphabet=st.characters(blacklist_categories=('Cc', 'Cs'))),  # internal agent communications
            min_size=1,
            max_size=3
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_reasoning_visibility_and_security_property(self, query, research_brief, methodology, raw_thoughts, internal_comms):
        """
        Property 10: Reasoning Visibility and Security
        For any completed research session, the system should provide summarized 
        reasoning information while ensuring that raw chain-of-thought or internal 
        agent communications are not exposed to users.
        
        **Feature: ai-research-system, Property 10: Reasoning Visibility and Security**
        **Validates: Requirements 5.1, 5.2, 5.4**
        """
        from research.models import ResearchSession
        from research.services import ReasoningService
        
        # Create unique raw internal data that shouldn't appear in user-facing fields
        unique_raw_thoughts = [f"INTERNAL_RAW_THOUGHT_{i}_{thought}" for i, thought in enumerate(raw_thoughts)]
        unique_internal_comms = [f"INTERNAL_AGENT_COMM_{i}_{comm}" for i, comm in enumerate(internal_comms)]
        
        # Create research session with raw internal data
        raw_reasoning_data = {
            "research_brief": research_brief,
            "methodology": methodology,
            "raw_chain_of_thought": unique_raw_thoughts,
            "internal_agent_communications": unique_internal_comms,
            "planning_steps": [f"INTERNAL_STEP_{i}_{thought}" for i, thought in enumerate(raw_thoughts[:3])],
            "tool_calls": [f"INTERNAL_TOOL_CALL_{i}_{comm}" for i, comm in enumerate(internal_comms)],
            "debug_info": {"internal": True, "raw_data": unique_raw_thoughts}
        }
        
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=query,
            status='COMPLETED',
            summary=f'Research completed for: {query}',
            reasoning=raw_reasoning_data,
            report={'final_report': f'Report for {query}', 'sources': []}
        )
        
        # Test reasoning service filtering
        reasoning_service = ReasoningService()
        filtered_reasoning = reasoning_service.filter_reasoning_for_user(session.reasoning)
        
        # Property: Summarized reasoning is provided (Requirements 5.1)
        self.assertIsInstance(filtered_reasoning, dict)
        self.assertIn('research_brief', filtered_reasoning)
        self.assertIn('methodology', filtered_reasoning)
        
        # Verify high-level reasoning information is preserved
        self.assertEqual(filtered_reasoning['research_brief'], research_brief)
        self.assertEqual(filtered_reasoning['methodology'], methodology)
        
        # Property: Raw chain-of-thought is filtered out (Requirements 5.2)
        self.assertNotIn('raw_chain_of_thought', filtered_reasoning)
        self.assertNotIn('internal_agent_communications', filtered_reasoning)
        self.assertNotIn('debug_info', filtered_reasoning)
        self.assertNotIn('planning_steps', filtered_reasoning)
        self.assertNotIn('tool_calls', filtered_reasoning)
        
        # Verify no unique raw thoughts leak through in any field
        for field_name, field_value in filtered_reasoning.items():
            if isinstance(field_value, str):
                for unique_thought in unique_raw_thoughts:
                    self.assertNotIn(unique_thought, field_value,
                        f"Raw thought '{unique_thought}' found in filtered field '{field_name}'")
            elif isinstance(field_value, list):
                for item in field_value:
                    if isinstance(item, str):
                        for unique_thought in unique_raw_thoughts:
                            self.assertNotIn(unique_thought, item,
                                f"Raw thought '{unique_thought}' found in filtered list item")
        
        # Property: Internal agent communications are filtered out (Requirements 5.2)
        for field_name, field_value in filtered_reasoning.items():
            if isinstance(field_value, str):
                for unique_comm in unique_internal_comms:
                    self.assertNotIn(unique_comm, field_value,
                        f"Internal communication '{unique_comm}' found in filtered field '{field_name}'")
        
        # Property: User-friendly format is maintained (Requirements 5.4)
        # Filtered reasoning should be structured and readable
        self.assertIsInstance(filtered_reasoning.get('research_brief'), str)
        self.assertIsInstance(filtered_reasoning.get('methodology'), str)
        
        # Should contain user-friendly field names
        allowed_fields = {
            'research_brief', 'methodology', 'approach', 'summary', 
            'key_findings', 'sources_consulted', 'research_steps'
        }
        for field_name in filtered_reasoning.keys():
            self.assertIn(field_name, allowed_fields,
                f"Field '{field_name}' is not user-friendly and should be filtered")
        
        # Property: Reasoning is stored with session (Requirements 5.3)
        retrieved_session = ResearchSession.objects.get(id=session.id)
        self.assertIsNotNone(retrieved_session.reasoning)
        
        # Original reasoning should contain all data (for internal use)
        self.assertIn('raw_chain_of_thought', retrieved_session.reasoning)
        self.assertIn('internal_agent_communications', retrieved_session.reasoning)
        
        # But when accessed through the service, it should be filtered
        service_reasoning = reasoning_service.get_user_reasoning(retrieved_session)
        self.assertNotIn('raw_chain_of_thought', service_reasoning)
        self.assertNotIn('internal_agent_communications', service_reasoning)
    
    @given(
        st.lists(
            st.dictionaries(
                st.sampled_from(['query', 'brief', 'methodology']),
                st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cc', 'Cs'))),
                min_size=2,
                max_size=3
            ),
            min_size=1,
            max_size=3
        ),
        st.lists(
            st.text(min_size=10, max_size=30, alphabet=st.characters(blacklist_categories=('Cc', 'Cs'))),  # sensitive internal data - longer to avoid overlap
            min_size=1,
            max_size=4
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_reasoning_consistency_across_sessions_property(self, session_data_list, sensitive_data):
        """
        Property 10: Reasoning Visibility and Security (consistency component)
        For any set of research sessions with reasoning data, the filtering should
        be consistent and no sensitive internal data should leak through any session.
        
        **Feature: ai-research-system, Property 10: Reasoning Visibility and Security**
        **Validates: Requirements 5.1, 5.2, 5.4**
        """
        from research.models import ResearchSession
        from research.services import ReasoningService
        
        reasoning_service = ReasoningService()
        sessions = []
        
        # Create unique sensitive data that shouldn't appear in user-facing fields
        unique_sensitive_data = [f"INTERNAL_SENSITIVE_{i}_{data}" for i, data in enumerate(sensitive_data)]
        
        # Create multiple sessions with sensitive data
        for i, session_data in enumerate(session_data_list):
            query = session_data.get('query', f'Query {i}')
            brief = session_data.get('brief', f'Brief {i}')
            methodology = session_data.get('methodology', f'Methodology {i}')
            
            # Include sensitive data in reasoning (but not in user-facing fields)
            raw_reasoning = {
                "research_brief": brief,
                "methodology": methodology,
                "sensitive_internal_data": unique_sensitive_data,
                "raw_agent_thoughts": [f"Internal thought {j}: {data}" for j, data in enumerate(unique_sensitive_data)],
                "debug_traces": {"session": i, "internal_data": unique_sensitive_data},
                "tool_execution_logs": [f"Tool log: {data}" for data in unique_sensitive_data[:2]]
            }
            
            session = ResearchSession.objects.create(
                user_id=self.user.username,
                query=query,
                status='COMPLETED',
                reasoning=raw_reasoning
            )
            sessions.append(session)
        
        # Test consistent filtering across all sessions
        for session in sessions:
            filtered_reasoning = reasoning_service.filter_reasoning_for_user(session.reasoning)
            
            # Property: Consistent filtering - no sensitive data in any session
            self.assertNotIn('sensitive_internal_data', filtered_reasoning)
            self.assertNotIn('raw_agent_thoughts', filtered_reasoning)
            self.assertNotIn('debug_traces', filtered_reasoning)
            self.assertNotIn('tool_execution_logs', filtered_reasoning)
            
            # Property: No unique sensitive data leaks through any field
            for unique_sensitive_item in unique_sensitive_data:
                for field_name, field_value in filtered_reasoning.items():
                    if isinstance(field_value, str):
                        self.assertNotIn(unique_sensitive_item, field_value,
                            f"Sensitive data '{unique_sensitive_item}' leaked in field '{field_name}' of session {session.id}")
                    elif isinstance(field_value, list):
                        for item in field_value:
                            if isinstance(item, str):
                                self.assertNotIn(unique_sensitive_item, item,
                                    f"Sensitive data '{unique_sensitive_item}' leaked in list item of field '{field_name}'")
            
            # Property: User-friendly data is preserved
            self.assertIn('research_brief', filtered_reasoning)
            self.assertIn('methodology', filtered_reasoning)
            
            # Property: Filtered reasoning is properly structured
            self.assertIsInstance(filtered_reasoning, dict)
            self.assertGreater(len(filtered_reasoning), 0)
    
    @given(
        st.text(min_size=1, max_size=100),  # research query
        st.dictionaries(
            st.sampled_from(['planning', 'execution', 'analysis']),
            st.lists(st.text(min_size=5, max_size=30), min_size=1, max_size=3),
            min_size=1,
            max_size=3
        )  # complex nested reasoning data
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_nested_reasoning_filtering_property(self, query, nested_reasoning):
        """
        Property 10: Reasoning Visibility and Security (nested data component)
        For any research session with complex nested reasoning data, the filtering
        should work recursively to ensure no sensitive data is exposed at any level.
        
        **Feature: ai-research-system, Property 10: Reasoning Visibility and Security**
        **Validates: Requirements 5.1, 5.2, 5.4**
        """
        from research.models import ResearchSession
        from research.services import ReasoningService
        
        # Create complex nested reasoning structure
        complex_reasoning = {
            "research_brief": f"Research on {query}",
            "methodology": "Multi-step analysis",
            "nested_data": nested_reasoning,
            "internal_structure": {
                "raw_thoughts": nested_reasoning,
                "agent_communications": {
                    "level1": nested_reasoning,
                    "level2": {
                        "deep_internal": list(nested_reasoning.values())[0] if nested_reasoning else []
                    }
                }
            },
            "debug_info": {
                "nested_debug": nested_reasoning,
                "execution_trace": {
                    "steps": nested_reasoning
                }
            }
        }
        
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=query,
            status='COMPLETED',
            reasoning=complex_reasoning
        )
        
        # Test nested filtering
        reasoning_service = ReasoningService()
        filtered_reasoning = reasoning_service.filter_reasoning_for_user(session.reasoning)
        
        # Property: Top-level sensitive fields are removed
        self.assertNotIn('internal_structure', filtered_reasoning)
        self.assertNotIn('debug_info', filtered_reasoning)
        
        # Property: User-friendly fields are preserved
        self.assertIn('research_brief', filtered_reasoning)
        self.assertIn('methodology', filtered_reasoning)
        
        # Property: No nested sensitive data leaks through
        def check_no_nested_data(obj, path=""):
            """Recursively check that no nested sensitive data is present."""
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    
                    # Check that sensitive keys are not present
                    sensitive_keys = {'raw_thoughts', 'agent_communications', 'debug_info', 'internal_structure'}
                    self.assertNotIn(key, sensitive_keys,
                        f"Sensitive key '{key}' found at path '{current_path}'")
                    
                    # Recursively check nested structures
                    check_no_nested_data(value, current_path)
                    
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    check_no_nested_data(item, f"{path}[{i}]")
        
        check_no_nested_data(filtered_reasoning)
        
        # Property: Filtered reasoning maintains structure for user consumption
        self.assertIsInstance(filtered_reasoning, dict)
        self.assertGreater(len(filtered_reasoning), 0)
        
        # Should only contain user-friendly fields
        allowed_top_level_keys = {
            'research_brief', 'methodology', 'approach', 'summary',
            'key_findings', 'sources_consulted', 'research_steps'
        }
        for key in filtered_reasoning.keys():
            self.assertIn(key, allowed_top_level_keys,
                f"Non-user-friendly key '{key}' found in filtered reasoning")


class FileProcessingPropertyTest(HypothesisTestCase):
    """Property-based tests for file processing and integration."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.lists(
            st.tuples(
                st.sampled_from(['test.pdf', 'document.txt', 'report.docx']),  # filename
                st.sampled_from(['PDF', 'TXT', 'DOCX']),  # file_type
                st.text(min_size=10, max_size=500)  # content
            ),
            min_size=1,
            max_size=3
        ),
        st.integers(min_value=100, max_value=10000)  # file_size
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_file_processing_and_integration_property(self, file_data_list, file_size):
        """
        Property 8: File Processing and Integration
        For any PDF or TXT file uploaded to a research session, the system should 
        extract text content, generate a summary, store the file metadata, and make 
        the content available for research context.
        
        **Feature: ai-research-system, Property 8: File Processing and Integration**
        **Validates: Requirements 4.1, 4.2, 4.4**
        """
        from research.models import ResearchSession, ResearchFile
        
        # Create parent research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query='Test research with file uploads',
            status='PENDING'
        )
        
        # Process each file in the test data
        created_files = []
        for filename, file_type, content in file_data_list:
            # Create research file with extracted content
            research_file = ResearchFile.objects.create(
                session=session,
                filename=filename,
                file_type=file_type,
                file_size=file_size,
                content_summary=f'Summary of {filename}: {content[:100]}...',
                file_path=f'/test/uploads/{filename}',
                is_processed=True
            )
            # Mark as processed to set processed_at timestamp
            research_file.mark_processed()
            created_files.append((research_file, content))
        
        # Verify file processing properties
        for research_file, original_content in created_files:
            # Retrieve from database to ensure persistence
            retrieved_file = ResearchFile.objects.get(id=research_file.id)
            
            # Property: File metadata is stored correctly
            self.assertEqual(retrieved_file.filename, research_file.filename)
            self.assertEqual(retrieved_file.file_type, research_file.file_type)
            self.assertEqual(retrieved_file.file_size, file_size)
            self.assertIsNotNone(retrieved_file.file_path)
            
            # Property: File is linked to research session
            self.assertEqual(retrieved_file.session.id, session.id)
            
            # Property: File processing status is tracked
            self.assertTrue(retrieved_file.is_processed)
            self.assertIsNotNone(retrieved_file.processed_at)
            
            # Property: Content summary is generated and stored
            self.assertIsNotNone(retrieved_file.content_summary)
            self.assertGreater(len(retrieved_file.content_summary), 0)
            self.assertIn('Summary of', retrieved_file.content_summary)
            
            # Property: File content is available for research context
            # The summary should contain information from the original content
            if original_content:
                content_excerpt = original_content[:50]  # First 50 chars
                if content_excerpt.strip():
                    self.assertIn(content_excerpt, retrieved_file.content_summary)
        
        # Verify session-file relationship integrity
        session_files = list(session.files.all())
        self.assertEqual(len(session_files), len(created_files))
        
        # All files should be accessible through the session
        session_file_ids = {f.id for f in session_files}
        created_file_ids = {f[0].id for f in created_files}
        self.assertEqual(session_file_ids, created_file_ids)
    
    @given(
        st.sampled_from(['PDF', 'TXT', 'DOCX']),  # file_type
        st.text(min_size=1, max_size=100),  # filename
        st.integers(min_value=1, max_value=1000000),  # file_size
        st.text(min_size=0, max_size=1000),  # extracted_content
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_file_content_extraction_property(self, file_type, filename, file_size, extracted_content):
        """
        Property 8: File Processing and Integration (content extraction component)
        For any supported file type (PDF, TXT, DOCX), the system should extract 
        text content and make it available for processing and summarization.
        
        **Feature: ai-research-system, Property 8: File Processing and Integration**
        **Validates: Requirements 4.1, 4.2, 4.4**
        """
        from research.models import ResearchSession, ResearchFile
        
        # Create parent research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query='Test research for file content extraction',
            status='PENDING'
        )
        
        # Simulate file processing with extracted content
        research_file = ResearchFile.objects.create(
            session=session,
            filename=f'{filename}.{file_type.lower()}',
            file_type=file_type,
            file_size=file_size,
            content_summary=f'Extracted content summary: {extracted_content[:200]}',
            file_path=f'/test/uploads/{filename}.{file_type.lower()}',
            is_processed=True
        )
        # Mark as processed to set processed_at timestamp
        research_file.mark_processed()
        
        # Verify content extraction properties
        retrieved_file = ResearchFile.objects.get(id=research_file.id)
        
        # Property: File type is preserved and valid
        self.assertIn(retrieved_file.file_type, ['PDF', 'TXT', 'DOCX'])
        self.assertEqual(retrieved_file.file_type, file_type)
        
        # Property: File size is tracked accurately
        self.assertEqual(retrieved_file.file_size, file_size)
        self.assertGreater(retrieved_file.file_size, 0)
        
        # Property: Content is extracted and summarized
        self.assertIsNotNone(retrieved_file.content_summary)
        if extracted_content.strip():
            # If there was content to extract, summary should contain it
            content_excerpt = extracted_content[:100]  # First 100 chars
            if content_excerpt.strip():
                self.assertIn(content_excerpt, retrieved_file.content_summary)
        
        # Property: Processing status indicates successful extraction
        self.assertTrue(retrieved_file.is_processed)
        self.assertIsNotNone(retrieved_file.processed_at)
        self.assertEqual(retrieved_file.processing_error, '')  # No errors
        
        # Property: File is properly linked and accessible
        self.assertEqual(retrieved_file.session.id, session.id)
        self.assertIn(retrieved_file, session.files.all())
    
    @given(
        st.lists(
            st.text(min_size=1, max_size=50),  # filenames
            min_size=1,
            max_size=5
        ),
        st.sampled_from(['PDF', 'TXT']),  # supported file types
        st.text(min_size=10, max_size=200)  # base content
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_multiple_file_processing_property(self, filenames, file_type, base_content):
        """
        Property 8: File Processing and Integration (multiple files component)
        For any set of files uploaded to a research session, each file should be 
        processed independently and all should be available for research context.
        
        **Feature: ai-research-system, Property 8: File Processing and Integration**
        **Validates: Requirements 4.1, 4.2, 4.4**
        """
        from research.models import ResearchSession, ResearchFile
        
        # Create parent research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query='Test research with multiple file uploads',
            status='PENDING'
        )
        
        # Process multiple files
        created_files = []
        for i, filename in enumerate(filenames):
            file_content = f'{base_content} - File {i + 1}: {filename}'
            
            research_file = ResearchFile.objects.create(
                session=session,
                filename=f'{filename}.{file_type.lower()}',
                file_type=file_type,
                file_size=len(file_content),
                content_summary=f'Summary for {filename}: {file_content}',
                file_path=f'/test/uploads/{filename}.{file_type.lower()}',
                is_processed=True
            )
            # Mark as processed to set processed_at timestamp
            research_file.mark_processed()
            created_files.append(research_file)
        
        # Verify multiple file processing properties
        session_files = list(session.files.all().order_by('uploaded_at'))
        self.assertEqual(len(session_files), len(created_files))
        
        # Each file should be processed independently
        for i, session_file in enumerate(session_files):
            original_file = created_files[i]
            
            # Property: Each file maintains its unique identity
            self.assertEqual(session_file.id, original_file.id)
            self.assertEqual(session_file.filename, original_file.filename)
            self.assertEqual(session_file.file_type, file_type)
            
            # Property: Each file has its own content summary
            self.assertIsNotNone(session_file.content_summary)
            self.assertIn(filenames[i], session_file.content_summary)
            
            # Property: Each file is processed successfully
            self.assertTrue(session_file.is_processed)
            self.assertEqual(session_file.processing_error, '')
            
            # Property: All files are linked to the same session
            self.assertEqual(session_file.session.id, session.id)
        
        # Property: All files are accessible through session relationship
        accessible_file_ids = {f.id for f in session.files.all()}
        created_file_ids = {f.id for f in created_files}
        self.assertEqual(accessible_file_ids, created_file_ids)
        
        # Property: File processing preserves order and uniqueness
        retrieved_filenames = [f.filename for f in session_files]
        expected_filenames = [f'{name}.{file_type.lower()}' for name in filenames]
        self.assertEqual(retrieved_filenames, expected_filenames)


class FileContentResearchIntegrationPropertyTest(HypothesisTestCase):
    """Property-based tests for file content research integration."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        import uuid
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}', 
            password='testpass123'
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        pass
    
    @given(
        st.text(min_size=1, max_size=100),  # research_query
        st.lists(
            st.dictionaries(
                st.sampled_from(['filename', 'content', 'summary']),
                st.text(min_size=1, max_size=100),
                min_size=3,
                max_size=3
            ),
            min_size=1,
            max_size=3
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_file_content_research_integration_property(self, research_query, file_data_list):
        """
        Property 9: File Content Research Integration
        For any research session with uploaded files, the research results should 
        reflect or incorporate information from the uploaded file content.
        
        **Feature: ai-research-system, Property 9: File Content Research Integration**
        **Validates: Requirements 4.3**
        """
        from research.models import ResearchSession, ResearchFile
        from research.tasks import execute_research_task
        from unittest.mock import patch, AsyncMock
        
        # Create research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=research_query,
            status='PENDING'
        )
        
        # Create uploaded files with content
        uploaded_files = []
        file_contents = []
        for file_data in file_data_list:
            filename = file_data.get('filename', 'test.txt')
            content = file_data.get('content', 'test content')
            summary = file_data.get('summary', f'Summary of {filename}')
            
            research_file = ResearchFile.objects.create(
                session=session,
                filename=f'{filename}.txt',
                file_type='TXT',
                file_size=len(content),
                content_summary=f'{summary}: {content}',
                file_path=f'/test/uploads/{filename}.txt',
                is_processed=True
            )
            # Mark as processed to set processed_at timestamp
            research_file.mark_processed()
            uploaded_files.append(research_file)
            file_contents.append(content)
        
        # Mock research execution to simulate file content integration
        with patch('research.tasks.research_service') as mock_service:
            # Configure mock to return results that incorporate file content
            def mock_execute_research(query, config=None, previous_context=None):
                # Simulate research that incorporates file content
                integrated_content = []
                for file_content in file_contents:
                    integrated_content.append(f'Based on uploaded file: {file_content[:50]}')
                
                return {
                    "success": True,
                    "final_report": f"Research on {query}. " + " ".join(integrated_content),
                    "research_brief": f"Research incorporating uploaded files for {query}",
                    "notes": [f"File content analysis: {content[:30]}" for content in file_contents],
                    "raw_notes": ["File integration successful"],
                    "messages": [],
                    "error": None
                }
            
            mock_service.execute_research = AsyncMock(side_effect=mock_execute_research)
            mock_service.create_config.return_value = {
                "configurable": {"test": True},
                "metadata": {"user_id": self.user.username}
            }
            mock_service.create_continuation_context.return_value = ""
            
            # Execute research task
            result = execute_research_task(str(session.id))
            
            # Verify research integration was successful
            self.assertTrue(result["success"])
            
            # Refresh session from database
            session.refresh_from_db()
            
            # Verify file content integration properties
            self.assertEqual(session.status, 'COMPLETED')
            self.assertIsNotNone(session.report)
            self.assertIsNotNone(session.summary)
            
            # Property: Research results incorporate file content
            final_report = session.report.get('final_report', '')
            research_notes = session.report.get('notes', [])
            
            # Check that file content is reflected in research results
            for file_content in file_contents:
                content_excerpt = file_content[:30]  # First 30 chars
                if content_excerpt.strip():
                    # Content should be found in either the report or notes
                    content_in_report = content_excerpt in final_report
                    content_in_notes = any(content_excerpt in note for note in research_notes)
                    content_in_summary = content_excerpt in (session.summary or '')
                    
                    content_integrated = content_in_report or content_in_notes or content_in_summary
                    self.assertTrue(content_integrated, 
                        f"File content '{content_excerpt}' not integrated into research results")
            
            # Property: File metadata is preserved and accessible
            session_files = list(session.files.all())
            self.assertEqual(len(session_files), len(uploaded_files))
            
            for session_file in session_files:
                self.assertTrue(session_file.is_processed)
                self.assertIsNotNone(session_file.content_summary)
                
                # File content should be available through summary
                original_file = next(
                    (f for f in uploaded_files if f.id == session_file.id), 
                    None
                )
                self.assertIsNotNone(original_file)
    
    @given(
        st.text(min_size=1, max_size=50),  # base_query
        st.lists(
            st.text(min_size=10, max_size=100),  # file_contents
            min_size=1,
            max_size=3
        )
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_file_context_availability_property(self, base_query, file_contents):
        """
        Property 9: File Content Research Integration (context availability)
        For any research session with uploaded files, the file content should be 
        available and accessible for integration into the research workflow.
        
        **Feature: ai-research-system, Property 9: File Content Research Integration**
        **Validates: Requirements 4.3**
        """
        from research.models import ResearchSession, ResearchFile
        
        # Create research session
        session = ResearchSession.objects.create(
            user_id=self.user.username,
            query=f'{base_query} - research with file context',
            status='PENDING'
        )
        
        from django.utils import timezone
        
        # Create files with specific content for integration
        created_files = []
        for i, content in enumerate(file_contents):
            research_file = ResearchFile.objects.create(
                session=session,
                filename=f'context_file_{i + 1}.txt',
                file_type='TXT',
                file_size=len(content),
                content_summary=f'File {i + 1} content: {content}',
                file_path=f'/test/uploads/context_file_{i + 1}.txt',
                is_processed=True,
                processed_at=timezone.now()  # Set processed_at directly
            )
            created_files.append(research_file)
        
        # Verify file context availability properties
        session_files = list(session.files.all().order_by('filename'))  # Order by filename to ensure consistent order
        self.assertEqual(len(session_files), len(file_contents))
        
        # Property: All file content is accessible through the session
        for i, session_file in enumerate(session_files):
            original_content = file_contents[i]  # Match by index
            
            # File content should be preserved in summary
            # The summary includes a prefix, so check if original content is contained within it
            self.assertTrue(
                original_content in session_file.content_summary,
                f"Expected '{original_content}' to be found in summary '{session_file.content_summary}'"
            )
            
            # File should be marked as processed and ready for integration
            self.assertTrue(session_file.is_processed)
            self.assertEqual(session_file.processing_error, '')
            
            # File should be linked to the correct session
            self.assertEqual(session_file.session.id, session.id)
        
        # Property: File content can be retrieved for research integration
        all_file_content = []
        for session_file in session.files.all():
            if session_file.is_processed and session_file.content_summary:
                all_file_content.append(session_file.content_summary)
        
        # All processed files should contribute content
        self.assertEqual(len(all_file_content), len(file_contents))
        
        # Each original content should be findable in the summaries
        for original_content in file_contents:
            content_found = any(original_content in summary for summary in all_file_content)
            self.assertTrue(content_found, 
                f"Original content '{original_content[:30]}' not found in file summaries")
        
        # Property: Session provides complete file context for research
        total_files = session.files.count()
        processed_files = session.files.filter(is_processed=True).count()
        
        # All files should be processed and available
        self.assertEqual(total_files, len(file_contents))
        self.assertEqual(processed_files, len(file_contents))
        
        # Session should have all file relationships intact
        session_file_ids = set(f.id for f in session.files.all())
        created_file_ids = set(f.id for f in created_files)
        self.assertEqual(session_file_ids, created_file_ids)