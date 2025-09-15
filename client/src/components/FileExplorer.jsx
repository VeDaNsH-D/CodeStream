import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeNode } from './TreeNode';

export function FileExplorer({ onFileClick }) {
  const { t } = useTranslation();
  const [tree, setTree] = useState([]);
  const [error, setError] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState({});

  useEffect(() => {
    fetch('/api/fs/tree')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => setTree(data))
      .catch((err) => {
        console.error('Failed to fetch file tree:', err);
        setError(err.message);
      });
  }, []);

  const handleToggleDirectory = (path) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  return (
    <div style={{ padding: '10px', color: '#d4d4d4', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%' }}>
      <h2 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>{t('explorer')}</h2>
      {error && <p style={{color: 'red'}}>{t('error', { error })}</p>}
      <div>
        {tree.length > 0
          ? tree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                expandedDirs={expandedDirs}
                onToggleDirectory={handleToggleDirectory}
                onFileClick={onFileClick}
              />
            ))
          : !error && <p>{t('loading')}</p>
        }
      </div>
    </div>
  );
}
