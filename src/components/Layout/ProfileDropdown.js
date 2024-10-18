import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center focus:outline-none">
        <img src="https://placehold.co/30x30" alt="Profile" className="w-8 h-8 rounded-full" />
        <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-gray-600" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
          <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Profile</a>
          <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Settings</a>
          <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Logout</a>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
