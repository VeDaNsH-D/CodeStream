import { useState } from 'react';

export function Chat() {
  const [messages, setMessages] = useState([
    { user: 'System', text: 'Welcome to the chat!' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    // This will be connected to WebSockets later.
    // For now, it just demonstrates the UI interaction.
    setMessages([...messages, { user: 'Me', text: newMessage }]);
    setNewMessage('');
  };

  const chatContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    color: '#d4d4d4',
    fontFamily: 'sans-serif',
    fontSize: '14px',
  };

  const messagesContainerStyle = {
    flexGrow: 1,
    padding: '10px',
    overflowY: 'auto',
    borderTop: '1px solid #333',
  };

  const formStyle = {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #333',
  };

  const inputStyle = {
    flexGrow: 1,
    marginRight: '10px',
    background: '#3c3c3c',
    border: '1px solid #555',
    color: '#d4d4d4',
    padding: '5px',
    borderRadius: '3px',
  };

  const buttonStyle = {
    background: '#0e639c',
    border: 'none',
    color: 'white',
    padding: '5px 10px',
    cursor: 'pointer',
    borderRadius: '3px',
  };

  return (
    <div style={chatContainerStyle}>
      <h2 style={{ margin: '10px', fontSize: '14px', fontWeight: 'bold' }}>CHAT</h2>
      <div style={messagesContainerStyle}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#0e639c' }}>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} style={formStyle}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={inputStyle}
          placeholder="Type a message..."
        />
        <button type="submit" style={buttonStyle}>
          Send
        </button>
      </form>
    </div>
  );
}
