import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faTachometerAlt, faEnvelopeOpen, faLock, faPhone } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

const SidebarItem = ({ icon, label, pro, to }) => (
  <Link to={to} className="block"> {/* Use Link component with 'to' prop */}
    <div className="flex items-center justify-between p-2 hover:bg-gray-200 rounded-lg cursor-pointer">
      <div className="flex items-center">
        <FontAwesomeIcon icon={icon} className="text-gray-600" />
        <span className="ml-3 text-gray-700">{label}</span>
      </div>
      {pro && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Pro</span>}
    </div>
  </Link>
);

const Sidebar = () => (
  <aside className="w-64 bg-white p-4 flex flex-col h-screen">
    <div className="flex items-center mb-6">
      <FontAwesomeIcon icon={faTachometerAlt} className="text-purple-600 text-3xl" />
      <span className="ml-3 text-2xl font-bold text-gray-700">CONVERSIFY</span>
    </div>
    <div className="flex-grow overflow-y-auto">
      <SidebarItem icon={faTachometerAlt} label="Dashboards" pro={false} to="/dashboard" />
      <div className="mt-6">
        <h3 className="text-gray-500 text-xs uppercase">Broadcast</h3>
        {/* <SidebarItem icon={faEnvelope} label="Email" pro={true} />
        <SidebarItem icon={faComments} label="Chat" pro={true} />
        <SidebarItem icon={faCalendarAlt} label="Calendar" pro={true} />
        <SidebarItem icon={faColumns} label="Kanban" pro={true} />
        <SidebarItem icon={faCog} label="Account Settings" pro={false} /> */}
        <SidebarItem icon={faEnvelopeOpen} label="Messages" pro={false} to="/msg-contact" />
        <SidebarItem icon={faPhone} label="Contacts" pro={false} to="/contact-list" />
        <SidebarItem icon={faRocket} label="Blast" pro={false} to="/blast" />
        {/* <SidebarItem icon={faEllipsisH} label="Miscellaneous" pro={false} />
        <SidebarItem icon={faCreditCard} label="Cards" pro={false} /> */}
      </div>
      <div className="mt-6">
        <h3 className="text-gray-500 text-xs uppercase">Integrations</h3>
        {/* <SidebarItem icon={faEnvelope} label="Email" pro={true} />
        <SidebarItem icon={faComments} label="Chat" pro={true} />
        <SidebarItem icon={faCalendarAlt} label="Calendar" pro={true} />
        <SidebarItem icon={faColumns} label="Kanban" pro={true} />
        <SidebarItem icon={faCog} label="Account Settings" pro={false} /> */}
        <SidebarItem icon={faLock} label="Connect Whatsapp" pro={false} to="/connect-wa" />
        {/* <SidebarItem icon={faEllipsisH} label="Miscellaneous" pro={false} />
        <SidebarItem icon={faCreditCard} label="Cards" pro={false} /> */}
      </div>
    </div>
  </aside>
);

export default Sidebar;
