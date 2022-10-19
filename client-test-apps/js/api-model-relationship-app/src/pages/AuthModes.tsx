import { Flex, Heading } from '@aws-amplify/ui-react';
import { useState } from 'react';
import { MultiAuth } from '../API';
import { createModelHarness } from '../components';
import { AuthModePicker } from '../components/AuthModePicker';
import { AuthMode, HarnessContext } from '../components/HarnessContext';
import { createMultiAuth, updateMultiAuth, deleteMultiAuth } from '../graphql/mutations';
import { getMultiAuth, listMultiAuths } from '../graphql/queries';
import { onCreateMultiAuth, onDeleteMultiAuth, onUpdateMultiAuth } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const ModelHarness = createModelHarness<MultiAuth>({
  recordName: 'MultiAuth',
  fields: ['content'],
  createMutation: createMultiAuth,
  updateMutation: updateMultiAuth,
  getQuery: getMultiAuth,
  listQuery: listMultiAuths,
  deleteMutation: deleteMultiAuth,
  onCreateSubscription: onCreateMultiAuth,
  onUpdateSubscription: onUpdateMultiAuth,
  onDeleteSubscription: onDeleteMultiAuth,
  sentinelData: { content: null },
});

export const AuthModes = () => {
  const [authMode, setAuthMode] = useState<AuthMode>();

  return (
    <Flex direction='column'>
      <NavBar />
      <Heading level={1}>Auth Controls</Heading>
      <Flex direction='row'>
        <AuthModePicker onAuthModeUpdates={(updatedAuthMode) => { setAuthMode(updatedAuthMode) }} />
      </Flex>
      <HarnessContext.Provider value={{ authMode }}>
        <ModelHarness />
      </HarnessContext.Provider>
    </Flex>
  );
};
