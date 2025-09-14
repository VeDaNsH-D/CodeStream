import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

function App() {
  const [code, setCode] = useState('// Loading code...');

  useEffect(() => {
    fetch('http://localhost:3001/api/code')
      .then(res => res.json())
      .then(data => setCode(data.code))
      .catch(() => setCode('// Failed to load code.'));
  }, []);

  return (
    <Editor
      height="100vh"
      defaultLanguage="javascript"
      value={code}
      theme="vs-dark"
    />
  );
}

export default App;
