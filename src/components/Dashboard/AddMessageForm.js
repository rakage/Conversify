import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const AddMessageForm = ({
  isEditMode,
  currentMessage,
  setCurrentMessage,
  handleAddMessage,
  handleUpdateMessage,
  resetForm,
  convertHtmlToWhatsApp,
  axiosInstance,
  fetchMessages
}) => {
  const quillRef = useRef();
  const [aiMessageIdea, setAiMessageIdea] = useState('');
  const [loading, setLoading] = useState(false);

  const modules = {
    toolbar: [
      ['bold', 'italic', 'strike'], // toggled buttons
      ['blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }] // remove formatting button
    ]
  };

  const formats = ['bold', 'italic', 'strike', 'blockquote', 'list'];

  const handleQuillChange = (content) => {
    setCurrentMessage((prevMessage) => ({ ...prevMessage, message_text: content }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentMessage((prevMessage) => ({
          ...prevMessage,
          message_media: reader.result.split(',')[1],
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchAiMessageIdea = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/chatbot-ai', { prompt: 'Generate a message blast idea.' });
      setAiMessageIdea(response.data.message);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching AI message idea:', error);
      alert('Failed to fetch message idea.');
      setLoading(false);
    }
  };

  const insertAiIdeaIntoEditor = () => {
    const quill = quillRef.current.getEditor();
    quill.clipboard.dangerouslyPasteHTML(aiMessageIdea);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white shadow-md rounded-lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column for message input */}
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">{isEditMode ? 'Update Message' : 'Add New Message'}</h2>
          <form onSubmit={isEditMode ? handleUpdateMessage : handleAddMessage}>
            <div className="mb-4">
              <label className="block text-gray-700">Message Title</label>
              <input
                type="text"
                value={currentMessage.title_message}
                onChange={(e) => setCurrentMessage({ ...currentMessage, title_message: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Message Text</label>
              <ReactQuill
                ref={quillRef}
                value={currentMessage.message_text}
                onChange={handleQuillChange}
                theme="snow"
                modules={modules}
                formats={formats}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Upload Media</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
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
                {isEditMode ? 'Update Message' : 'Add Message'}
              </button>
            </div>
          </form>
        </div>

        {/* Right column for AI Chatbot */}
        <div className="p-4 border rounded-lg bg-white">
          <h3 className="text-lg font-bold mb-2">AI Chatbot for Message Ideas</h3>
          <textarea
            className="w-full p-2 border rounded mb-4 resize-none"
            rows="4"
            placeholder="Enter your idea or prompt here..."
            onChange={(e) => setAiMessageIdea(e.target.value)}
            style={{ wordWrap: 'break-word' }}
          />
          <button
            onClick={fetchAiMessageIdea}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4 w-full"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Get AI Message Idea'}
          </button>
          {aiMessageIdea && (
            <div className="bg-gray-100 p-3 rounded mb-4">
              <h4 className="text-md font-semibold">AI Idea:</h4>
              <p className="p-2 bg-white rounded mb-4" style={{ wordWrap: 'break-word' }}>{aiMessageIdea}</p>
              <button
                onClick={insertAiIdeaIntoEditor}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 w-full"
              >
                Insert into Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddMessageForm;
