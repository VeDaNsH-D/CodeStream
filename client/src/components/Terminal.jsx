import { useTranslation } from 'react-i18next';

export function Terminal({ output }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '10px', height: '100%', boxSizing: 'border-box', color: '#d4d4d4', backgroundColor: '#1e1e1e', overflowY: 'auto' }}>
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '5px' }}>
        <h2 style={{ margin: 0, fontSize: '14px' }}>{t('terminal')}</h2>
      </div>
      <pre style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {output}
      </pre>
    </div>
  );
}
