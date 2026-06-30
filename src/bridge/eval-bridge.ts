import { InspectedWindowEvalError } from './protocol';
import { serializeFunctionCall } from './serialization';

export interface InspectedWindowEvalAdapter {
  eval(script: string, callback: (result: unknown, exception?: unknown) => void): void;
}

export interface InspectedPageBridge {
  evaluate<TResult>(script: string): Promise<TResult>;
  execute<TArgs extends readonly unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
    args: TArgs
  ): Promise<TResult>;
}

export function createEvalBridge(adapter: InspectedWindowEvalAdapter): InspectedPageBridge {
  function evaluate<TResult>(script: string): Promise<TResult> {
    return new Promise((resolve, reject) => {
      adapter.eval(script, (result, exception) => {
        if (exception) {
          reject(new InspectedWindowEvalError(exception));
          return;
        }

        resolve(result as TResult);
      });
    });
  }

  return {
    evaluate,
    execute(fn, args) {
      return evaluate<Awaited<ReturnType<typeof fn>>>(serializeFunctionCall(fn, args));
    },
  };
}
