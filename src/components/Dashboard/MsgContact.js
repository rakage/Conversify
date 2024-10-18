import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../Layout/Sidebar';
import ProfileDropdown from '../Layout/ProfileDropdown';
import { useSelector } from 'react-redux';
import AddMessageForm from './AddMessageForm'; // Import the new component
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MessagesList = () => {
  const [messages, setMessages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMessage, setCurrentMessage] = useState({ id: '', title_message: '', message_text: '', message_media: '', userId: '' });
  const token = useSelector(state => state.auth.token);

  const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000',
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchMessages = async () => {
    try {
      const response = await axiosInstance.get('/message-list');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  useEffect(() => {
    fetchMessages();
  }, []);


  const openEditModal = (message) => {
    setIsEditMode(true);
    setCurrentMessage({ id: message._id, title_message: message.title_message, message_text: message.message_text, message_media: message.message_media, userId: message.userId });
    setIsModalOpen(true);
  };

  
  const notify = (message, type = 'default') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
      default:
        toast(message);
    }
  };

  const handleAddMessage = async (e) => {
    e.preventDefault();
    try {
      const messageForWhatsApp = convertHtmlToWhatsApp(currentMessage.message_text);
      if (!messageForWhatsApp) {
        return notify('Please enter a message text!');
      }

      const response = await axiosInstance.post('/message-list', {
        title_message: currentMessage.title_message,
        message_text: messageForWhatsApp,
        message_media: currentMessage.message_media
      });
      if (response.data === 'Message list added') {
        fetchMessages();
        resetForm();
        toast('Message added successfulleey!');
      }
    } catch (error) {
      console.error('Error adding message:', error);
      alert('Failed to add message. Please try again.');
    }
  };

  const handleUpdateMessage = async (e) => {
    e.preventDefault();
    try {
      const messageForWhatsApp = convertHtmlToWhatsApp(currentMessage.message_text);
      if (!messageForWhatsApp) {
        return notify('Please enter a message text!');
      }

      const response = await axiosInstance.put(`/message-list/${currentMessage.id}`, {
        title_message: currentMessage.title_message,
        message_text: messageForWhatsApp,
        message_media: currentMessage.message_media
      });
      if (response.data) {
        fetchMessages();
        resetForm();
        notify('Message updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      notify('Failed to update message. Please try again.', 'error');
    }
  };
  const convertHtmlToWhatsApp = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const convertNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        let result = '';
        for (let child of node.childNodes) {
          result += convertNode(child);
        }
        switch (node.tagName.toLowerCase()) {
          case 'strong':
          case 'b':
            return `*${result}*`;
          case 'em':
          case 'i':
            return `_${result}_`;
          case 'u':
            return result;
          case 's':
          case 'strike':
            return `~${result}~`;
          case 'code':
            return `\`${result}\``;
          case 'pre':
            return `\`\`\`${result}\`\`\``;
          case 'ol':
            return Array.from(node.childNodes)
              .filter(child => child.tagName && child.tagName.toLowerCase() === 'li')
              .map((li, index) => `${index + 1}. ${convertNode(li)}`)
              .join('\n') + '\n';
          case 'ul':
            return Array.from(node.childNodes)
              .filter(child => child.tagName && child.tagName.toLowerCase() === 'li')
              .map(li => `• ${convertNode(li)}`)
              .join('\n') + '\n';
          case 'blockquote':
            return `> ${result.split('\n').join('\n> ')}\n`;
          case 'p':
            return `${result}\n\n`;
          default:
            return result;
        }
      }
      return '';
    };
    return convertNode(doc.body).trim();
  };
  
  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentMessage({ id: '', title_message: '', message_text: '', message_media: '', userId: '' });
    setIsModalOpen(true);
  };

  const handleDeleteMessage = async (id) => {
    try {
      const response = await axiosInstance.delete(`/message-list/${id}`);
      if (response.data === 'Message list deleted') {
        fetchMessages();
        alert('Message deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setCurrentMessage({ id: '', title_message: '', message_text: '', message_media: '', userId: '' });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-700">Messages</h1>
          <ProfileDropdown />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between mb-4 flex-col md:flex-row">
            <h2 className="text-lg font-semibold text-gray-700">Message List</h2>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2 md:mt-0"
              onClick={openAddModal}
            >
              Add Message
            </button>
          </div>
          <div className="mt-4">
            <ul className="divide-y divide-gray-200">
              {messages.map((message, index) => (
                <li key={message._id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-100 transition duration-200">
                  <div className="flex space-x-3 flex-1">
                    <span className="text-sm font-medium">{index + 1}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-md font-semibold">{message.title_message}</h3>
                          <div dangerouslySetInnerHTML={{ __html: message.message_text }} />
                        </div>
                        <p className="text-sm text-gray-500">{new Date(message.created_at).toLocaleString()}</p>
                      </div>
                      {message.message_media && (
                        <img
                          src={`data:image/png;base64, ${message.message_media}`}
                          alt="Message Media"
                          className="mt-2 w-full max-w-xs"
                          style={{ maxWidth: '50%' }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="ml-4 space-x-2 flex flex-col md:flex-row">
                    <button 
                      onClick={() => openEditModal(message)} 
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteMessage(message._id)} 
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal for adding/updating a message */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-4xl flex">
              <AddMessageForm
                isEditMode={isEditMode}
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                handleAddMessage={handleAddMessage}
                handleUpdateMessage={handleUpdateMessage}
                resetForm={resetForm}
                convertHtmlToWhatsApp={convertHtmlToWhatsApp}
                axiosInstance={axiosInstance}
                fetchMessages={fetchMessages}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesList;
