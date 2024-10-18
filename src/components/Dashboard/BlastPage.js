import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../Layout/Sidebar';
import ProfileDropdown from '../Layout/ProfileDropdown';
import { useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; 

const BlastPage = () => {
    const [messageLists, setMessageLists] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [selectedMessageList, setSelectedMessageList] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectedFlag, setSelectedFlag] = useState(''); // State to hold selected flag
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
    const [flags, setFlags] = useState([]);
    const [blastHistory, setBlastHistory] = useState([]);
    const [scheduleTime, setScheduleTime] = useState(null); // New state for scheduling
    
    const token = useSelector(state => state.auth.token);

    const axiosInstance = axios.create({
        baseURL: 'http://localhost:3000',
        headers: { Authorization: `Bearer ${token}` }
    });

    useEffect(() => {
        fetchMessageLists();
        fetchContacts();
    }, []);

    // setBlastHistory
    useEffect(() => {
        const fetchBlastHistory = async () => {
            try {
                const response = await axiosInstance.get('/blast-history');
                setBlastHistory(response.data);
            } catch (error) {
                console.error('Error fetching blast history:', error);
            }
        };

        fetchBlastHistory();
    }
    , []);

    const fetchMessageLists = async () => {
        try {
            const response = await axiosInstance.get('/message-list');
            setMessageLists(response.data);
        } catch (error) {
            console.error('Error fetching message lists:', error);
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await axiosInstance.get('/contacts');
            setContacts(response.data);
            setFilteredContacts(response.data);

            const uniqueFlags = [...new Set(response.data.map(contact => contact.flag))];
            setFlags(uniqueFlags);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const handleSelectMessageList = (event) => {
        setSelectedMessageList(event.target.value);
    };

    const handleSelectContact = (event) => {
        const contactId = event.target.value;
        const isChecked = event.target.checked;

        if (isChecked) {
            setSelectedContacts([...selectedContacts, contactId]);
        } else {
            setSelectedContacts(selectedContacts.filter(id => id !== contactId));
        }
    };

    const handleFlagChange = (event) => {
        const flag = event.target.value;
        setSelectedFlag(flag);

        if (flag === '') {
            setFilteredContacts(contacts); // Show all contacts
        } else {
            const filtered = contacts.filter(contact => contact.flag === flag);
            setFilteredContacts(filtered);
        }
    };

    const handleBlastMessages = async () => {
        setLoading(true);
        try {
            const payload = {
                messageListId: selectedMessageList,
                contactIds: selectedContacts,
            };

            if (scheduleTime) {
                payload.scheduleTime = scheduleTime.toISOString();
            }

            const response = await axiosInstance.post('/blast', payload);
            console.log('Blast operation response:', response.data);
        } catch (error) {
            console.error('Error blasting messages:', error);
            setErrorMessage('Failed to blast messages. Please try again later.');
        } finally {
            setLoading(false);
            setIsModalOpen(false); // Close the modal after sending
        }
    };

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (!loading) {
            setIsModalOpen(false);
        }
    };

    // Get selected message details
    const selectedMessage = messageLists.find(msg => msg._id === selectedMessageList);

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-700">Blast Messages</h1>
                    <ProfileDropdown />
                </div>

                {/* Message List Section */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold text-gray-700">Message List</h2>
                    <div className="mt-4">
                        <select
                            id="messageList"
                            value={selectedMessageList}
                            onChange={handleSelectMessageList}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            disabled={loading}
                        >
                            <option value="">Select a message template</option>
                            {messageLists.map(messageList => (
                                <option key={messageList._id} value={messageList._id}>{messageList.title_message}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Contacts Section */}
                <div className="bg-white p-4 mt-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold text-gray-700">Select Contacts</h2>
                    <div className="mt-4">
                        <label htmlFor="flagSelect" className="mr-2">Select Flag:</label>
                        <select
                            id="flagSelect"
                            value={selectedFlag}
                            onChange={handleFlagChange}
                            className="border border-gray-300 rounded px-2 py-1 mb-4"
                            disabled={loading}
                        >
                            <option value="">All</option>
                            {flags.map(flag => (
                                <option key={flag} value={flag}>{flag}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                        {filteredContacts.map(contact => (
                            <div key={contact._id}>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        value={contact._id}
                                        checked={selectedContacts.includes(contact._id)}
                                        onChange={handleSelectContact}
                                        disabled={loading}
                                    />
                                    <span className="ml-2">{contact.nama} - {contact.nomor_wa}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}

                {/* Schedule Time Section */}
                <div className="bg-white p-4 mt-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold text-gray-700">Schedule Time</h2>
                    <div className="mt-4">
                        <DatePicker
                            selected={scheduleTime}
                            onChange={(date) => setScheduleTime(date)}
                            showTimeSelect
                            dateFormat="Pp"
                            timeIntervals={1}
                            placeholderText="Select a date and time"
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </div>

                    {/* Send the messagw now option */}
                    <div className="mt-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={!scheduleTime}
                                onChange={() => setScheduleTime(null)}
                                disabled={loading}
                            />
                            <span className="ml-2">Send the message now</span>
                        </label>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={openModal}
                    className={`bg-blue-500 text-white px-4 py-2 rounded mt-4 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={loading || !selectedMessageList || selectedContacts.length === 0}
                >
                    {loading ? 'Sending Messages...' : 'Review & Send Messages'}
                </button>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <h2 className="text-lg font-semibold text-gray-700">Review Your Broadcast</h2>
                            <div className="mt-4">
                                <h3 className="font-semibold">Message Template:</h3>
                                <p>{selectedMessage?.message_text}</p>
                                {selectedMessage?.message_media && (
                                    <div className="mt-2">
                                        <center><img
                                            src={`data:image/jpeg;base64,${selectedMessage.message_media}`}
                                            alt="Message Media"
                                            className="w-32 h-32 object-cover"
                                        /></center>
                                    </div>
                                )}
                                
                                <p className="mt-2">Total Contacts: {selectedContacts.length}</p>
                                <p className="mt-2">Scheduled Time: {scheduleTime ? scheduleTime.toLocaleString() : 'Immediately'}</p>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={closeModal} 
                                    className="bg-gray-300 px-4 py-2 rounded mr-2"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleBlastMessages} 
                                    className={`bg-blue-500 text-white px-4 py-2 rounded ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Messages'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Blast History Section */}
                <div className="bg-white p-4 rounded-lg shadow mt-4">
                    <h2 className="text-lg font-semibold text-gray-700">Messages Sent</h2>
                    {loading ? (
                        <p>Loading blast history...</p>
                    ) : (
                        <div className="mt-4">
                            <table className="min-w-full bg-white border">
                                <thead>
                                    <tr>
                                        <th className="py-2 px-4 border-b">Contact Name</th>
                                        <th className="py-2 px-4 border-b">WhatsApp Number</th>
                                        <th className="py-2 px-4 border-b">Message Content</th>
                                        <th className="py-2 px-4 border-b">Status</th>
                                        <th className="py-2 px-4 border-b">Sent At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blastHistory.length > 0 ? (
                                        blastHistory.map((history, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="py-2 px-4 text-center">{history.contact?.nama || 'Unknown'}</td>
                                                <td className="py-2 px-4 text-center">{history.contact?.nomor_wa || 'Unknown'}</td>
                                                <td className="py-2 px-4 text-center">{history.content}</td>
                                                <td className="py-2 px-4 text-center">
                                                    <span
                                                        className={`${
                                                            history.status === 'read'
                                                                ? 'text-green-600'
                                                                : history.status === 'server'
                                                                ? 'text-blue-600'
                                                                : history.status === 'device'
                                                                ? 'text-yellow-600'
                                                                : 'text-gray-600'
                                                        }`}
                                                    >
                                                        {history.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-4 text-center">{new Date(history.sentAt).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="py-4 text-center text-gray-500">
                                                No messages sent.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BlastPage;
