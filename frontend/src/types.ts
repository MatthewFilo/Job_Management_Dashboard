export type StatusType = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type CurrentStatus = {
  status_type: StatusType | null;
  timestamp: string | null;
};

export type Job = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  current_status: CurrentStatus;
};

export type JobStatus = {
  id: number;
  job: number;
  status_type: StatusType;
  timestamp: string;
};
