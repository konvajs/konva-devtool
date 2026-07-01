import React, { useEffect, useState } from 'react';
import { CodeOutlined } from '@ant-design/icons';
import { Button, Col, Row, Switch, Tag, Tooltip } from 'antd';

import type { DevtoolActions } from '../../panel/devtool-actions';
import type { CanvasTree, NodeHash } from '../../shared/types';
import { countDescendants } from '../tree-model';
import CanvasSelector from './CanvasSelector';

interface InspectorToolbarProps {
  data: CanvasTree[];
  selectedCanvas?: CanvasTree;
  selectedCanvasHash: NodeHash;
  setData(data: CanvasTree[]): void;
  setSelectedCanvasHash(hash: NodeHash): void;
  mouseoverInspecting: boolean;
  setMouseoverInspecting(enabled: boolean): void;
  actions: DevtoolActions;
}

function InspectorToolbar({
  data,
  selectedCanvas,
  selectedCanvasHash,
  setData,
  setSelectedCanvasHash,
  mouseoverInspecting,
  setMouseoverInspecting,
  actions,
}: InspectorToolbarProps): JSX.Element {
  const [canvasAlive, setCanvasAlive] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void actions.checkCanvasAlive(selectedCanvasHash).then((alive) => {
        setCanvasAlive(alive);
        if (alive) {
          void actions.refreshCanvases().then((nextData) => {
            if (nextData) {
              setData(nextData);
            }
          });
        }
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [actions, selectedCanvasHash, setData]);

  useEffect(() => {
    if (!canvasAlive) {
      void actions.refreshCanvases().then((nextData) => {
        if (nextData.length) {
          setData(nextData);
          setSelectedCanvasHash(nextData[0].hash);
        }
      });
    }
  }, [actions, canvasAlive, setData, setSelectedCanvasHash]);

  const onSwitch = (nextChecked: boolean) => {
    setMouseoverInspecting(nextChecked);
  };

  return (
    <Row
      align="middle"
      style={{
        padding: 2,
        marginBottom: 6,
        borderBottom: '1px solid #ddd',
        background: 'rgba(0, 0, 0, 0.05)',
        position: 'fixed',
        width: '100%',
        top: 0,
        left: 0,
        zIndex: 999,
      }}
      gutter={[12, 12]}
    >
      <Col>
        <span style={{ margin: '0 6px' }}>Enable Mouseover: </span>
        <Switch checked={mouseoverInspecting} onChange={onSwitch} />
      </Col>
      <Col>
        <CanvasSelector data={data} selectedCanvasHash={selectedCanvasHash} onChange={setSelectedCanvasHash} />
      </Col>
      {canvasAlive ? (
        <Col>
          <Tag color="green">ALIVE</Tag>
        </Col>
      ) : (
        <Col>
          <Tag color="red">DEAD</Tag>
          <span>Trying to reconnect</span>
        </Col>
      )}
      {selectedCanvas && <Col>{countDescendants(selectedCanvas)} Shapes</Col>}
      <Col flex={1} />
      <Col>
        <Button
          size="small"
          type="text"
          disabled={!selectedCanvas}
          onClick={() => {
            if (selectedCanvas) {
              void actions.consoleElement(selectedCanvas.hash);
            }
          }}
        >
          <Tooltip arrowPointAtCenter title="Console Canvas">
            <CodeOutlined />
          </Tooltip>
        </Button>
      </Col>
    </Row>
  );
}

export default InspectorToolbar;
