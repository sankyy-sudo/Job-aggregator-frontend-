import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Job, JobQuery, JobsResponse } from '../models/job.model';

import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/jobs`;

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);

  getJobs(query: JobQuery) {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    });

    return this.http.get<JobsResponse>(API_URL, { params });
  }

  getLatestJobs() {
    return this.http.get<Job[]>(`${API_URL}/latest`);
  }
}
