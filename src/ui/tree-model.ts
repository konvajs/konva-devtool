import type { CanvasAttrs, CanvasTree, NodeHash } from '../shared/types';

export interface CanvasTreeData {
  title: string;
  type: 'renderer' | 'group' | 'shape';
  key: NodeHash;
  name: string;
  id?: string | number;
  hash: NodeHash;
  count: number;
  num: number;
  attrs?: CanvasAttrs;
  children?: CanvasTreeData[];
}

export function countDescendants(tree?: CanvasTree): number {
  if (!tree?.children?.length) {
    return 0;
  }

  return tree.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

export function buildTreeData(data: CanvasTree, isRoot = false): CanvasTreeData {
  const children = data.children?.map((child) => buildTreeData(child));
  const hasChildren = Boolean(children?.length);
  const normalizedType = isRoot ? 'renderer' : data.type === 'group' || data.type === 'Group' ? 'group' : 'shape';

  return {
    title: isRoot ? 'Layer' : data.type,
    type: normalizedType,
    key: data.hash,
    name: data.name,
    id: data.id,
    hash: data.hash,
    count: countDescendants(data),
    num: data.children?.length ?? 0,
    attrs: data.attrs,
    ...(hasChildren ? { children } : {}),
  };
}

export function findTreePath(data: CanvasTree, targetHash: NodeHash): NodeHash[] {
  if (data.hash === targetHash) {
    return [data.hash];
  }

  for (const child of data.children ?? []) {
    const childPath = findTreePath(child, targetHash);

    if (childPath.length) {
      return [data.hash, ...childPath];
    }
  }

  return [];
}
