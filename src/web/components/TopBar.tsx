import React from 'react';

interface TopBarProps {
  title: string;
  showSearch?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, showSearch = true }) => {
  return (
    <header className="w-full bg-gray-800 text-white p-4 flex items-center justify-between shadow">
      <h1 className="text-xl font-semibold">{title}</h1>
      {showSearch && (
        <input
          type="text"
          placeholder="Search..."
          className="bg-gray-700 text-sm px-3 py-1 rounded-md focus:outline-none"
        />
      )}
    </header>
  );
}; 