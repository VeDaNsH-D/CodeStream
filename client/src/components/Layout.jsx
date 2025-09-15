import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

export function Layout({ fileExplorer, editor, terminal, chat, videochat }) {
  const handleStyle = {
    backgroundColor: '#333',
    transition: 'background-color 0.2s ease-in-out',
  };

  // A data-active attribute is added by react-resizable-panels
  const activeHandleStyle = {
    backgroundColor: '#007acc',
  };

  return (
    <PanelGroup direction="horizontal" style={{ height: "100vh", backgroundColor: "#1e1e1e" }}>
      <Panel defaultSize={20} minSize={15}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={40} minSize={30}>
            {fileExplorer}
          </Panel>
          <PanelResizeHandle style={handleStyle} data-active-style={activeHandleStyle} />
          <Panel defaultSize={30} minSize={20}>
            {videochat}
          </Panel>
          <PanelResizeHandle style={handleStyle} data-active-style={activeHandleStyle} />
          <Panel>
            {chat}
          </Panel>
        </PanelGroup>
      </Panel>
      <PanelResizeHandle style={handleStyle} data-active-style={activeHandleStyle} />
      <Panel>
        <PanelGroup direction="vertical">
          <Panel defaultSize={75} minSize={50}>
            {editor}
          </Panel>
          <PanelResizeHandle style={handleStyle} data-active-style={activeHandleStyle} />
          <Panel>
            {terminal}
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}
