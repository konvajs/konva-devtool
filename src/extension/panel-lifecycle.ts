export interface TabChangeInfo {
  status?: string;
}

export function shouldReinstallRuntimeForTabUpdate(
  inspectedTabId: number,
  updatedTabId: number,
  changeInfo: TabChangeInfo
): boolean {
  return inspectedTabId === updatedTabId && changeInfo.status === 'complete';
}
