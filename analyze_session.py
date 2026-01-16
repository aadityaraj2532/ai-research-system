"""Analyze a specific research session to understand what happened"""
import os
import django
import json
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_research_system.settings.development')
django.setup()

from research.models import ResearchSession, ResearchCost

def analyze_session(session_id):
    """Analyze a research session and provide detailed information"""
    try:
        session = ResearchSession.objects.get(id=session_id)
    except ResearchSession.DoesNotExist:
        print(f"❌ Session {session_id} not found")
        return
    
    print("=" * 70)
    print("RESEARCH SESSION ANALYSIS")
    print("=" * 70)
    print(f"\n📋 Session ID: {session.id}")
    print(f"📝 Query: {session.query}")
    print(f"📊 Status: {session.status}")
    print(f"📅 Created: {session.created_at}")
    print(f"✅ Completed: {session.completed_at or 'Not completed'}")
    
    # Check for cost data
    try:
        cost = ResearchCost.objects.get(session=session)
        print(f"\n💰 Cost: ${cost.estimated_cost}")
        print(f"🔢 Tokens: {cost.total_tokens} (Input: {cost.input_tokens}, Output: {cost.output_tokens})")
    except ResearchCost.DoesNotExist:
        print("\n❌ No cost data available")
    
    # Analyze report
    print("\n" + "=" * 70)
    print("REPORT ANALYSIS")
    print("=" * 70)
    
    if session.report:
        final_report = session.report.get('final_report', '')
        notes = session.report.get('notes', [])
        
        if final_report:
            print(f"✅ Final Report: {len(final_report)} characters")
            print(f"\nFirst 300 characters:")
            print("-" * 70)
            print(final_report[:300])
            print("-" * 70)
        else:
            print("❌ Final Report: EMPTY")
        
        print(f"\n📝 Notes: {len(notes)} items")
        if notes and len(notes) > 0:
            print(f"First note preview:")
            note_text = notes[0] if isinstance(notes[0], str) else json.dumps(notes[0])
            print(note_text[:200])
    else:
        print("❌ No report data")
    
    # Analyze reasoning
    print("\n" + "=" * 70)
    print("REASONING ANALYSIS")
    print("=" * 70)
    
    if session.reasoning:
        research_brief = session.reasoning.get('research_brief', '')
        methodology = session.reasoning.get('methodology', '')
        messages = session.reasoning.get('internal_agent_communications', [])
        
        if research_brief:
            print(f"✅ Research Brief: {len(research_brief)} characters")
            print(f"   {research_brief[:200]}")
        else:
            print("❌ Research Brief: EMPTY")
        
        print(f"\n🔧 Methodology: {methodology}")
        print(f"\n💬 Messages: {len(messages)} items")
        
        if messages:
            print("\nMessage Flow:")
            for i, msg in enumerate(messages, 1):
                if isinstance(msg, dict):
                    msg_type = msg.get('type', 'unknown')
                    content = msg.get('content', '')
                    print(f"\n  {i}. [{msg_type.upper()}]")
                    print(f"     {content[:150]}{'...' if len(content) > 150 else ''}")
        
        # Check for clarification
        if messages and len(messages) > 0:
            last_msg = messages[-1]
            if isinstance(last_msg, dict):
                content = last_msg.get('content', '')
                if '?' in content and last_msg.get('type') == 'ai':
                    print("\n⚠️  CLARIFICATION DETECTED!")
                    print("   The agent asked a clarifying question instead of doing research.")
                    print(f"   Question: {content[:200]}")
    else:
        print("❌ No reasoning data")
    
    # Diagnosis
    print("\n" + "=" * 70)
    print("DIAGNOSIS")
    print("=" * 70)
    
    has_report = session.report and session.report.get('final_report')
    has_brief = session.reasoning and session.reasoning.get('research_brief')
    has_notes = session.report and len(session.report.get('notes', [])) > 0
    
    if has_report:
        print("✅ This session has a complete report")
        print("   The research was successful and generated content.")
    elif not has_report and not has_brief and not has_notes:
        print("❌ This session has NO research output")
        if session.reasoning and session.reasoning.get('internal_agent_communications'):
            messages = session.reasoning['internal_agent_communications']
            if messages and len(messages) > 0:
                last_msg = messages[-1]
                if isinstance(last_msg, dict) and '?' in last_msg.get('content', ''):
                    print("   CAUSE: The agent asked for clarification instead of doing research")
                    print("   FIX: The code has been updated to disable clarification by default")
                    print("   ACTION: Submit a new research query to get a proper report")
        else:
            print("   CAUSE: Unknown - research may have failed silently")
            print("   ACTION: Check logs for errors")
    else:
        print("⚠️  This session has partial output")
        print("   Some data was generated but the report is incomplete.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        session_id = sys.argv[1]
    else:
        # Use the problematic session from the issue
        session_id = "36e85739-d1be-4f2d-8fac-865f81d98a3f"
        print(f"No session ID provided, using default: {session_id}\n")
    
    analyze_session(session_id)
