// Type definitions for AI Research System

export type ResearchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ResearchSession {
  id: string; // UUID
  query: string;
  status: ResearchStatus;
  report: {
    final_report: string; // Markdown formatted
    sections?: any;
  } | null;
  summary: string;
  reasoning: {
    research_brief: string;
    methodology: string;
    key_findings?: string[];
  } | null;
  token_usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  } | null;
  cost: {
    estimated_cost: number;
    currency: string;
    provider_costs?: Record<string, number>;
  } | null;
  trace_id: string | null;
  trace_url: string | null;
  created_at: string; // ISO datetime
  completed_at: string | null;
  updated_at: string;
  files: ResearchFile[];
  is_continuation: boolean;
  parent_session_id: string | null;
  duration?: string; // e.g., "00:02:30"
}

export interface ResearchFile {
  id: string; // UUID
  filename: string;
  file_type: 'PDF' | 'TXT' | 'DOC' | 'DOCX';
  file_size: number; // bytes
  file_size_mb: number;
  content_summary: string;
  is_processed: boolean;
  processing_error: string;
  uploaded_at: string;
  processed_at: string | null;
}

export interface CostBudget {
  id: string;
  budget_limit: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  current_usage: number;
  usage_percentage: number;
  remaining_budget: number;
  is_over_budget: boolean;
  is_warning_threshold_reached: boolean;
  warning_threshold: number;
  period_start: string;
  period_end: string;
}

export interface ResearchHistoryResponse {
  results: ResearchSession[];
  count: number;
}

export interface CreateResearchRequest {
  query: string;
  parent_research_id?: string;
}

export interface ContinueResearchRequest {
  query: string;
}

