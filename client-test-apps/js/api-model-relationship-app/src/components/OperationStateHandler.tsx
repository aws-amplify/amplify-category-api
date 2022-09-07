import { useState } from "react";

type OperationState = 'NotStarted' | 'Succeeded' | 'Failed';

export const OperationStateIndicator = ({ id, state }: { id: string, state: OperationState }) => {
  if (state === 'NotStarted') return null;
  return <span id={id}>{ state === 'Succeeded' ? '✅' : '❌' }</span>;
}

export const useOperationStateWrapper = (fn: () => Promise<any>): { wrappedFn: () => Promise<void>, opState: OperationState } => {
  const [opState, setState] = useState<OperationState>('NotStarted');

  const wrappedFn = async () => {
    setState('NotStarted')
    try {
      await fn();
      setState('Succeeded');
    } catch (e) {
      console.error(e);
      setState('Failed');
    }
  };

  return { wrappedFn, opState };
};