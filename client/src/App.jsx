import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { Layout } from './components/Layout';
import { FileExplorer } from './components/FileExplorer';
import { Terminal } from './components/Terminal';
import { Chat } from './components/Chat';

function App() {
  const { t, i18n } = useTranslation();

  // Editor and File State
  const [code, setCode] = useState(t('selectFileToStart'));
  const [activeFile, setActiveFile] = useState(null);

  // User and Connection State
  const [userId, setUserId] = useState(null);
  const wsRef = useRef(null);

  // Editor and Monaco Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteCursors = useRef(new Map());
  const ignoreChangeEvent = useRef(false);
  const throttleTimeout = useRef(null);

  // Chat State
  const [messages, setMessages] = useState([
    { user: 'System', text: t('welcome') }
  ]);
  const [newMessage, setNewMessage] = useState('');

  // New state for language selection and terminal output
  const [language, setLanguage] = useState('javascript');
  const [terminalOutput, setTerminalOutput] = useState(t('terminalOutputPlaceholder'));

  // Refs to hold the latest state for use in WebSocket callbacks
  const activeFileRef = useRef(activeFile);
  const userIdRef = useRef(userId);

  useEffect(() => {
    activeFileRef.current = activeFile;
    userIdRef.current = userId;
  }, [activeFile, userId]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => console.log('Connected to WebSocket server');

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setUserId(null);
      setActiveFile(null);
      setCode(t('disconnected'));
      if (editorRef.current) {
        const allDecorations = Array.from(remoteCursors.current.values()).flat();
        editorRef.current.deltaDecorations(allDecorations, []);
      }
      remoteCursors.current.clear();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { type, payload } = message;
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      switch (type) {
        case 'ID_ASSIGN':
          setUserId(payload);
          break;

        case 'CONTENT_UPDATE':
          if (payload.filePath === activeFileRef.current) {
            if (editor && editor.getValue() !== payload.content) {
              const currentPosition = editor.getPosition();
              ignoreChangeEvent.current = true;
              editor.setValue(payload.content);
              if (currentPosition) editor.setPosition(currentPosition);
              setCode(payload.content);
            }
          }
          break;

        case 'CURSOR_UPDATE':
          if (editor && monaco && payload.userId !== userIdRef.current && payload.filePath === activeFileRef.current) {
            const { userId: remoteUserId, position } = payload;
            const oldDecorations = remoteCursors.current.get(remoteUserId) || [];
            const newDecorations = [{
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
              options: { className: 'remote-cursor', hoverMessage: { value: `User: ${remoteUserId.substring(0, 4)}` } }
            }];
            const newDecorationIds = editor.deltaDecorations(oldDecorations, newDecorations);
            remoteCursors.current.set(remoteUserId, newDecorationIds);
          }
          break;

        case 'USER_DISCONNECTED':
          if (payload.filePath === activeFileRef.current) {
            const { userId: disconnectedUserId } = payload;
            const oldDecorations = remoteCursors.current.get(disconnectedUserId) || [];
            if (editor && oldDecorations.length > 0) {
              editor.deltaDecorations(oldDecorations, []);
              remoteCursors.current.delete(disconnectedUserId);
            }
          }
          break;

        case 'NEW_CHAT_MESSAGE':
          setMessages(prev => [...prev, payload]);
          break;

        case 'ERROR':
          console.error(t('serverError'), payload);
          alert(`${t('serverError')} ${payload}`);
          break;
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [t]); // Empty dependency array ensures this runs only once on mount

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition(handleCursorChange);
  }

  function handleCursorChange(event) {
    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);

    throttleTimeout.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === 1 && userId && activeFile) {
        wsRef.current.send(JSON.stringify({
          type: 'CURSOR_CHANGE',
          payload: { userId, position: event.position, filePath: activeFile }
        }));
      }
    }, 50);
  }

  function handleEditorChange(value) {
    if (ignoreChangeEvent.current) {
      ignoreChangeEvent.current = false;
      return;
    }
    setCode(value);
    if (wsRef.current && wsRef.current.readyState === 1 && activeFile) {
      wsRef.current.send(JSON.stringify({
        type: 'CONTENT_CHANGE',
        payload: { filePath: activeFile, content: value }
      }));
    }
  }

  function handleFileSelect(filePath) {
    if (filePath === activeFile) return;

    // Clear out old decorations when switching files
    if (editorRef.current) {
      const allDecorations = Array.from(remoteCursors.current.values()).flat();
      editorRef.current.deltaDecorations(allDecorations, []);
      remoteCursors.current.clear();
    }

    // Update state and ref simultaneously to avoid race conditions
    setActiveFile(filePath);
    activeFileRef.current = filePath;

    setCode(t('loadingFile', { filePath }));

    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'JOIN_FILE',
        payload: { filePath }
      }));
    }
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

  const handleSaveFile = () => {
    if (!activeFile || !editorRef.current) return;

    const content = editorRef.current.getValue();
    fetch('/api/fs/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: activeFile, content }),
    })
    .then(res => {
      if (res.ok) {
        alert(t('fileSavedSuccess'));
      } else {
        res.text().then(text => alert(t('fileSaveError', { error: text })));
      }
    })
    .catch(err => {
      console.error('Failed to save file:', err);
      alert(t('unexpectedSaveError'));
    });
  };

  const handleRunFile = () => {
    if (!activeFile) return;

    setTerminalOutput(t('executingFile', { filePath: activeFile }));

    fetch('/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath: activeFile, language }),
    })
    .then(res => res.json())
    .then(data => {
      let output = '';
      if (data.stdout) {
        output += `${t('stdout')}\n${data.stdout}\n`;
      }
      if (data.stderr) {
        output += `${t('stderr')}\n${data.stderr}\n`;
      }
      if (!data.stdout && !data.stderr) {
        output = t('executionFinished');
      }
      setTerminalOutput(output);
    })
    .catch(err => {
      console.error('Failed to execute file:', err);
      setTerminalOutput(t('unexpectedExecutionError'));
    });
  };

  return (
    <Layout
      fileExplorer={<FileExplorer onFileClick={handleFileSelect} />}
      editor={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '4px 8px', background: '#3c3c3c', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#ccc', flexGrow: 1 }}>{activeFile || t('noFileSelected')}</span>
            <select value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)} style={{ background: '#2d2d2d', color: 'white', border: '1px solid #555', padding: '4px', borderRadius: '3px' }}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ background: '#2d2d2d', color: 'white', border: '1px solid #555', padding: '4px', borderRadius: '3px' }}>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <button onClick={handleRunFile} disabled={!activeFile} style={{ background: '#0e9c3d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>
              {t('run')}
            </button>
            <button onClick={handleSaveFile} disabled={!activeFile} style={{ background: '#0e639c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>
              {t('save')}
            </button>
          </div>
          <div style={{ flexGrow: 1 }}>
            <Editor
              key={activeFile} // Re-mount editor when file changes to clear undo stack
              language={language}
              value={code}
              theme="vs-dark"
              options={{ minimap: { enabled: false } }}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>
      }
      terminal={<Terminal output={terminalOutput} />}
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
