export interface Job {
  title: string;
  company: string;
  location: string;
  url: string;
  source: 'RemoteOK' | 'Remotive' | 'Arbeitnow';
  postedAt: string;
}

export interface JobsResponse {
  total: number;
  page: number;
  totalPages: number;
  jobs: Job[];
}

export interface JobQuery {
  title?: string;
  location?: string;
  page?: number;
  limit?: number;
}
