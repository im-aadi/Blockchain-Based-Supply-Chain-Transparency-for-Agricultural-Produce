import React from 'react';
import { Link } from 'react-router-dom';
import { Outlet } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center">
            <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <span className="ml-3 text-3xl font-bold text-gray-900">AgriChain</span>
          </Link>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Agricultural Supply Chain Transparency
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Track your produce from farm to table with blockchain technology
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 AgriChain. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
