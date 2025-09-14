import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

export function Layout({ fileExplorer, editor, terminal }) {
  // A basic layout component that takes other components as props
  // to create a flexible and composable UI structure.
  return (
    <PanelGroup direction="horizontal" style={{ height: "100vh", backgroundColor: "#1e1e1e" }}>
      <Panel defaultSize={20} minSize={15}>
        {fileExplorer}
      </Panel>
      <PanelResizeHandle style={{ width: '2px', background: '#333' }} />
      <Panel>
        <PanelGroup direction="vertical">
          <Panel defaultSize={75} minSize={50}>
            {editor}
          </Panel>
          <PanelResizeHandle style={{ height: '2px', background: '#333' }} />
          <Panel>
            {terminal}
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}
