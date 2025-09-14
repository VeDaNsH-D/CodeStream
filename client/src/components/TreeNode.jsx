import { File, Folder, FolderOpen } from 'lucide-react';

export function TreeNode({ node, expandedDirs, onToggleDirectory, onFileClick }) {
  const isDirectory = node.type === 'directory';
  const isExpanded = expandedDirs[node.path];

  const handleNodeClick = () => {
    if (isDirectory) {
      onToggleDirectory(node.path);
    } else {
      onFileClick(node.path);
    }
  };

  const iconStyle = { marginRight: '8px', flexShrink: 0 };
  const nodeStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <div style={{ marginLeft: '15px' }}>
      <div onClick={handleNodeClick} style={nodeStyle} className="treenode-hover">
        {isDirectory ? (
          isExpanded ? <FolderOpen size={16} style={iconStyle} /> : <Folder size={16} style={iconStyle} />
        ) : (
          <File size={16} style={iconStyle} />
        )}
        <span>{node.name}</span>
      </div>
      {isExpanded && isDirectory && node.children && (
        <div>
          {node.children.map((childNode) => (
            <TreeNode
              key={childNode.path}
              node={childNode}
              expandedDirs={expandedDirs}
              onToggleDirectory={onToggleDirectory}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
