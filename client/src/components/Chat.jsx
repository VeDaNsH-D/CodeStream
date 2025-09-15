import { useTranslation } from 'react-i18next';

// This is now a controlled component.
// State is managed by its parent, App.jsx.
export function Chat({ messages, newMessage, onNewMessageChange, onSendMessage }) {
  const { t } = useTranslation();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSendMessage();
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
      <h2 style={{ margin: '10px', fontSize: '14px', fontWeight: 'bold' }}>{t('chat')}</h2>
      <div style={messagesContainerStyle}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#0e639c' }}>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleFormSubmit} style={formStyle}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => onNewMessageChange(e.target.value)}
          style={inputStyle}
          placeholder={t('typeMessage')}
        />
        <button type="submit" style={buttonStyle}>
          {t('send')}
        </button>
      </form>
    </div>
  );
}
