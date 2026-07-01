import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppstoreOutlined,
  BlockOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Empty, Space, Tree as AntTree, Typography } from 'antd';

import type { DevtoolActions } from '../../panel/devtool-actions';
import type { CanvasTree, NodeHash } from '../../shared/types';
import { buildTreeData, findTreePath, type CanvasTreeData } from '../tree-model';
import AttrsDrawer from './AttrsDrawer';

const iconMap: Record<CanvasTreeData['type'], JSX.Element> = {
  group: <BlockOutlined />,
  renderer: <PrinterOutlined />,
  shape: <AppstoreOutlined />,
};

interface CanvasTreeProps {
  data: CanvasTree;
  actions: DevtoolActions;
  selectedNodeHash?: NodeHash;
  suppressSelectedOverlayHash?: NodeHash;
}

function CanvasTreeView({ data, actions, selectedNodeHash = '', suppressSelectedOverlayHash = '' }: CanvasTreeProps): JSX.Element {
  const [selectedKey, setSelected] = useState<NodeHash>(selectedNodeHash);
  const treeRef = useRef<{ scrollTo: (options: { key: NodeHash }) => void } | null>(null);
  const treeData = useMemo(() => buildTreeData(data, true), [data]);
  const expandedKeys = useMemo(() => (selectedKey ? findTreePath(data, selectedKey) : []), [data, selectedKey]);

  const onMouseEnter = useCallback((node: CanvasTreeData) => {
    void actions.clearRect('__select__');
    void actions.showRect(node.hash, '__hover__');
  }, [actions]);

  const onMouseLeave = useCallback(() => {
    void actions.clearRect('__hover__');
  }, [actions]);

  const onSelect = useCallback((keys: React.Key[]) => {
    if (keys.length === 0) {
      return;
    }
    setSelected(String(keys[0]));
  }, []);

  useEffect(() => {
    setSelected(selectedNodeHash);
  }, [selectedNodeHash]);

  useEffect(() => {
    if (!selectedKey) {
      return;
    }
    window.setTimeout(() => {
      treeRef.current?.scrollTo({ key: selectedKey });
    }, 100);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey) {
      return undefined;
    }

    if (selectedKey === suppressSelectedOverlayHash) {
      void actions.clearRect('__select__');
      return undefined;
    }

    void actions.showRect(selectedKey, '__select__', 'rgba(29, 57, 196, 0.5)');
    return () => {
      void actions.clearRect('__select__');
    };
  }, [actions, selectedKey, suppressSelectedOverlayHash]);

  if (!data) {
    return <Empty />;
  }

  return (
    <>
      <AntTree
        ref={treeRef as never}
        autoExpandParent={true}
        selectedKeys={[selectedKey]}
        expandedKeys={expandedKeys}
        onSelect={onSelect}
        showLine={{ showLeafIcon: false }}
        height={document.body.clientHeight - 45}
        titleRender={(nodeData) => {
          const node = nodeData as CanvasTreeData;
          return (
            <div
              onMouseEnter={() => onMouseEnter(node)}
              onMouseLeave={onMouseLeave}
            >
              <Space>
                {iconMap[node.type]}
                {node.title}
                {node.attrs?.name && (
                  <Typography.Text type="secondary">
                    Name: {'"'}{String(node.attrs.name)}{'"'}
                  </Typography.Text>
                )}
                {node.name && (
                  <Typography.Text type="secondary">
                    Type: {node.name}
                  </Typography.Text>
                )}
                {node.id && (
                  <Typography.Text type="secondary">
                    Id: {node.id}
                  </Typography.Text>
                )}
                {node.num > 0 && (
                  <Typography.Text type="secondary">
                    ({node.num} children / {node.count || 0} descendants)
                  </Typography.Text>
                )}
              </Space>
            </div>
          );
        }}
        treeData={[treeData]}
      />
      <AttrsDrawer
        hash={selectedKey}
        onCancel={() => setSelected('')}
        getAttrs={actions.getAttrs}
        updateAttr={actions.updateAttr}
      />
    </>
  );
}

export default memo(CanvasTreeView);
