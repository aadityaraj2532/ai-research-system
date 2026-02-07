"""
Django management command to test research execution with LangSmith tracing.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from research.models import ResearchSession
from research.tasks import execute_research_task
import uuid


class Command(BaseCommand):
    help = 'Test research execution with LangSmith tracing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--query',
            type=str,
            default='What is artificial intelligence?',
            help='Research query to test with'
        )
        parser.add_argument(
            '--user-id',
            type=str,
            default='test_user',
            help='User ID for the test session'
        )

    def handle(self, *args, **options):
        query = options['query']
        user_id = options['user_id']
        
        self.stdout.write(
            self.style.SUCCESS('🚀 Testing Research Execution with LangSmith Tracing')
        )
        self.stdout.write('=' * 60)
        
        # Create a test research session
        session = ResearchSession.objects.create(
            user_id=user_id,
            query=query,
            status='PENDING'
        )
        
        self.stdout.write(f"📝 Created test session: {session.id}")
        self.stdout.write(f"🔍 Query: {query}")
        self.stdout.write(f"👤 User: {user_id}")
        
        # Execute the research task
        self.stdout.write("\n🔄 Executing research task...")
        self.stdout.write("⚠️  Note: This will make actual API calls and will be traced in LangSmith")
        
        try:
            # Execute the task synchronously for testing
            result = execute_research_task(str(session.id))
            
            if result['success']:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Research completed successfully!")
                )
                self.stdout.write(f"📊 Session ID: {result['session_id']}")
                self.stdout.write(f"📈 Status: {result['status']}")
                
                # Refresh session from database
                session.refresh_from_db()
                
                if session.langsmith_trace_id:
                    self.stdout.write(f"🔗 LangSmith Trace ID: {session.langsmith_trace_id}")
                    self.stdout.write(
                        f"🌐 View trace at: https://smith.langchain.com/o/ai-research-system"
                    )
                
                self.stdout.write(f"📝 Summary: {session.summary[:200]}...")
                
            else:
                self.stdout.write(
                    self.style.ERROR(f"❌ Research failed: {result['error']}")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Task execution failed: {e}")
            )
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("🏁 Test Complete")
        self.stdout.write(
            "📊 Check your LangSmith dashboard to see the traced LLM runs:"
        )
        self.stdout.write("🔗 https://smith.langchain.com/")