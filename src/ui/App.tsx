import React, { useEffect, useState } from 'react';
import { Empty } from 'antd';

import type { DevtoolActions } from '../panel/devtool-actions';
import { normalizeRuntimeEvent } from '../shared/type-guards';
import type { CanvasTree, ExtensionRuntimeMessage, NodeHash } from '../shared/types';
import CanvasTreeView from './components/CanvasTree';
import InspectorToolbar from './components/InspectorToolbar';

interface AppProps {
  data: CanvasTree[];
  actions: DevtoolActions;
}

export default function App({ data: initialData, actions }: AppProps): JSX.Element {
  const [selectedNodeHash, setSelectedNodeHash] = useState<NodeHash>('');
  const [selectedCanvasHash, setSelectedCanvasHash] = useState<NodeHash>(initialData[0]?.hash ?? '');
  const [data, setData] = useState<CanvasTree[]>(initialData);
  const selectedCanvas = data.find((canvas) => canvas.hash === selectedCanvasHash);

  useEffect(() => {
    return () => {
      void actions.clearRect();
    };
  }, [actions]);

  useEffect(() => {
    const handler = (message: ExtensionRuntimeMessage) => {
      const event = normalizeRuntimeEvent(message);

      if (event?.type === 'showShape') {
        setSelectedCanvasHash(event.detail.canvasHash);
        setSelectedNodeHash(event.detail.nodeHash);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  return (
    <div>
      <InspectorToolbar
        data={data}
        selectedCanvas={selectedCanvas}
        selectedCanvasHash={selectedCanvasHash}
        setData={setData}
        setSelectedCanvasHash={setSelectedCanvasHash}
        actions={actions}
      />
      <div style={{ marginTop: 48, position: 'relative', zIndex: 1 }}>
        {selectedCanvas ? (
          <CanvasTreeView actions={actions} data={selectedCanvas} selectedNodeHash={selectedNodeHash} />
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}
