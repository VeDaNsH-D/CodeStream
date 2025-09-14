export function FileExplorer() {
  return (
    <div style={{ padding: '10px', color: '#d4d4d4' }}>
      <h2 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>EXPLORER</h2>
      {/* Placeholder for file tree */}
      <ul>
        <li style={{ listStyle: 'none', cursor: 'pointer' }}>📄 index.js</li>
        <li style={{ listStyle: 'none', cursor: 'pointer' }}>📄 package.json</li>
      </ul>
    </div>
  );
}
