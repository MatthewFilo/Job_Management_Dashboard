import React, { useEffect, useState } from 'react';
import { Layout, SearchBar, JobForm, JobsList, NotificationManager } from './components';
import { JobsProvider, useJobs } from './contexts/JobsContext';
import { useJobsManagement, useTheme } from './hooks';

const JobsDashboard: React.FC = () => {
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const { jobs, setJobs, creating, createJob, handleDelete } = useJobs();
  const {
    loading,
    loadingMore,
    error,
    setError,
    query,
    setQuery,
    next,
    prev,
    page,
    hasMultiPage,
    fetchJobs,
    repopulateCurrentPage,
    goNext,
    goPrev,
  } = useJobsManagement();


  // Load jobs when component mounts or query changes
  useEffect(() => {
    fetchJobs(setJobs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchJobs(setJobs);
    } finally {
      setRefreshing(false);
    }
  };


  const handleCreateJob = async (name: string) => {
    try {
      setError(null);
      const created = await createJob(name);
      await repopulateCurrentPage(setJobs);
      setSuccess(`Job "${created.name}" created`);
    } catch (e: any) {
      setError(e?.message || 'Failed to create job');
    }
  };

  const handleDeleteJob = async (jobId: number): Promise<string | null> => {
    try {
      setError(null);
      const deletedName = await handleDelete(jobId);
      await repopulateCurrentPage(setJobs);
      setSuccess(deletedName ? `Job "${deletedName}" deleted` : 'Job deleted');
      return deletedName;
    } catch (e: any) {
      setError(e?.message || 'Failed to delete job');
      return null;
    }
  };

  return (
    <>
      <NotificationManager
        error={error}
        success={success}
        refreshing={refreshing}
        onClearError={() => setError(null)}
        onClearSuccess={() => setSuccess(null)}
      />
      
      <SearchBar query={query} onQueryChange={setQuery} />
      
      <JobForm
        onCreateJob={handleCreateJob}
        onRefresh={handleRefresh}
        creating={creating}
        loading={loading}
      />
      
      <JobsList
        jobs={jobs}
        loading={loading}
        loadingMore={loadingMore}
        page={page}
        hasPrev={!!prev}
        hasNext={!!next}
        hasMultiPage={hasMultiPage}
        onPrev={() => goPrev(setJobs)}
        onNext={() => goNext(setJobs)}
        onDelete={handleDeleteJob}
      />
    </>
  );
};

function App() {
  const { mode, toggleMode } = useTheme();

  return (
    <JobsProvider>
      <Layout mode={mode} onToggleMode={toggleMode}>
        <JobsDashboard />
      </Layout>
    </JobsProvider>
  );
}

export default App;