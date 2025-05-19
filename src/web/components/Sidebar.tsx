import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar = () => (
  <aside className="w-56 bg-gray-900 text-white p-4 space-y-4">
    <NavLink to="/" className="block">Dashboard</NavLink>
    <NavLink to="/live" className="block">Live Gait</NavLink>
    <NavLink to="/progress" className="block">Progress</NavLink>
    <NavLink to="/plan" className="block">Plan Wizard</NavLink>
  </aside>
); 