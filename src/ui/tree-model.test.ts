import { describe, expect, it } from 'vitest';

import type { CanvasTree } from '../shared/types';
import { buildTreeData, countDescendants, findTreePath } from './tree-model';

describe('tree-model', () => {
  const canvas: CanvasTree = {
    type: 'renderer',
    name: 'renderer',
    hash: 'canvas-1',
    children: [
      {
        type: 'Group',
        name: 'Group',
        hash: 'group-1',
        attrs: { name: 'hero' },
        children: [
          {
            type: 'Rect',
            name: 'Rect',
            nodeType: 'Shape',
            hash: 'rect-1',
            id: 7,
            attrs: { fill: 'red' },
          },
        ],
      },
    ],
  };

  it('counts descendants without mutating the input tree', () => {
    const before = JSON.stringify(canvas);

    expect(countDescendants(canvas)).toBe(2);
    expect(JSON.stringify(canvas)).toBe(before);
  });

  it('builds Ant Design tree data with renderer root metadata', () => {
    const tree = buildTreeData(canvas, true);

    expect(tree).toMatchObject({
      title: 'Layer',
      type: 'renderer',
      key: 'canvas-1',
      hash: 'canvas-1',
      num: 1,
      count: 2,
    });
    expect(tree.children?.[0]).toMatchObject({
      title: 'Group',
      type: 'group',
      key: 'group-1',
      attrs: { name: 'hero' },
      num: 1,
      count: 1,
    });
    expect(tree.children?.[0].children?.[0]).toMatchObject({
      title: 'Rect',
      type: 'shape',
      key: 'rect-1',
      id: 7,
      count: 0,
    });
  });

  it('finds the ancestor path for a nested node so the tree can reveal it', () => {
    expect(findTreePath(canvas, 'rect-1')).toEqual(['canvas-1', 'group-1', 'rect-1']);
    expect(findTreePath(canvas, 'missing')).toEqual([]);
  });
});
