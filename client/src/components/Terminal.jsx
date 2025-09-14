export function Terminal() {
  return (
    <div style={{ padding: '10px', height: '100%', boxSizing: 'border-box', color: '#d4d4d4', backgroundColor: '#1e1e1e' }}>
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '5px' }}>
        <h2 style={{ margin: 0, fontSize: '14px' }}>TERMINAL</h2>
      </div>
      <div>
        <p style={{ margin: 0, fontFamily: 'monospace' }}>
          user@codelab:~$
        </p>
      </div>
    </div>
  );
}
