import React from 'react';
import { TopBar } from '../components/TopBar';
import { Sidebar } from '../components/Sidebar';
import PatientTable from '../components/PatientTable';

// Placeholder dashboard view
export const Dashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <TopBar title="Dashboard" />
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-medium mb-2">Total Patients</h3>
            <p className="text-3xl font-bold text-blue-400">24</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-medium mb-2">Active Sessions</h3>
            <p className="text-3xl font-bold text-green-400">3</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-medium mb-2">Sensor Status</h3>
            <p className="text-3xl font-bold text-green-400">Connected</p>
          </div>
        </div>
        
        {/* Recent Patients */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Recent Patients</h2>
          <PatientTable onSelect={() => {}} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 