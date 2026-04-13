import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AgentBrief, AgentSuggestion } from '../../core/models/agent.model';
import { Job, JobQuery, JobsResponse } from '../../core/models/job.model';
import { AuthService } from '../../core/services/auth.service';
import { CareerAgentService } from '../../core/services/career-agent.service';
import { JobsService } from '../../core/services/jobs.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly jobsService = inject(JobsService);
  private readonly careerAgentService = inject(CareerAgentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly authMode = signal<'login' | 'signup'>('login');
  protected readonly submittingAuth = signal(false);
  protected readonly authError = signal('');
  protected readonly jobsLoading = signal(false);
  protected readonly latestLoading = signal(false);
  protected readonly jobsError = signal('');
  protected readonly latestError = signal('');
  protected readonly currentPage = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly totalJobs = signal(0);
  protected readonly jobs = signal<Job[]>([]);
  protected readonly latestJobs = signal<Job[]>([]);
  protected readonly assistantGoal = signal(
    'Find remote full-stack roles with strong recent activity and shortlist the most promising leads.'
  );

  protected readonly authForm = this.formBuilder.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  protected readonly filtersForm = this.formBuilder.nonNullable.group({
    title: ['frontend developer'],
    location: ['remote'],
    limit: [12]
  });

  protected readonly assistantForm = this.formBuilder.nonNullable.group({
    goal: [this.assistantGoal(), [Validators.required, Validators.minLength(12)]]
  });

  protected readonly user = this.authService.user;
  protected readonly isAuthenticated = computed(() => this.user() !== null);
  protected readonly highlightedJob = computed(() => this.latestJobs()[0] ?? this.jobs()[0] ?? null);
  protected readonly dashboardReady = computed(
    () => this.isAuthenticated() && (this.jobs().length > 0 || this.latestJobs().length > 0)
  );
  protected readonly filterSummary = computed(() => {
    const title = this.filtersForm.controls.title.value.trim() || 'all roles';
    const location = this.filtersForm.controls.location.value.trim() || 'all locations';

    return `${title} in ${location}`;
  });

  protected readonly jobInsights = computed<AgentBrief>(() =>
    this.careerAgentService.buildBrief({
      goal: this.assistantGoal(),
      jobs: this.jobs(),
      latestJobs: this.latestJobs(),
      filters: {
        title: this.filtersForm.controls.title.value,
        location: this.filtersForm.controls.location.value
      }
    })
  );

  constructor() {
    if (this.isAuthenticated()) {
      this.loadDashboard();
    }
  }

  protected setAuthMode(mode: 'login' | 'signup'): void {
    this.authMode.set(mode);
    this.authError.set('');

    const nameControl = this.authForm.controls.name;
    if (mode === 'signup') {
      nameControl.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      nameControl.clearValidators();
    }

    nameControl.updateValueAndValidity();
  }

  protected submitAuth(): void {
    if (this.authMode() === 'signup') {
      this.authForm.controls.name.addValidators([Validators.required, Validators.minLength(2)]);
      this.authForm.controls.name.updateValueAndValidity();
    }

    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    this.submittingAuth.set(true);
    this.authError.set('');

    const { name, email, password } = this.authForm.getRawValue();
    const request$ = this.authMode() === 'signup'
      ? this.authService.signup({ name, email, password })
      : this.authService.login({ email, password });

    request$
      .pipe(
        finalize(() => this.submittingAuth.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.authForm.patchValue({ password: '' });
          this.loadDashboard();
        },
        error: (error: HttpErrorResponse) => {
          this.authError.set(error.error?.message ?? 'Unable to authenticate right now.');
        }
      });
  }

  protected logout(): void {
    this.authService.logout();
    this.jobs.set([]);
    this.latestJobs.set([]);
    this.totalJobs.set(0);
    this.totalPages.set(1);
    this.currentPage.set(1);
    this.jobsError.set('');
    this.latestError.set('');
  }

  protected searchJobs(page = 1): void {
    if (!this.isAuthenticated()) {
      return;
    }

    this.currentPage.set(page);
    this.jobsLoading.set(true);
    this.jobsError.set('');

    const query: JobQuery = {
      title: this.filtersForm.controls.title.value.trim(),
      location: this.filtersForm.controls.location.value.trim(),
      page,
      limit: this.filtersForm.controls.limit.value
    };

    this.jobsService
      .getJobs(query)
      .pipe(
        finalize(() => this.jobsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: JobsResponse) => {
          this.jobs.set(response.jobs);
          this.totalJobs.set(response.total);
          this.totalPages.set(Math.max(1, response.totalPages));
        },
        error: (error: HttpErrorResponse) => {
          this.jobsError.set(error.error?.message ?? 'Unable to load jobs right now.');
        }
      });
  }

  protected loadLatestJobs(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    this.latestLoading.set(true);
    this.latestError.set('');

    this.jobsService
      .getLatestJobs()
      .pipe(
        finalize(() => this.latestLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: latestJobs => {
          this.latestJobs.set(latestJobs);
        },
        error: (error: HttpErrorResponse) => {
          this.latestError.set(error.error?.message ?? 'Unable to load the latest jobs.');
        }
      });
  }

  protected applyAgentSuggestion(suggestion: AgentSuggestion): void {
    const title = suggestion.title ?? this.filtersForm.controls.title.value;
    const location = suggestion.location ?? this.filtersForm.controls.location.value;

    this.filtersForm.patchValue({ title, location });
    this.searchJobs(1);
  }

  protected refreshAgentGoal(): void {
    if (this.assistantForm.invalid) {
      this.assistantForm.markAllAsTouched();
      return;
    }

    this.assistantGoal.set(this.assistantForm.controls.goal.value.trim());
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.searchJobs(this.currentPage() + 1);
    }
  }

  protected previousPage(): void {
    if (this.currentPage() > 1) {
      this.searchJobs(this.currentPage() - 1);
    }
  }

  protected trackJob(_: number, job: Job): string {
    return job.url;
  }

  protected trackByInsight(_: number, insight: { title: string }): string {
    return insight.title;
  }

  protected trackBySuggestion(_: number, suggestion: AgentSuggestion): string {
    return suggestion.label;
  }

  private loadDashboard(): void {
    this.searchJobs(1);
    this.loadLatestJobs();
  }
}
