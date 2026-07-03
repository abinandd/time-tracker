import React, { useState } from 'react';
import OfficeTimeTracker from './OfficeTimeTracker';
import RecentHistory from './RecentHistory';

export default function App() {
  const [page, setPage] = useState('tracker');

  if (page === 'history') {
    return <RecentHistory onBack={() => setPage('tracker')} />;
  }

  return <OfficeTimeTracker onNavigateHistory={() => setPage('history')} />;
}
