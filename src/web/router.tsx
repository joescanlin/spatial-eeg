import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './views/Dashboard';
import LiveGait from './views/LiveGait';
import Progress from './views/Progress';
import PlanWizard from './views/PlanWizard';

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/live', element: <LiveGait /> },
  { path: '/progress', element: <Progress /> },
  { path: '/plan', element: <PlanWizard /> },
]);

export default router; 