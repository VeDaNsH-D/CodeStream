import { Button } from "@/components/ui/button";
import { Play, FolderOpen, Users, UserPlus } from "lucide-react";
import type { Project } from "@shared/schema";

interface HeaderProps {
  selectedProject: Project | null;
  isConnected: boolean;
  onShowAiAssistant: () => void;
}

export default function Header({ selectedProject, isConnected, onShowAiAssistant }: HeaderProps) {
  const collaborators = [
    { id: "1", name: "John Doe", initials: "JD", color: "bg-blue-500" },
    { id: "2", name: "Alice Smith", initials: "AS", color: "bg-green-500" },
    { id: "3", name: "Mike Kim", initials: "MK", color: "bg-purple-500" },
  ];

  return (
    <header className="bg-editor-secondary border-b border-editor-tertiary h-12 flex items-center justify-between px-4 z-50 relative">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <i className="fas fa-code text-editor-accent text-xl"></i>
          <span className="font-semibold text-lg text-editor-text">CodeCollab</span>
        </div>
        
        {/* Project Controls */}
        <div className="flex items-center space-x-2 ml-8">
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-editor-tertiary hover:bg-editor-accent text-editor-text"
            data-testid="button-open-project"
          >
            <FolderOpen className="mr-1 h-4 w-4" />
            Open Project
          </Button>
          <Button 
            size="sm"
            className="bg-editor-success hover:bg-green-600 text-white"
            data-testid="button-run-code"
          >
            <Play className="mr-1 h-4 w-4" />
            Run Code
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-editor-success' : 'bg-red-500'}`} />
          <span className="text-xs text-editor-text-dim">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Collaboration Status */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {collaborators.map((collaborator) => (
              <div 
                key={collaborator.id}
                className={`w-8 h-8 ${collaborator.color} rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-editor-secondary`}
                title={collaborator.name}
                data-testid={`avatar-${collaborator.initials}`}
              >
                {collaborator.initials}
              </div>
            ))}
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-editor-tertiary hover:bg-editor-accent text-editor-text"
            data-testid="button-invite"
          >
            <UserPlus className="mr-1 h-3 w-3" />
            Invite
          </Button>
        </div>
        
        {/* User Menu */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            className="w-8 h-8 bg-editor-accent rounded-full p-0 hover:bg-blue-600"
            data-testid="button-user-menu"
          >
            <span className="text-xs font-semibold text-white">U</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
