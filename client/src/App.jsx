import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Layout } from './components/Layout';
import { FileExplorer } from './components/FileExplorer';
import { Terminal } from './components/Terminal';

function App() {
  const [code, setCode] = useState('// Loading code...');

  useEffect(() => {
    // In a real app, you might fetch a file's content here
    fetch('http://localhost:3001/api/code')
      .then(res => res.json())
      .then(data => setCode(data.code))
      .catch(() => setCode('// Failed to load code from server.'));
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      console.log('Message from server:', event.data);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    // Cleanup on component unmount
    return () => {
      ws.close();
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <Layout
      fileExplorer={<FileExplorer />}
      editor={
        <Editor
          // height is managed by the panel
          defaultLanguage="javascript"
          value={code}
          theme="vs-dark"
          options={{ minimap: { enabled: false } }}
        />
      }
      terminal={<Terminal />}
    />
  );
}

export default App;
