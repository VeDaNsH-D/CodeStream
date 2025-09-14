import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Layout } from './components/Layout';
import { FileExplorer } from './components/FileExplorer';
import { Terminal } from './components/Terminal';

function App() {
  const [code, setCode] = useState('// Loading from server...');
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const ignoreChangeEvent = useRef(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      const newContent = event.data;
      const editor = editorRef.current;

      // Only update if the content is different to prevent loops
      // and unnecessary re-renders.
      if (editor && editor.getValue() !== newContent) {
        const currentPosition = editor.getPosition();

        // Set a flag to ignore the next onChange event
        ignoreChangeEvent.current = true;

        // Update the editor content and restore cursor position
        editor.setValue(newContent);
        if (currentPosition) {
            editor.setPosition(currentPosition);
        }

        // Also update the React state to be in sync
        setCode(newContent);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    // Cleanup on component unmount
    return () => {
      ws.close();
    };
  }, []);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
  }

  function handleEditorChange(value) {
    // If the change was triggered by a server update, ignore it.
    if (ignoreChangeEvent.current) {
      ignoreChangeEvent.current = false;
      return;
    }

    setCode(value);
    if (wsRef.current && wsRef.current.readyState === 1) { // WebSocket.OPEN
      wsRef.current.send(value);
    }
  }

  return (
    <Layout
      fileExplorer={<FileExplorer />}
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
