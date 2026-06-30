let counter = 0;

export function createHash(prefix = 'kd'): string {
  counter += 1;
  return `${prefix}-${counter.toString(16)}`;
}

export function resetHashCounterForTests(): void {
  counter = 0;
}
