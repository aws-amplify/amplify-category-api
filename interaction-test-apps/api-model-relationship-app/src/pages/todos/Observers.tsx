import { Card, Collection, Flex, Heading } from '@aws-amplify/ui-react';
import { API, graphqlOperation } from 'aws-amplify';
import { useEffect, useState } from 'react';
import { onCreateTodo, onUpdateTodo, onDeleteTodo } from '../../graphql/subscriptions';
import Observable from 'zen-observable-ts';
import { CONNECTION_STATE_CHANGE, ConnectionState } from '@aws-amplify/pubsub';
import { Hub } from 'aws-amplify';

type SubscriptionComponentProps = {
  id: string;
  subscriptionQuery: string;
  title: string;
};

export const SubscriptionState = () => {
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

const SubscriptionComponent = ({ id, subscriptionQuery, title }: SubscriptionComponentProps) => {
  const [loggedSubscriptionMessages, setSubscriptionMessages] = useState<object[]>([]);

  const appendSubscriptionMessage = (newMessage: object): void => {
    setSubscriptionMessages(oldSubscriptionMessages => [...oldSubscriptionMessages, newMessage]);
  };

  useEffect(() => {
    // Subscribe to creation of Todo
    const query = API.graphql(graphqlOperation(subscriptionQuery)) as Observable<object>;
    const subscription = query.subscribe({
      // @ts-ignore
      next: ({ value }) => appendSubscriptionMessage(value),
      error: (error) => console.warn(error)
    });

    // Stop receiving data updates from the subscription on unmount
    return () => subscription.unsubscribe();
  }, [title, subscriptionQuery]);

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

export const CreatedTodosSubscription = () => {
  return <SubscriptionComponent id='created-todos-subscription' subscriptionQuery={onCreateTodo} title='Created Todo Events' />
};

export const UpdatedTodosSubscription = () => {
  return <SubscriptionComponent id='updated-todos-subscription' subscriptionQuery={onUpdateTodo} title='Updated Todo Events' />
};

export const DeletedTodosSubscription = () => {
  return <SubscriptionComponent id='deleted-todos-subscription' subscriptionQuery={onDeleteTodo} title='Deleted Todo Events' />
};
