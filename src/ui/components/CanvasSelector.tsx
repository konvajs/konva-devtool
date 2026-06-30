import React from 'react';
import { Select } from 'antd';

import type { CanvasTree, NodeHash } from '../../shared/types';

interface CanvasSelectorProps {
  data: CanvasTree[];
  selectedCanvasHash: NodeHash;
  onChange(hash: NodeHash): void;
}

export default function CanvasSelector({ data, selectedCanvasHash, onChange }: CanvasSelectorProps): JSX.Element {
  return (
    <Select
      bordered={false}
      size="small"
      options={data.map((canvas, index) => ({
        label: `Canvas ${index}`,
        value: canvas.hash,
      }))}
      value={selectedCanvasHash || undefined}
      onChange={onChange}
      style={{ width: '100%' }}
    />
  );
}
