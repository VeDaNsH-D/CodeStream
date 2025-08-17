import { Button } from "@/components/ui/button";
import { FilePlus, FolderPlus, FileCode, Folder, File } from "lucide-react";
import type { File as FileType } from "@shared/schema";

interface SidebarProps {
  files: FileType[];
  selectedFile: FileType | null;
  onFileSelect: (file: FileType) => void;
  onShowAiAssistant: () => void;
}

export default function Sidebar({ files, selectedFile, onFileSelect, onShowAiAssistant }: SidebarProps) {
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'py':
        return <FileCode className="text-syntax-keyword h-4 w-4" />;
      case 'java':
        return <FileCode className="text-orange-400 h-4 w-4" />;
      case 'cpp':
      case 'c':
        return <FileCode className="text-blue-400 h-4 w-4" />;
      case 'js':
      case 'ts':
        return <FileCode className="text-yellow-400 h-4 w-4" />;
      default:
        return <File className="text-gray-400 h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-editor-tertiary">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-editor-text">EXPLORER</span>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              data-testid="button-new-file"
            >
              <FilePlus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              data-testid="button-new-folder"
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* File Tree */}
      <div className="flex-1 p-2 overflow-y-auto scrollbar-thin">
        <div className="space-y-1">
          {/* Project Folder */}
          <div className="flex items-center space-x-2 p-1 hover:bg-editor-tertiary rounded cursor-pointer">
            <Folder className="text-editor-accent h-4 w-4" />
            <span className="text-sm text-editor-text">Demo Project</span>
          </div>
          
          {/* Files */}
          <div className="ml-4 space-y-1">
            {files.map((file) => (
              <div 
                key={file.id}
                className={`flex items-center space-x-2 p-1 rounded cursor-pointer transition-colors ${
                  selectedFile?.id === file.id 
                    ? 'bg-editor-tertiary' 
                    : 'hover:bg-editor-tertiary'
                }`}
                onClick={() => onFileSelect(file)}
                data-testid={`file-${file.name}`}
              >
                {getFileIcon(file.name)}
                <span className="text-sm text-editor-text">{file.name}</span>
              </div>
            ))}
            
            {files.length === 0 && (
              <div className="text-sm text-editor-text-dim p-2">
                No files found
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Language Selection */}
      <div className="p-3 border-t border-editor-tertiary">
        <div className="text-xs text-editor-text-dim mb-2">SUPPORTED LANGUAGES</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center space-x-1 p-1 hover:bg-editor-tertiary rounded">
            <FileCode className="text-syntax-keyword h-3 w-3" />
            <span className="text-editor-text">Python</span>
          </div>
          <div className="flex items-center space-x-1 p-1 hover:bg-editor-tertiary rounded">
            <FileCode className="text-orange-400 h-3 w-3" />
            <span className="text-editor-text">Java</span>
          </div>
          <div className="flex items-center space-x-1 p-1 hover:bg-editor-tertiary rounded">
            <FileCode className="text-blue-400 h-3 w-3" />
            <span className="text-editor-text">C++</span>
          </div>
          <div className="flex items-center space-x-1 p-1 hover:bg-editor-tertiary rounded">
            <FileCode className="text-yellow-400 h-3 w-3" />
            <span className="text-editor-text">JavaScript</span>
          </div>
        </div>
      </div>
    </div>
  );
}
