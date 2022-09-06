import { Card, Collection, Flex, Heading } from "@aws-amplify/ui-react";
import { API, graphqlOperation } from "aws-amplify";
import { useEffect, useState } from "react";
import { onCreateTodo, onUpdateTodo, onDeleteTodo } from '../../graphql/subscriptions';
import Observable from 'zen-observable-ts';

type SubscriptionComponentProps = {
  id: string;
  subscriptionQuery: string;
  title: string;
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
  }, [subscriptionQuery]);

  return (
    <Flex id={id} direction='column'>
      <Heading level={5}>{ title }</Heading>
      <Collection
        items={loggedSubscriptionMessages}
          type='list'
          direction='column'
          gap='20px'
          wrap='nowrap'
        >
          {(msg, idx) => <Card key={idx} variation='elevated'>{ JSON.stringify(msg) }</Card> }
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
