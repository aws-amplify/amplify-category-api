import { Flex } from '@aws-amplify/ui-react';
import { Todo } from '../API';
import { createModelHarness } from '../components';
import { createTodo, updateTodo, deleteTodo } from '../graphql/mutations';
import { listTodos, getTodo } from '../graphql/queries';
import { onCreateTodo, onDeleteTodo, onUpdateTodo } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const TodoHarness = createModelHarness<Todo>({
  recordName: 'todo',
  fields: ['content'],
  createMutation: createTodo,
  updateMutation: updateTodo,
  getQuery: getTodo,
  listQuery: listTodos,
  deleteMutation: deleteTodo,
  onCreateSubscription: onCreateTodo,
  onUpdateSubscription: onUpdateTodo,
  onDeleteSubscription: onDeleteTodo,
  sentinelData: {
    content: 'created todo',
    metadata: {
      targetCompletionDate: '2021-10-13',
      percentChanceOfCompletion: 0.75,
    },
  },
});

export const Todos = () => {
  return (
    <Flex direction='column'>
      <NavBar />
      <TodoHarness />
    </Flex>
  );
};
