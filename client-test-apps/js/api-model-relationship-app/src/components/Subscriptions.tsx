import { Card, Collection, Flex, Heading } from '@aws-amplify/ui-react';
import { API, graphqlOperation } from 'aws-amplify';
import { useEffect, useState } from 'react';
import Observable from 'zen-observable-ts';
import { CONNECTION_STATE_CHANGE, ConnectionState } from '@aws-amplify/pubsub';
import { Hub } from 'aws-amplify';
import pluralize from 'pluralize';
import _ from 'lodash';

type SubscriptionComponentProps = {
  id: string;
  query: string;
  title: string;
};

const SubscriptionState = () => {
  const [areSubscriptionsReady, setSubscriptionsReady] = useState(false);

  useEffect(() => {
    const hubListener = (data: any) => {
      const { payload } = data;
      if (payload.event === CONNECTION_STATE_CHANGE) {
        const connectionState = payload.data.connectionState as ConnectionState;
        if (connectionState === 'Connected') {
          setSubscriptionsReady(true);
        }
      }
    }

    Hub.listen('api', hubListener);

    return () => Hub.remove('api', hubListener);
  }, []);

  const stateIndicator = areSubscriptionsReady ? '✅' : '❌';

  return (<span id='subscription-state'>{ stateIndicator }</span>);
};

const SubscriptionComponent = ({ id, query, title }: SubscriptionComponentProps) => {
  const [loggedSubscriptionMessages, setSubscriptionMessages] = useState<object[]>([]);

  const appendSubscriptionMessage = (newMessage: object): void => {
    setSubscriptionMessages(oldSubscriptionMessages => [...oldSubscriptionMessages, newMessage]);
  };

  useEffect(() => {
    // Subscribe to creation of Todo
    const request = API.graphql(graphqlOperation(query)) as Observable<object>;
    const subscription = request.subscribe({
      // @ts-ignore
      next: ({ value }) => appendSubscriptionMessage(value),
      error: (error) => console.warn(error)
    });

    // Stop receiving data updates from the subscription on unmount
    return () => subscription.unsubscribe();
  }, [title, query]);

  return (
    <Flex id={id} direction='column'>
      <Heading level={5}>{ title }</Heading>
      <Collection
        items={loggedSubscriptionMessages}
          type='list'
          direction='column-reverse'
          gap='20px'
          wrap='nowrap'
        >
          {(msg, idx) => <Card maxWidth={'400px'} key={idx} variation='elevated'>{ JSON.stringify(msg) }</Card> }
      </Collection>
    </Flex>);
};

type SubscriptionsProps = {
  recordName: string;
  createSubscriptionQuery: string;
  updateSubscriptionQuery: string;
  deleteSubscriptionQuery: string;
}

export const Subscriptions = ({ recordName, createSubscriptionQuery, updateSubscriptionQuery, deleteSubscriptionQuery }: SubscriptionsProps) => {
  return (
    <Flex direction='column'>
      <Flex direction='row'>
        <Heading level={2}>Subscriptions</Heading>
        <SubscriptionState />
      </Flex>
      <SubscriptionComponent id={`created-${pluralize(recordName)}-subscription`} query={createSubscriptionQuery} title={`Created ${_.capitalize(recordName)} Events`} />
      <SubscriptionComponent id={`updated-${pluralize(recordName)}-subscription`} query={updateSubscriptionQuery} title={`Updated ${_.capitalize(recordName)} Events`} />
      <SubscriptionComponent id={`deleted-${pluralize(recordName)}-subscription`} query={deleteSubscriptionQuery} title={`Deleted ${_.capitalize(recordName)} Events`} />
    </Flex>
  );
};
