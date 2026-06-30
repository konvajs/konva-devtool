export function serializeFunctionCall<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => unknown,
  args: TArgs
): string {
  return `(${fn.toString()}).apply(window, ${JSON.stringify(args)})`;
}
