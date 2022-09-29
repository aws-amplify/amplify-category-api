import { useState } from "react";

type OperationState = 'NotStarted' | 'Succeeded' | 'Failed';

export const OperationStateIndicator = ({ id, state }: { id: string, state: OperationState }) => {
  if (state === 'NotStarted') return null;
  return <span id={id}>{ state === 'Succeeded' ? '✅' : '❌' }</span>;
}

export const useOperationStateWrapper = <T extends Array<any>>(fn: (...args: T) => Promise<any>): { wrappedFn: (...args: T) => Promise<void>, opState: OperationState } => {
  const [opState, setState] = useState<OperationState>('NotStarted');

  const wrappedFn = async (...args: T): Promise<void> => {
    setState('NotStarted')
    try {
      await fn(...args);
      setState('Succeeded');
    } catch (e) {
      console.error(e);
      setState('Failed');
    }
  };

  return { wrappedFn, opState };
};
