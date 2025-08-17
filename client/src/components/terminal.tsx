import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Terminal as TerminalIcon, Play, AlertCircle, Settings } from "lucide-react";

interface TerminalProps {}

export default function Terminal({}: TerminalProps) {
  const [activeTab, setActiveTab] = useState("terminal");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "CodeCollab Terminal v1.0.0",
    "Type 'help' for available commands.",
    "",
  ]);
  const [isMinimized, setIsMinimized] = useState(false);

  const tabs = [
    { id: "terminal", label: "Terminal", icon: TerminalIcon },
    { id: "output", label: "Output", icon: Play },
    { id: "problems", label: "Problems", icon: AlertCircle },
  ];

  const mockOutput = {
    terminal: [
      "CodeCollab Terminal v1.0.0",
      "Type 'help' for available commands.",
      "",
      "$ python main.py",
      "Running collaborative sorting algorithm...",
      "Participants: 3 users connected",
      "✓ Sort completed in 0.045s",
      "Output: [1, 2, 3, 5, 8, 13, 21, 34, 55]",
      "",
      "$ ",
    ],
    output: [
      "Running collaborative sorting algorithm...",
      "Participants: 3 users connected",
      "✓ Sort completed in 0.045s",
      "Output: [1, 2, 3, 5, 8, 13, 21, 34, 55]",
      "",
      "Program completed successfully.",
    ],
    problems: [
      "No problems detected in the current file.",
      "",
      "✓ Syntax check passed",
      "✓ Code style check passed",
      "✓ No unused variables found",
    ],
  };

  const getTabContent = () => {
    const content = mockOutput[activeTab as keyof typeof mockOutput] || mockOutput.terminal;
    return content;
  };

  const getTabColor = (tabId: string) => {
    switch (tabId) {
      case "terminal":
        return "text-editor-text";
      case "output":
        return "text-editor-success";
      case "problems":
        return "text-orange-400";
      default:
        return "text-editor-text-dim";
    }
  };

  if (isMinimized) {
    return (
      <div className="h-8 bg-editor-secondary border-t border-editor-tertiary flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="h-4 w-4 text-editor-text-dim" />
          <span className="text-sm text-editor-text-dim">Terminal</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
          data-testid="button-restore-terminal"
        >
          <i className="fas fa-window-maximize text-xs"></i>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-48 bg-editor-secondary border-t border-editor-tertiary flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 border-b border-editor-tertiary">
        <div className="flex space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab === tab.id
                    ? 'bg-editor-tertiary text-editor-text'
                    : 'text-editor-text-dim hover:text-editor-text hover:bg-editor-tertiary'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="mr-1 h-3 w-3" />
                {tab.label}
              </Button>
            );
          })}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
            data-testid="button-minimize-terminal"
          >
            <i className="fas fa-window-minimize text-xs"></i>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
            data-testid="button-close-terminal"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Terminal Content */}
      <div 
        className="flex-1 p-3 font-mono text-sm overflow-y-auto scrollbar-thin"
        data-testid={`terminal-content-${activeTab}`}
      >
        {getTabContent().map((line, index) => (
          <div 
            key={index} 
            className={`leading-6 ${
              line.startsWith('$') ? 'text-editor-accent font-semibold' :
              line.startsWith('✓') ? 'text-editor-success' :
              line.startsWith('Error') || line.startsWith('✗') ? 'text-red-400' :
              line.includes('completed') || line.includes('successfully') ? 'text-editor-success' :
              'text-editor-text'
            }`}
          >
            {line || '\u00A0'} {/* Non-breaking space for empty lines */}
          </div>
        ))}
        
        {activeTab === 'terminal' && (
          <div className="flex items-center mt-2">
            <span className="text-editor-accent mr-2">$</span>
            <div className="w-2 h-4 bg-editor-text animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}
