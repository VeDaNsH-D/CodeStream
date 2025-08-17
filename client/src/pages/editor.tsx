import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import CodeEditor from "../components/code-editor";
import ChatPanel from "../components/chat-panel";
import AiAssistant from "../components/ai-assistant";
import Terminal from "../components/terminal";
import { useWebSocket } from "@/hooks/use-websocket";
import type { File, Project } from "@shared/schema";

export default function Editor() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openFiles, setOpenFiles] = useState<File[]>([]);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [chatWidth, setChatWidth] = useState(320);

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch files for selected project
  const { data: files = [] } = useQuery<File[]>({
    queryKey: ["/api/projects", selectedProject?.id, "files"],
    enabled: !!selectedProject,
  });

  // WebSocket for real-time collaboration
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (message) => {
      console.log("Received WebSocket message:", message);
      // Handle real-time updates like cursor positions, file changes, etc.
    },
  });

  // Set default project on load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  // Set default file when files load
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const defaultFile = files[0];
      setSelectedFile(defaultFile);
      setOpenFiles([defaultFile]);
    }
  }, [files, selectedFile]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles(prev => [...prev, file]);
    }
  };

  const handleFileClose = (fileId: string) => {
    setOpenFiles(prev => {
      const newOpenFiles = prev.filter(f => f.id !== fileId);
      if (selectedFile?.id === fileId && newOpenFiles.length > 0) {
        setSelectedFile(newOpenFiles[0]);
      } else if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      return newOpenFiles;
    });
  };

  const handleCodeChange = (code: string) => {
    if (selectedFile) {
      // Send real-time code changes via WebSocket
      sendMessage({
        type: "code_change",
        data: {
          fileId: selectedFile.id,
          code,
          userId: "user-1", // Demo user
        },
      });
    }
  };

  return (
    <div className="h-screen bg-editor-bg text-editor-text overflow-hidden">
      <Header 
        selectedProject={selectedProject}
        isConnected={isConnected}
        onShowAiAssistant={() => setShowAiAssistant(true)}
      />
      
      <div className="flex h-[calc(100vh-3rem)] relative">
        {/* Sidebar */}
        <div 
          className="bg-editor-secondary border-r border-editor-tertiary flex flex-col panel-transition"
          style={{ width: sidebarWidth }}
          data-testid="sidebar-panel"
        >
          <Sidebar
            files={files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onShowAiAssistant={() => setShowAiAssistant(true)}
          />
        </div>

        {/* Sidebar Resizer */}
        <div 
          className="w-1 bg-editor-tertiary cursor-col-resize hover:bg-editor-accent transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX);
              if (newWidth >= 200 && newWidth <= 400) {
                setSidebarWidth(newWidth);
              }
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          data-testid="sidebar-resizer"
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            file={selectedFile}
            openFiles={openFiles}
            onFileClose={handleFileClose}
            onFileSelect={setSelectedFile}
            onCodeChange={handleCodeChange}
          />
          
          <Terminal />
        </div>

        {/* Chat Resizer */}
        {showChat && (
          <div 
            className="w-1 bg-editor-tertiary cursor-col-resize hover:bg-editor-accent transition-colors"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = chatWidth;
              
              const handleMouseMove = (e: MouseEvent) => {
                const newWidth = startWidth - (e.clientX - startX);
                if (newWidth >= 250 && newWidth <= 500) {
                  setChatWidth(newWidth);
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            data-testid="chat-resizer"
          />
        )}

        {/* Chat Panel */}
        {showChat && (
          <div 
            className="bg-editor-secondary border-l border-editor-tertiary flex flex-col panel-transition"
            style={{ width: chatWidth }}
            data-testid="chat-panel"
          >
            <ChatPanel
              projectId={selectedProject?.id || ""}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>

      {/* AI Assistant Modal */}
      {showAiAssistant && (
        <AiAssistant
          selectedFile={selectedFile}
          onClose={() => setShowAiAssistant(false)}
        />
      )}
    </div>
  );
}
