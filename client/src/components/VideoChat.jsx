import React from 'react';

const VideoChat = ({ localVideoRef, remoteVideoRef, onCall, onHangUp, onToggleMic, onToggleCam }) => {
  const videoContainerStyle = {
    display: 'flex',
    gap: '10px',
    padding: '10px',
  };

  const videoStyle = {
    width: '180px',
    height: '135px',
    backgroundColor: 'black',
    border: '1px solid #555',
    borderRadius: '4px',
  };

  const controlsStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px',
    borderTop: '1px solid #333',
  };

  const buttonStyle = {
    background: '#0e639c',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '3px',
    fontSize: '12px'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#d4d4d4', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '10px', fontSize: '14px', fontWeight: 'bold' }}>VIDEO CHAT</h2>
      <div style={videoContainerStyle}>
        <div>
          <video ref={localVideoRef} autoPlay playsInline muted style={videoStyle}></video>
          <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>You</p>
        </div>
        <div>
          <video ref={remoteVideoRef} autoPlay playsInline style={videoStyle}></video>
          <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>Remote</p>
        </div>
      </div>
      <div style={controlsStyle}>
        <button onClick={onCall} style={buttonStyle}>Call</button>
        <button onClick={onHangUp} style={buttonStyle}>Hang Up</button>
        <button onClick={onToggleMic} style={buttonStyle}>Mute Mic</button>
        <button onClick={onToggleCam} style={buttonStyle}>Hide Cam</button>
      </div>
    </div>
  );
};

export default VideoChat;
