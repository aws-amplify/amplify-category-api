import { assertStackCanBeUpdated, formatRollbackCompleteStackMessage } from '../cdk-deploy-preflight';

describe('cdk deploy command helpers', () => {
  it('formats ROLLBACK_COMPLETE remediation without suggesting automatic deletion', () => {
    const message = formatRollbackCompleteStackMessage('TestStack');

    expect(message).toContain('ROLLBACK_COMPLETE');
    expect(message).toContain('Delete the failed stack after reviewing any stateful resources');
    expect(message).toContain('new stack name/environment');
    expect(message).not.toContain('automatically');
  });

  it('fails fast before deploy when a stack is in ROLLBACK_COMPLETE', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({ Stacks: [{ StackStatus: 'ROLLBACK_COMPLETE' }] }),
    };

    await expect(assertStackCanBeUpdated('TestStack', client)).rejects.toThrow(formatRollbackCompleteStackMessage('TestStack'));
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('allows deploy preflight to continue when the stack does not exist yet', async () => {
    const client = {
      send: jest.fn().mockRejectedValue(Object.assign(new Error('Stack with id TestStack does not exist'), { name: 'ValidationError' })),
    };

    await expect(assertStackCanBeUpdated('TestStack', client)).resolves.toBeUndefined();
  });
});
