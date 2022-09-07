import { Flex, Heading } from '@aws-amplify/ui-react';
import { Todo } from '../API';
import { createCreateRecordComponent, createDetailComponent, createEditComp, createGetRecordComponent, createListComponent, createViewComp, Subscriptions } from '../components';
import { createTodo, updateTodo, deleteTodo } from '../graphql/mutations';
import { listTodos, getTodo } from '../graphql/queries';
import { onCreateTodo, onDeleteTodo, onUpdateTodo } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const commonProps = {
  recordName: 'todo',
  createMutation: createTodo,
  updateMutation: updateTodo,
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

const ViewTodo = createViewComp<Todo>({ ...commonProps, fields: ['content'] });

const EditTodo = createEditComp<Todo>({ ...commonProps, fields: ['content'] });

const TodoDetail = createDetailComponent({
  ...commonProps,
  ViewComp: ViewTodo,
  EditComp: EditTodo,
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
