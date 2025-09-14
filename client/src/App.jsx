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
