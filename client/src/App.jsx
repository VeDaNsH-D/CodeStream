import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Layout } from './components/Layout';
import { FileExplorer } from './components/FileExplorer';
import { Terminal } from './components/Terminal';
import { Chat } from './components/Chat';

function App() {
  // Editor State
  const [code, setCode] = useState('// Connecting to server...');

  // User & Connection State
  const [userId, setUserId] = useState(null);
  const wsRef = useRef(null);

  // Editor Refs & State
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteCursors = useRef(new Map());
  const ignoreChangeEvent = useRef(false);
  const throttleTimeout = useRef(null);

  // Chat State
  const [messages, setMessages] = useState([
    { user: 'System', text: 'Welcome!' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => console.log('Connected to WebSocket server');

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setUserId(null);
      if(editorRef.current) {
        const allDecorations = Array.from(remoteCursors.current.values()).flat();
        editorRef.current.deltaDecorations(allDecorations, []);
      }
      remoteCursors.current.clear();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      switch (message.type) {
        case 'ID_ASSIGN':
          setUserId(message.payload);
          break;
        case 'CONTENT_UPDATE':
          if (editor && editor.getValue() !== message.payload) {
            const currentPosition = editor.getPosition();
            ignoreChangeEvent.current = true;
            editor.setValue(message.payload);
            if (currentPosition) editor.setPosition(currentPosition);
            setCode(message.payload);
          }
          break;
        case 'CURSOR_UPDATE':
          if (editor && monaco && message.payload.userId !== userId) {
            const { userId: remoteUserId, position } = message.payload;
            const oldDecorations = remoteCursors.current.get(remoteUserId) || [];
            const newDecorations = [{ range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1), options: { className: 'remote-cursor', hoverMessage: { value: `User: ${remoteUserId.substring(0, 4)}` } } }];
            const newDecorationIds = editor.deltaDecorations(oldDecorations, newDecorations);
            remoteCursors.current.set(remoteUserId, newDecorationIds);
          }
          break;
        case 'NEW_CHAT_MESSAGE':
          setMessages(prevMessages => [...prevMessages, message.payload]);
          break;
        case 'USER_DISCONNECTED':
            const { userId: disconnectedUserId } = message.payload;
            const oldDecorations = remoteCursors.current.get(disconnectedUserId) || [];
            if (editor && oldDecorations.length > 0) {
              editor.deltaDecorations(oldDecorations, []);
              remoteCursors.current.delete(disconnectedUserId);
            }
            break;
      }
    };

    return () => ws.close();
  }, [userId]);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition(handleCursorChange);
  }

  function handleCursorChange(event) {
    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    throttleTimeout.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === 1 && userId) {
        wsRef.current.send(JSON.stringify({ type: 'CURSOR_CHANGE', payload: { userId, position: event.position } }));
      }
    }, 50);
  }

  function handleEditorChange(value) {
    if (ignoreChangeEvent.current) {
      ignoreChangeEvent.current = false;
      return;
    }
    setCode(value);
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'CONTENT_CHANGE', payload: value }));
    }
  }

  function handleFileSelect(filePath) {
    fetch(`/api/fs/content?path=${encodeURIComponent(filePath)}`)
      .then((res) => res.text())
      .then((content) => {
        setCode(content);
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: 'CONTENT_CHANGE', payload: content }));
        }
      })
      .catch(err => console.error('Failed to fetch file content:', err));
  }

  const handleSendMessage = () => {
    if (newMessage.trim() === '' || !userId) return;

    const message = {
      type: 'CHAT_MESSAGE',
      payload: {
        user: userId, // The server will broadcast this back
        text: newMessage,
      },
    };

    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(message));
    }

    // Clear the input box locally for immediate user feedback
    setNewMessage('');
  };

  return (
    <Layout
      fileExplorer={<FileExplorer onFileClick={handleFileSelect} />}
      editor={
        <Editor
          defaultLanguage="javascript"
          value={code}
          theme="vs-dark"
          options={{ minimap: { enabled: false } }}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
        />
      }
      terminal={<Terminal />}
      chat={
        <Chat
          messages={messages}
          newMessage={newMessage}
          onNewMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      }
    />
  );
}

export default App;
