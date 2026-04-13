import { Injectable } from '@angular/core';
import {
  AgentBrief,
  AgentBriefInput,
  AgentSuggestion
} from '../models/agent.model';
import { Job } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class CareerAgentService {
  buildBrief(input: AgentBriefInput): AgentBrief {
    const jobs = input.jobs;
    const latestJobs = input.latestJobs;
    const totalVisible = jobs.length;
    const focusScore = this.calculateFocusScore(input);
    const topSource = this.pickTopSource(jobs);
    const commonLocation = this.pickCommonValue(jobs.map(job => job.location), 'Remote');
    const roleSignal = this.pickRoleSignal(jobs);
    const momentumLabel = latestJobs.length >= 12 ? 'High' : latestJobs.length >= 5 ? 'Active' : 'Early';

    return {
      headline: latestJobs.length
        ? `Recent demand is strongest around ${roleSignal} roles from ${topSource}.`
        : 'Sign in and refresh latest jobs to unlock the market pulse.',
      summary: totalVisible
        ? `Your current search surfaced ${totalVisible} visible roles. The assistant sees the best immediate angle in ${commonLocation} opportunities and recommends tightening the title wording before expanding again.`
        : 'The dashboard is ready, but we need live jobs before the copilot can rank patterns and suggest action.',
      momentumLabel,
      focusScore,
      insights: [
        {
          title: 'Goal alignment',
          body: this.buildGoalAlignment(input.goal, jobs, input.filters.title)
        },
        {
          title: 'Market pulse',
          body: latestJobs.length
            ? `${latestJobs.length} jobs landed in the latest feed. ${topSource} is contributing the strongest signal right now, so keep that source in mind when deciding where to apply first.`
            : 'No latest-jobs data is loaded yet. Refresh the feed after login to compare fresh demand against the broader search results.'
        },
        {
          title: 'Application strategy',
          body: `Prioritize roles matching "${roleSignal}" and locations similar to ${commonLocation}. Open the newest postings first, then save broader search variants for page two and beyond.`
        }
      ],
      suggestions: this.buildSuggestions(input, roleSignal, commonLocation, topSource)
    };
  }

  private buildSuggestions(
    input: AgentBriefInput,
    roleSignal: string,
    commonLocation: string,
    topSource: string
  ): AgentSuggestion[] {
    const goal = input.goal.toLowerCase();
    const suggestions: AgentSuggestion[] = [
      {
        label: `Lean into ${roleSignal}`,
        reason: `Most visible matches cluster around ${roleSignal}. Narrowing the title should improve result quality.`,
        title: roleSignal,
        location: input.filters.location || commonLocation
      },
      {
        label: 'Stay remote-first',
        reason: `The backend data shows strong activity in ${commonLocation}. Keep the location filter broad enough to preserve remote opportunities.`,
        title: input.filters.title || roleSignal,
        location: commonLocation
      },
      {
        label: `Scout ${topSource}`,
        reason: `${topSource} appears most often in the current result set, making it the best source to prioritize for quick wins.`,
        title: input.filters.title || roleSignal,
        location: input.filters.location || commonLocation
      }
    ];

    if (goal.includes('frontend')) {
      suggestions.unshift({
        label: 'Target Angular frontend',
        reason: 'Your goal mentions frontend work, so searching directly for Angular roles should reduce noisy matches.',
        title: 'angular frontend developer',
        location: input.filters.location || commonLocation
      });
    } else if (goal.includes('full-stack') || goal.includes('full stack')) {
      suggestions.unshift({
        label: 'Broaden to full-stack',
        reason: 'Your objective points to full-stack work, and broadening the title should catch backend-friendly roles too.',
        title: 'full stack developer',
        location: input.filters.location || commonLocation
      });
    }

    return suggestions.slice(0, 4);
  }

  private calculateFocusScore(input: AgentBriefInput): string {
    const base = Math.min(100, 36 + input.jobs.length * 4 + input.latestJobs.length * 2);
    const goalBonus = input.goal.trim().length > 24 ? 12 : 0;
    const titleBonus = input.filters.title.trim() ? 8 : 0;
    const locationBonus = input.filters.location.trim() ? 8 : 0;

    return `${Math.min(100, base + goalBonus + titleBonus + locationBonus)}%`;
  }

  private pickTopSource(jobs: Job[]): string {
    return this.pickCommonValue(jobs.map(job => job.source), 'multiple sources');
  }

  private pickRoleSignal(jobs: Job[]): string {
    const tokens = jobs
      .flatMap(job => job.title.toLowerCase().split(/[^a-zA-Z+]+/))
      .filter(token => token.length > 3 && !['with', 'from', 'remote'].includes(token));

    return this.pickCommonValue(tokens, 'software');
  }

  private pickCommonValue(values: string[], fallback: string): string {
    if (!values.length) {
      return fallback;
    }

    const counts = values.reduce<Map<string, number>>((acc, value) => {
      acc.set(value, (acc.get(value) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])[0]?.[0] ?? fallback;
  }

  private buildGoalAlignment(goal: string, jobs: Job[], activeTitle: string): string {
    const normalizedGoal = goal.toLowerCase();
    const matchingJobs = jobs.filter(job => normalizedGoal
      .split(/\s+/)
      .some(term => term.length > 3 && job.title.toLowerCase().includes(term)));

    if (!jobs.length) {
      return 'Once the jobs feed is loaded, this panel will compare your stated goal against title patterns and suggest tighter search wording.';
    }

    if (!matchingJobs.length) {
      return `Your goal is broader than the current "${activeTitle || 'open'}" search. Try the recommended variants below to close the gap.`;
    }

    return `${matchingJobs.length} visible jobs line up directly with the goal language. That is a healthy signal that the current search direction is viable.`;
  }
}
