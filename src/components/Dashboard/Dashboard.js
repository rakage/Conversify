import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faUsers, faBox, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import Sidebar from '../Layout/Sidebar';
import ProfileDropdown from '../Layout/ProfileDropdown';

const Dashboard = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-700">Analytics</h1>
          <ProfileDropdown />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-700">Congratulations John! 🎉</h2>
            <p className="text-gray-500">Best seller of the month</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-2">$42.8k</h3>
            <p className="text-gray-500">78% of target 🚀</p>
            <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg">View Sales</button>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-700">Transactions</h2>
            <p className="text-gray-500">Total 48.5% Growth 😎 this month</p>
            <div className="flex justify-between mt-4">
              <div className="text-center">
                <FontAwesomeIcon icon={faShoppingCart} className="text-purple-600 text-2xl" />
                <p className="text-gray-700">Sales</p>
                <p className="text-gray-500">245k</p>
              </div>
              <div className="text-center">
                <FontAwesomeIcon icon={faUsers} className="text-green-600 text-2xl" />
                <p className="text-gray-700">Users</p>
                <p className="text-gray-500">12.5k</p>
              </div>
              <div className="text-center">
                <FontAwesomeIcon icon={faBox} className="text-yellow-600 text-2xl" />
                <p className="text-gray-700">Products</p>
                <p className="text-gray-500">1.54k</p>
              </div>
              <div className="text-center">
                <FontAwesomeIcon icon={faDollarSign} className="text-blue-600 text-2xl" />
                <p className="text-gray-700">Revenue</p>
                <p className="text-gray-500">$88k</p>
              </div>
            </div>
          </div>
          {/* Add more dashboard cards here */}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;