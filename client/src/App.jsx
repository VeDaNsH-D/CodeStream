import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Layout } from './components/Layout';
import { FileExplorer } from './components/FileExplorer';
import { Terminal } from './components/Terminal';

function App() {
  const [code, setCode] = useState('// Connecting to server...');
  const [userId, setUserId] = useState(null);
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteCursors = useRef(new Map());
  const ignoreChangeEvent = useRef(false);
  const throttleTimeout = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
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
            const newDecorations = [
              {
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
                options: { className: 'remote-cursor', hoverMessage: { value: `User: ${remoteUserId.substring(0, 4)}` } },
              },
            ];
            const newDecorationIds = editor.deltaDecorations(oldDecorations, newDecorations);
            remoteCursors.current.set(remoteUserId, newDecorationIds);
          }
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

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setUserId(null);
      if(editorRef.current) {
        const allDecorations = Array.from(remoteCursors.current.values()).flat();
        editorRef.current.deltaDecorations(allDecorations, []);
      }
      remoteCursors.current.clear();
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  function handleCursorChange(event) {
    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    throttleTimeout.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === 1 && userId) {
        wsRef.current.send(JSON.stringify({
          type: 'CURSOR_CHANGE',
          payload: { userId, position: event.position },
        }));
      }
    }, 50);
  }

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition(handleCursorChange);
  }

  function handleFileSelect(filePath) {
    fetch(`/api/fs/content?path=${encodeURIComponent(filePath)}`)
      .then((res) => res.text())
      .then((content) => {
        setCode(content);
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({
            type: 'CONTENT_CHANGE',
            payload: content,
          }));
        }
      })
      .catch(err => console.error('Failed to fetch file content:', err));
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
    />
  );
}

export default App;
