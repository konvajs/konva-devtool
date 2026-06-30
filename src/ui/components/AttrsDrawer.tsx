import React, { useCallback, useEffect, useState } from 'react';
import { Drawer } from 'antd';
import ReactJson from 'react-json-view';

import type { CanvasAttrs, NodeHash } from '../../shared/types';

interface ReactJsonChange {
  updated_src: object;
  namespace: Array<string | null>;
  name: string | null;
}

interface AttrsDrawerProps {
  hash: NodeHash;
  getAttrs(hash: NodeHash): Promise<CanvasAttrs | undefined>;
  updateAttr(hash: NodeHash, name: string, value: unknown): Promise<void>;
  onCancel(): void;
}

function AttrsDrawer({ hash, getAttrs, onCancel, updateAttr }: AttrsDrawerProps): JSX.Element | null {
  const [value, setValue] = useState<CanvasAttrs | undefined>();

  const change = useCallback((all: ReactJsonChange) => {
    const { updated_src: updatedSrc, namespace, name } = all;
    const attrs = updatedSrc as CanvasAttrs;
    const key = namespace[0] || name;
    if (!key) {
      return;
    }
    void updateAttr(hash, key, attrs[key]);
  }, [updateAttr, hash]);

  useEffect(() => {
    if (hash) {
      void getAttrs(hash).then((res) => {
        setValue(res);
      });
    } else {
      onCancel();
    }
  }, [getAttrs, hash, onCancel]);

  if (!value || !hash) {
    return null;
  }

  return (
    <Drawer mask={false} onClose={onCancel} visible={Boolean(hash)}>
      <ReactJson
        style={{ fontSize: 12 }}
        onAdd={change}
        onEdit={change}
        onDelete={change}
        src={value}
      />
    </Drawer>
  );
}

export default AttrsDrawer;
