import { Job } from './job.model';

export interface AgentSuggestion {
  label: string;
  reason: string;
  title?: string;
  location?: string;
}

export interface AgentInsight {
  title: string;
  body: string;
}

export interface AgentBrief {
  headline: string;
  summary: string;
  momentumLabel: string;
  focusScore: string;
  insights: AgentInsight[];
  suggestions: AgentSuggestion[];
}

export interface AgentBriefInput {
  goal: string;
  jobs: Job[];
  latestJobs: Job[];
  filters: {
    title: string;
    location: string;
  };
}
