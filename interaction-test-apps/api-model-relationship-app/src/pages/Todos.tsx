import { Button, Flex, Heading, TextField } from '@aws-amplify/ui-react';
import { API, graphqlOperation } from 'aws-amplify';
import { useState } from 'react';
import { Todo } from '../API';
import { createCreateRecordComponent, createDetailComponent, createGetRecordComponent, createListComponent, OperationStateIndicator, SimpleIdRecordProps, Subscriptions, useOperationStateWrapper } from '../components';
import { createTodo, updateTodo, deleteTodo } from '../graphql/mutations';
import { listTodos, getTodo } from '../graphql/queries';
import { onCreateTodo, onDeleteTodo, onUpdateTodo } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const commonProps = {
  recordName: 'todo',
  createMutation: createTodo,
  getQuery: getTodo,
  listQuery: listTodos,
  deleteMutation: deleteTodo,
};

const CreateTodo = createCreateRecordComponent({
  ...commonProps,
  sentinelData: {
    content: 'created todo',
    metadata: {
      targetCompletionDate: '2021-10-13',
      percentChanceOfCompletion: 0.75,
    },
  },
});

// View/Edit are a little tougher to make super generic, just injecting them instead.
const ViewTodoContents = ({ record }: SimpleIdRecordProps<Todo>) => {
  return <p>{ record.content }</p>;
};

const EditTodoContents = ({ record }: SimpleIdRecordProps<Todo>) => {
  const [updatedContent, setUpdatedContent] = useState(record.content);
  const { wrappedFn, opState } = useOperationStateWrapper(async () => await API.graphql(graphqlOperation(updateTodo, { input: { id: record.id, content: updatedContent} })));

  return (
    <Flex direction='row'>
      <TextField id='update-content-input' label='Updated Content' labelHidden placeholder={ record.content || '' } onChange={(event: any) => {
        setUpdatedContent(event.target.value);
      }} />
      <Button id='update-content' onClick={wrappedFn}>Update</Button>
      <OperationStateIndicator id='todo-is-updated' state={opState} />
    </Flex>
  );
};

const TodoDetail = createDetailComponent({
  ...commonProps,
  ViewComp: ViewTodoContents,
  EditComp: EditTodoContents,
});

const GetTodo = createGetRecordComponent({
  ...commonProps,
  DetailComp: TodoDetail,
});

const ListTodos = createListComponent({
  ...commonProps,
  DetailComp: TodoDetail,
});

export const Todos = () => {
  return (
    <Flex direction='column'>
      <NavBar />
      <Heading level={1}>Todo Controls</Heading>
      <Flex direction='row'>
        <Flex direction='column'>
          <Heading level={2}>CRUDL Actions</Heading>
          <CreateTodo />
          <GetTodo />
          <ListTodos />
        </Flex>
        <Subscriptions
          recordName='todo'
          createSubscriptionQuery={onCreateTodo}
          updateSubscriptionQuery={onUpdateTodo}
          deleteSubscriptionQuery={onDeleteTodo}
        />
      </Flex>
    </Flex>
  );
};
