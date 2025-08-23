import client from './client';
import { Job, StatusType, JobStatus } from '../types';
import { ensurePageSize } from '../utils/cursor';

export type Paginated<T> = {
  results: T[];
  next: string | null;
  previous: string | null;
};

/**
 * Fetch jobs with pagination (page_size enforced) and optional prefix search.
 * - path: relative list path or cursor (defaults to '/jobs/')
 * - options.q: prefix query to filter by name
 * - options.signal: AbortSignal to cancel the request
 */
export async function listJobs(
  path?: string,
  options?: { q?: string | null; signal?: AbortSignal }
): Promise<Paginated<Job>> {
  // Start from a path with page_size ensured
  const basePath = ensurePageSize(path || '/jobs/');

  // Use URL to safely manipulate query params on a relative path (dummy origin required)
  const url = new URL(basePath, 'http://dummy');
  if (options?.q) url.searchParams.set('q', options.q);

  const qs = url.searchParams.toString();
  const requestPath = qs ? `${url.pathname}?${qs}` : url.pathname;

  const res = await client.get<Paginated<Job>>(requestPath, { signal: options?.signal });
  return res.data;
}

export async function createJob(name: string): Promise<Job> {
  const res = await client.post<Job>('/jobs/', { name });
  return res.data;
}

export async function updateJobStatus(jobId: number, status: StatusType): Promise<Job> {
  const res = await client.post<Job>(`/jobs/${jobId}/status/`, { status_type: status });
  return res.data;
}

export async function deleteJob(jobId: number): Promise<void> {
  await client.delete(`/jobs/${jobId}/`);
}

// New: fetch a single job by id
export async function getJob(jobId: number): Promise<Job> {
  const res = await client.get<Job>(`/jobs/${jobId}/`);
  return res.data;
}

// New: fetch job status history
export async function getJobHistory(jobId: number): Promise<{ job: Job; results: JobStatus[] }> {
  const res = await client.get<{ job: Job; results: JobStatus[] }>(`/jobs/${jobId}/history/`);
  return res.data;
}
