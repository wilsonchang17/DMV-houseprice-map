import React, { useState, useRef, useEffect } from 'react';
import ChatbotAPI from '../../services/chatbotApi';
import './ChatWidget.css';

// Initialize the API client
const chatbotClient = new ChatbotAPI();

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: 'Ask me something about the database!', sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatboxRef = useRef(null);

  // Scroll to bottom of chat whenever messages change
  useEffect(() => {
    if (chatboxRef.current && isOpen) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text: input, sender: 'user' }]);
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      // Send to API
      const response = await chatbotClient.askQuestion(question);
      
      // Add bot response
      setMessages(prev => [...prev, { text: response.answer, sender: 'bot' }]);
    } catch (error) {
      // Add error message
      setMessages(prev => [...prev, { 
        text: error.message || 'Failed to reach the chatbot service',
        sender: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="chat-widget-container">
      {/* Chat toggle button */}
      <button 
        className="chat-toggle-btn"
        onClick={toggleChat}
      >
        {isOpen ? '✕' : '💬'}
      </button>
      
      {/* Chat panel */}
      <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>Database Assistant</h3>
        </div>
        
        <div className="chat-messages" ref={chatboxRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}-message`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="loader">Thinking...</div>}
        </div>
        
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question..."
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;