
import { Flex, Heading } from '@aws-amplify/ui-react';
import _ from 'lodash';
import { createCRUDLControls, createCRUDLControlsProps, Subscriptions } from '../components';

export type createModelHarnessProps<T> = createCRUDLControlsProps<T> & {
  onCreateSubscription: string;
  onUpdateSubscription: string;
  onDeleteSubscription: string;
}

export const createModelHarness = <T extends object>(props: createModelHarnessProps<T>) => {
  return () => {
    const CRUDLControls = createCRUDLControls(props);
    const { recordName, onCreateSubscription, onUpdateSubscription, onDeleteSubscription } = props;
    return (
      <Flex direction='column'>
        <Heading level={1}>{ _.capitalize(recordName) } Controls</Heading>
        <Flex direction='row'>
          <CRUDLControls />
          <Subscriptions
            recordName={recordName}
            createSubscriptionQuery={onCreateSubscription}
            updateSubscriptionQuery={onUpdateSubscription}
            deleteSubscriptionQuery={onDeleteSubscription}
          />
        </Flex>
      </Flex>
    );
  };
};