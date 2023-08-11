import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  BlockOutlined,
  PrinterOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { Empty, Space, Tree as AntTree, Typography } from 'antd';
import { buildTreeData } from '../utils';
import AttrsDrawer from './AttrsDrawer';

const iconMap = {
  group: <BlockOutlined />,
  renderer: <PrinterOutlined />,
  shape: <AppstoreOutlined />
};

const Tree = (props) => {
  const { data, actions = {}, defaultKey = '' } = props;
  const [selectedKey, setSelected] = useState(defaultKey);
  const treeRef = useRef();

  const onMouseEnter = useCallback((node) => {
    actions.cleanRect('__select__');
    actions.showRect(node.hash, '__hover__');
  }, [actions]);

  const onMouseLeave = useCallback(() => {
    actions.cleanRect('__hover__');
  }, [actions]);

  const onSelect = useCallback((keys) => {
    if (keys.length === 0) {
      return;
    }
    setSelected(keys[0]);
  }, [setSelected]);

  useEffect(() => {
    setSelected(defaultKey);
  }, [defaultKey]);

  useEffect(() => {
    if (!selectedKey) {
      return;
    }
    setTimeout(() => {
      treeRef.current.scrollTo({ key: selectedKey });
    }, 100);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey) {
      return;
    }
    // 如果选中了一个图形，那么就直接展示
    actions.showRect(selectedKey, '__select__', 'rgba(29, 57, 196, 0.5)');
    return () => {
      actions.cleanRect('__select__');
    };
  }, [actions, selectedKey]);

  if (!data) {
    return <Empty />;
  }

  const treeData = buildTreeData(data, true);

  return (
    <>
      <AntTree
        ref={treeRef}
        autoExpandParent={true}
        selectedKeys={[selectedKey]}
        expandedKeys={[selectedKey]}
        onSelect={onSelect}
        showLine={{ showLeafIcon: false }}
        height={document.body.clientHeight - 45}
        titleRender={(node) => (
          <div
            onMouseEnter={() => onMouseEnter(node)}
            onMouseLeave={onMouseLeave}
          >
            <Space>
              {iconMap[node.type]}
              {node.title}
              {node.attrs?.name && (
                <Typography.Text type='secondary'>
                  Name: "{node.attrs.name}"
                </Typography.Text>
              )}
              {node.name && (
                <Typography.Text type='secondary'>
                  Type: {node.name}
                </Typography.Text>
              )}
              {node.id && (
                <Typography.Text type='secondary'>
                  Id: {node.id}
                </Typography.Text>
              )}
              {
                node.num > 0 && <Typography.Text type='secondary'>
                  ({node.num} children / {node.count || 0} descendants)
                </Typography.Text>
              }
            </Space>
          </div>
        )}
        treeData={[treeData]}
      />
      <AttrsDrawer
        hash={selectedKey}
        onCancel={() => setSelected('')}
        getAttrs={actions.getAttrs}
        updateAttrs={actions.updateAttrs}
      />
    </>
  );
};

export default memo(Tree);
