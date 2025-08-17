import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Copy, Download } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { File } from "@shared/schema";

interface CodeEditorProps {
  file: File | null;
  openFiles: File[];
  onFileClose: (fileId: string) => void;
  onFileSelect: (file: File) => void;
  onCodeChange: (code: string) => void;
}

export default function CodeEditor({ 
  file, 
  openFiles, 
  onFileClose, 
  onFileSelect, 
  onCodeChange 
}: CodeEditorProps) {
  const [code, setCode] = useState(file?.content || "");
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update code when file changes
  useEffect(() => {
    if (file) {
      setCode(file.content || "");
    }
  }, [file]);

  // Save file mutation
  const saveFileMutation = useMutation({
    mutationFn: async (data: { id: string; content: string }) => {
      const response = await apiRequest("PUT", `/api/files/${data.id}`, { content: data.content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "File saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: "Failed to save file: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Run code mutation
  const runCodeMutation = useMutation({
    mutationFn: async (data: { code: string; language: string }) => {
      const response = await apiRequest("POST", "/api/compile", data);
      return response.json();
    },
    onSuccess: (result) => {
      // The result will be handled by the Terminal component
      console.log("Code execution result:", result);
    },
    onError: (error) => {
      toast({
        title: "Execution failed",
        description: "Failed to run code: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange(newCode);
    
    // Auto-save after 2 seconds of inactivity
    const timeoutId = setTimeout(() => {
      if (file && newCode !== file.content) {
        saveFileMutation.mutate({ id: file.id, content: newCode });
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  };

  const handleRunCode = () => {
    if (!file) return;
    
    setIsRunning(true);
    runCodeMutation.mutate(
      { code, language: file.language },
      {
        onSettled: () => setIsRunning(false),
      }
    );
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'py':
        return 'fab fa-python text-syntax-keyword';
      case 'java':
        return 'fab fa-java text-orange-400';
      case 'cpp':
      case 'c':
        return 'fas fa-code text-blue-400';
      case 'js':
        return 'fab fa-js-square text-yellow-400';
      default:
        return 'fas fa-file-code text-gray-400';
    }
  };

  const renderLineNumbers = () => {
    const lines = code.split('\n');
    return (
      <div className="absolute left-0 top-0 w-12 h-full bg-editor-secondary border-r border-editor-tertiary text-editor-text-dim text-right text-sm code-editor overflow-hidden select-none">
        <div className="py-4 pr-2">
          {lines.map((_, index) => (
            <div key={index} className="leading-6">
              {index + 1}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg text-editor-text-dim">
        <div className="text-center">
          <i className="fas fa-code text-4xl mb-4 text-editor-accent"></i>
          <p className="text-lg">No file selected</p>
          <p className="text-sm">Select a file from the sidebar to start coding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Tabs */}
      <div className="bg-editor-secondary border-b border-editor-tertiary">
        <div className="flex items-center">
          {openFiles.map((openFile) => (
            <div 
              key={openFile.id}
              className={`flex items-center space-x-2 px-4 py-2 border-r border-editor-tertiary text-sm cursor-pointer transition-colors ${
                file.id === openFile.id 
                  ? 'bg-editor-bg text-editor-text' 
                  : 'text-editor-text-dim hover:bg-editor-tertiary hover:text-editor-text'
              }`}
              onClick={() => onFileSelect(openFile)}
              data-testid={`tab-${openFile.name}`}
            >
              <i className={getFileIcon(openFile.name)}></i>
              <span>{openFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 hover:bg-editor-tertiary"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClose(openFile.id);
                }}
                data-testid={`button-close-${openFile.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {/* Run Button */}
          <div className="ml-auto pr-4">
            <Button
              size="sm"
              onClick={handleRunCode}
              disabled={isRunning}
              className="bg-editor-success hover:bg-green-600 text-white"
              data-testid="button-run-current-file"
            >
              <Play className="mr-1 h-3 w-3" />
              {isRunning ? "Running..." : "Run"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Code Editor */}
      <div className="flex-1 relative bg-editor-bg">
        {renderLineNumbers()}
        
        {/* Code Content */}
        <div className="ml-12 h-full">
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full h-full p-4 bg-transparent text-editor-text code-editor resize-none outline-none scrollbar-thin"
            style={{ 
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: '14px',
              lineHeight: '1.5',
              tabSize: 2,
            }}
            spellCheck={false}
            data-testid="textarea-code-editor"
          />
        </div>
        
        {/* Mock Collaboration Cursors */}
        <div 
          className="absolute cursor-indicator bg-blue-500" 
          style={{ top: '120px', left: '200px' }}
          data-username="John Doe"
        />
        <div 
          className="absolute cursor-indicator bg-green-500" 
          style={{ top: '180px', left: '150px' }}
          data-username="Alice Smith"
        />
      </div>
    </div>
  );
}
