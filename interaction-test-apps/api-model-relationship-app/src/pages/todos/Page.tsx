import { Button, Card, Collection, Flex, Heading, TextField } from '@aws-amplify/ui-react';
import { API, graphqlOperation } from 'aws-amplify';
import { useState } from 'react';
import { Todo } from '../../API';
import { createTodo, updateTodo, deleteTodo } from '../../graphql/mutations';
import { listTodos, getTodo } from '../../graphql/queries';
import { NavBar } from '../../NavBar';
import {
  CreatedTodosSubscription,
  DeletedTodosSubscription,
  SubscriptionState,
  UpdatedTodosSubscription,
} from './Observers';

type DetailState = 'view' | 'edit';

type OperationState = 'NotStarted' | 'Succeeded' | 'Failed';

const OperationStateIndicator = ({ id, state }: { id: string, state: OperationState }) => {
  if (state === 'NotStarted') return null;
  return <span id={id}>{ state === 'Succeeded' ? '✅' : '❌' }</span>;
}

const TodoDetail = ({ todo }: { todo: Todo }) => {
  const [opState, setState] = useState<OperationState>('NotStarted');
  const [detailState, setDetailState] = useState<DetailState>('view');

  const makeDeleteRequest = async () => {
    try {
      setState('NotStarted');
      await API.graphql(graphqlOperation(deleteTodo, { input: { id: todo.id } }));
      setState('Succeeded');
    } catch (e) {
      setState('Failed');
    }
  };

  return (
    <Card variation='elevated'>
      <Heading level={5}>Todo</Heading>
      <span>ID: { todo.id }</span>
      { detailState === 'view'
        ? <ViewTodoContents todo={todo} />
        : <EditTodoContents todo={todo} />
      }
      <Button id='delete-todo' size='small' onClick={makeDeleteRequest}>Delete</Button>
      <OperationStateIndicator id='todo-is-deleted' state={opState} />
      { detailState === 'view'
        ? <Button size='small' onClick={() => setDetailState('edit')}>Edit</Button>
        : <Button size='small' onClick={() => setDetailState('view')}>View</Button>
      }
    </Card>
  );
};

const ViewTodoContents = ({ todo }: { todo: Todo }) => {
  return <p>{ todo.content }</p>;
};

const EditTodoContents = ({ todo }: { todo: Todo }) => {
  const [opState, setState] = useState<OperationState>('NotStarted');
  const [updatedContent, setUpdatedContent] = useState(todo.content);

  const updateTodoContents = async () => {
    try {
      setState('NotStarted');
      await API.graphql(graphqlOperation(updateTodo, { input: { id: todo.id, content: updatedContent} }));
      setState('Succeeded');
    } catch (e) {
      setState('Failed');
    }
  };

  return (
    <Flex direction='row'>
      <TextField id='update-content-input' label='Updated Content' labelHidden placeholder={ todo.content || '' } onChange={(event: any) => {
        setUpdatedContent(event.target.value);
      }} />
      <Button id='update-content' onClick={updateTodoContents}>Update</Button>
      <OperationStateIndicator id='todo-is-updated' state={opState} />
    </Flex>
  );
};

const CreateTodo = () => {
  const [opState, setState] = useState<OperationState>('NotStarted');
  const [id, setId] = useState('');

  const todoSentinel = {
    content: 'created todo',
    metadata: {
      targetCompletionDate: '2021-10-13',
      percentChanceOfCompletion: 0.75,
    },
  };

  const mutate = async () => {
    try {
      setState('NotStarted');
      await API.graphql(graphqlOperation(createTodo, { input: { ...todoSentinel, id } }));
      setState('Succeeded');
    } catch (e) {
      setState('Failed');
    }
  };

  return (
    <Flex direction='column'>
      <Heading level={3}>Create A Todo</Heading>
      <Flex direction='row'>
        <TextField id='todo-id-input' label='Test Id' onChange={(event: any) => { setId(event.target.value) }}/>
        <Button id='todo-create' onClick={mutate}>Create Todo</Button>
        <OperationStateIndicator id='todo-is-created' state={opState} />
      </Flex>
    </Flex>
  );
};

const GetTodo = () => {
  const [opState, setState] = useState<OperationState>('NotStarted');
  const [id, setId] = useState('');
  const [retrievedTodo, setRetrievedTodo] = useState<Todo | undefined>();

  const retrieve = async () => {
    try {
      setState('NotStarted');
      const response = await API.graphql(graphqlOperation(getTodo, { id }));
      // @ts-ignore
      setRetrievedTodo(response.data.getTodo);
      setState('Succeeded');
    } catch (e) {
      setState('Failed');
    }
  };

  return (
    <Flex direction='column'>
      <Heading level={3}>Get A Todo</Heading>
      <Flex direction='row'>
        <TextField id='retrieve-todo-id' label='Todo Id' onChange={(event: any) => { setId(event.target.value) }}/>
        <Button id='retrieve-todo-button' onClick={retrieve}>Get Todo</Button>
        <OperationStateIndicator id='todo-is-retrieved' state={opState} />
      </Flex>
      <div id='retrieved-todo'>
        { retrievedTodo && <TodoDetail todo={retrievedTodo} /> }
      </div>
    </Flex>
  );
};

const ListTodos = () => {
  const [opState, setState] = useState<OperationState>('NotStarted');
  const [todos, setTodos] = useState<Todo[]>([]);

  const query = async () => {
    try {
      setState('NotStarted');
      const response = await API.graphql({ query: listTodos }) as any;
      setTodos(response.data.listTodos.items);
      setState('Succeeded');
    } catch (e) {
      setState('Failed');
    }
  };

  return (
    <Flex direction='column'>
      <Heading level={3}>List Todos</Heading>
      <Flex direction='row'>
        <Button id='list-todos' onClick={query}>Load Todos</Button>
        <OperationStateIndicator id='todos-are-listed' state={opState} />
      </Flex>
      <div id='listed-todos'>
        <Collection
          items={todos}
          type='list'
          direction='column'
          gap='20px'
          wrap='nowrap'
        >
          {(todo) => <TodoDetail key={todo.id} todo={todo} /> }
        </Collection>
      </div>
    </Flex>
  );
};

export const Page = () => {
  return (
    <Flex direction='column'>
      <NavBar />
      <Heading level={1}>Todo Interaction Tests</Heading>
      <Flex direction='row'>
        <Flex direction='column'>
          <Heading level={2}>CRUDL Actions</Heading>
          <CreateTodo />
          <GetTodo />
          <ListTodos />
        </Flex>
        <Flex direction='column'>
          <Flex direction='row'>
            <Heading level={2}>Subscriptions</Heading>
            <SubscriptionState />
          </Flex>
          <CreatedTodosSubscription />
          <UpdatedTodosSubscription />
          <DeletedTodosSubscription />
        </Flex>
      </Flex>
    </Flex>
  );
};
