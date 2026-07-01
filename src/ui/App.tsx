import React, { useCallback, useEffect, useState } from 'react';
import { Empty } from 'antd';

import type { DevtoolActions } from '../panel/devtool-actions';
import type { CanvasTree, NodeHash, RuntimeEvent } from '../shared/types';
import CanvasTreeView from './components/CanvasTree';
import InspectorToolbar from './components/InspectorToolbar';

export interface RuntimeEventSubscription {
  subscribe(handler: (event: RuntimeEvent) => void): () => void;
}

interface AppProps {
  data: CanvasTree[];
  actions: DevtoolActions;
  runtimeEvents?: RuntimeEventSubscription;
}

export default function App({ data: initialData, actions, runtimeEvents }: AppProps): JSX.Element {
  const [selectedNodeHash, setSelectedNodeHash] = useState<NodeHash>('');
  const [selectedCanvasHash, setSelectedCanvasHash] = useState<NodeHash>(initialData[0]?.hash ?? '');
  const [mouseoverInspecting, setMouseoverInspectingState] = useState(false);
  const [data, setData] = useState<CanvasTree[]>(initialData);
  const selectedCanvas = data.find((canvas) => canvas.hash === selectedCanvasHash);
  const setMouseoverInspecting = useCallback(
    (enabled: boolean) => {
      setMouseoverInspectingState(enabled);
      void actions.setMouseoverInspecting(enabled);
    },
    [actions]
  );

  useEffect(() => {
    return () => {
      void actions.clearRect();
    };
  }, [actions]);

  useEffect(() => {
    return runtimeEvents?.subscribe((event) => {
      if (event.type === 'closeHover' || event.type === 'showShape') {
        setMouseoverInspecting(false);
      }

      if (event?.type === 'showShape') {
        setSelectedCanvasHash(event.detail.canvasHash);
        setSelectedNodeHash(event.detail.nodeHash);
      }
    });
  }, [runtimeEvents, setMouseoverInspecting]);

  return (
    <div>
      <InspectorToolbar
        data={data}
        selectedCanvas={selectedCanvas}
        selectedCanvasHash={selectedCanvasHash}
        setData={setData}
        setSelectedCanvasHash={setSelectedCanvasHash}
        mouseoverInspecting={mouseoverInspecting}
        setMouseoverInspecting={setMouseoverInspecting}
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
