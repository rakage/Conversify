import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Sidebar from '../Layout/Sidebar';
import ProfileDropdown from '../Layout/ProfileDropdown';
import { useSelector } from 'react-redux';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const ContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility
  const [isEditMode, setIsEditMode] = useState(false); // State to toggle between add/edit mode
  const [currentContact, setCurrentContact] = useState({ id: '', nama: '', nomor_wa: '', flag: '' }); // Form state
  const [importLoading, setImportLoading] = useState(false); // Loading state for importing contacts
  const token = useSelector(state => state.auth.token);

  const fileInputRef = useRef(); // Ref for the hidden file input

  const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000',
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axiosInstance.get('/contacts');
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentContact((prevContact) => ({ ...prevContact, [name]: value }));
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/contacts', currentContact);
      if (response.data === 'Contact added') {
        fetchContacts();
        resetForm();
        alert('Contact added successfully!');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact. Please try again.');
    }
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.put(`/contacts/${currentContact.id}`, currentContact);
      if (response.data) {
        fetchContacts();
        resetForm();
        alert('Contact updated successfully!');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact. Please try again.');
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      const response = await axiosInstance.delete(`/contacts/${id}`);
      if (response.data === 'Contact deleted') {
        fetchContacts();
        alert('Contact deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const formattedContacts = json.map(contact => ({
        nama: contact.nama,
        nomor_wa: contact.nomor_wa,
        flag: contact.flag
      }));

      importContacts(formattedContacts);
    };
    reader.readAsArrayBuffer(file);
  };

  const importContacts = async (contactsToImport) => {
    try {
      await Promise.all(contactsToImport.map(contact => axiosInstance.post('/contacts', contact)));
      fetchContacts();
      alert('Contacts imported successfully!');
    } catch (error) {
      console.error('Error importing contacts:', error);
      alert('Failed to import contacts. Please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentContact({ id: '', nama: '', nomor_wa: '', flag: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (contact) => {
    setIsEditMode(true);
    setCurrentContact(contact);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setCurrentContact({ id: '', nama: '', nomor_wa: '', flag: '' });
  };

  // Handle the custom button click to open the file input dialog
  const handleImportButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-700">Contact Lists</h1>
          <ProfileDropdown />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Contacts</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleImportButtonClick}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring focus:ring-green-300"
                disabled={importLoading}
              >
                {importLoading ? 'Importing...' : 'Import from Excel'}
              </button>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                disabled={importLoading}
              />
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                onClick={openAddModal}
              >
                Add Contact
              </button>
            </div>
          </div>
          <div className="mt-4">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">WhatsApp Number</th>
                  <th className="py-2 px-4 border-b">Flag</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.nomor_wa} className="border-b">
                    <td className="py-2 px-4"><center>{contact.nama}</center></td>
                    <td className="py-2 px-4"><center>{contact.nomor_wa}</center></td>
                    <td className="py-2 px-4"><center>{contact.flag}</center></td>
                    
                      <td className="py-2 px-4">
                      <center>
                        <button 
                          onClick={() => openEditModal(contact)} 
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact._id)} 
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 ml-2"
                        >
                          Delete
                        </button>
                    </center>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-xl font-semibold mb-4">{isEditMode ? 'Update Contact' : 'Add New Contact'}</h2>
              <form onSubmit={isEditMode ? handleUpdateContact : handleAddContact}>
                <div className="mb-4">
                  <label className="block text-gray-700">Name</label>
                  <input
                    type="text"
                    name="nama"
                    value={currentContact.nama}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">WhatsApp Number</label>
                  <PhoneInput
                    name="nomor_wa"
                    value={currentContact.nomor_wa}
                    onChange={(value) => setCurrentContact((prevContact) => ({ ...prevContact, nomor_wa: value }))}
                    defaultCountry="ID"
                    inputStyle={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    containerStyle={{ width: '100%' }}
                    dropdownStyle={{ width: '100%' }}
                    inputClass="w-full"
                    containerClass="w-full"
                    dropdownClass="w-full"
                    required
                    />
                  {/* <input
                    type="text"
                    name="nomor_wa"
                    value={currentContact.nomor_wa}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
                    required
                  /> */}
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Flag</label>
                  <input
                    type="text"
                    name="flag"
                    value={currentContact.flag}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mr-2 px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {isEditMode ? 'Update Contact' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContactList;
