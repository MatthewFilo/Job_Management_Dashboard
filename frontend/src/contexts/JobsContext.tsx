import React, { createContext, useContext, useState, useCallback } from 'react';
import { Job, StatusType } from '../types';
import { updateJobStatus, deleteJob as deleteJobApi, createJob as createJobApi } from '../api/jobs';
import { useQueryClient } from '@tanstack/react-query';

interface JobsContextType {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  updatingIds: Set<number>;
  deletingIds: Set<number>;
  creating: boolean;
  handleStatusChange: (jobId: number, newStatus: StatusType) => Promise<void>;
  handleDelete: (jobId: number) => Promise<string | null>;
  createJob: (name: string) => Promise<Job>;
}

const JobsContext = createContext<JobsContextType | null>(null);

export const useJobs = () => {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  return context;
};

interface JobsProviderProps {
  children: React.ReactNode;
}

export const JobsProvider: React.FC<JobsProviderProps> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleStatusChange = useCallback(async (jobId: number, newStatus: StatusType) => {
    try {
      setUpdatingIds(prev => new Set(prev).add(jobId));
      const updated = await updateJobStatus(jobId, newStatus);
      setJobs(prev => prev.map(j => (j.id === jobId ? updated : j)));
      queryClient.invalidateQueries({ queryKey: ['jobsPage'] });
    } finally {
      setUpdatingIds(prev => { 
        const nextSet = new Set(prev); 
        nextSet.delete(jobId); 
        return nextSet; 
      });
    }
  }, [queryClient]);

  const handleDelete = useCallback(async (jobId: number): Promise<string | null> => {
    try {
      setDeletingIds(prev => new Set(prev).add(jobId));
      const deletedName = jobs.find(j => j.id === jobId)?.name || null;
      await deleteJobApi(jobId);
      // Remove the job from local state immediately
      setJobs(prev => prev.filter(j => j.id !== jobId));
      queryClient.invalidateQueries({ queryKey: ['jobsPage'] });
      return deletedName;
    } finally {
      setDeletingIds(prev => { 
        const nextSet = new Set(prev); 
        nextSet.delete(jobId); 
        return nextSet; 
      });
    }
  }, [jobs, queryClient]);

  const createJob = useCallback(async (name: string): Promise<Job> => {
    try {
      setCreating(true);
      const created = await createJobApi(name);
      queryClient.invalidateQueries({ queryKey: ['jobsPage'] });
      return created;
    } finally {
      setCreating(false);
    }
  }, [queryClient]);

  const value: JobsContextType = {
    jobs,
    setJobs,
    updatingIds,
    deletingIds,
    creating,
    handleStatusChange,
    handleDelete,
    createJob,
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};
