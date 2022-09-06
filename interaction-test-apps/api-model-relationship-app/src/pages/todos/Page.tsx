import { Button, Card, Collection, Flex, Heading, TextField } from "@aws-amplify/ui-react";
import { API, graphqlOperation } from "aws-amplify";
import { useState } from "react";
import { Todo } from "../../API";
import { createTodo, updateTodo, deleteTodo } from '../../graphql/mutations';
import { listTodos, getTodo } from '../../graphql/queries';
import { NavBar } from "../../NavBar";
import {
  CreatedTodosSubscription,
  DeletedTodosSubscription,
  UpdatedTodosSubscription,
} from "./Observers";

type DetailState = 'view' | 'edit';

const TodoDetail = ({ todo }: { todo: Todo }) => {
  const [detailState, setDetailState] = useState<DetailState>('view');

  const makeDeleteRequest = async () => {
    await API.graphql(graphqlOperation(deleteTodo, { input: { id: todo.id } }));
  };

  const toggleDetailState = () => {
    setDetailState(oldState => oldState === 'view' ? 'edit' : 'view');
  };

  return (
    <Card variation="elevated">
      <Heading level={5}>Todo</Heading>
      { detailState === 'view'
        ? <ViewTodoContents todo={todo} />
        : <EditTodoContents todo={todo} />
      }
      <Button size="small" onClick={makeDeleteRequest}>Delete</Button>
      <Button size="small" onClick={toggleDetailState}>Edit/View</Button>
    </Card>
  );
};

const ViewTodoContents = ({ todo }: { todo: Todo }) => {
  return <p>{ todo.content }</p>;
};

const EditTodoContents = ({ todo }: { todo: Todo }) => {
  const [updatedContent, setUpdatedContent] = useState(todo.content);

  const updateTodoContents = async () => {
    await API.graphql(graphqlOperation(updateTodo, { input: { id: todo.id, content: updatedContent} }));
  };

  return (
    <Flex direction='row'>
      <TextField label='Updated Content' labelHidden placeholder={ todo.content || '' } onChange={(event: any) => {
        setUpdatedContent(event.target.value);
      }} />
      <Button onClick={updateTodoContents}>Update</Button>
    </Flex>
  );
};

const CreateTodo = () => {
  const [isCreated, setCreated] = useState(false);
  const [content, setContents] = useState('');

  const mutate = async () => {
    await API.graphql(graphqlOperation(createTodo, { input: { content } }));
    setCreated(true);
  };

  return (
    <Flex>
      <Heading level={3}>Create A Todo</Heading>
      <TextField id="todo-text-input" label="Todo Text" onChange={(event: any) => {
        setContents(event.target.value);
      }}/>
      <Button id="todo-create" onClick={mutate}>Create Todo</Button>
      { isCreated && <div id="todo-is-created">✅</div> }
    </Flex>
  );
};

const GetTodo = () => {
  const [idToRetrieve, setIdToRetrieve] = useState('');
  const [retrievedTodo, setRetrievedTodo] = useState<Todo | undefined>();

  const retrieve = async () => {
    const response = await API.graphql(graphqlOperation(getTodo, { id: idToRetrieve }));
    // @ts-ignore
    setRetrievedTodo(response.data.getTodo);
  };

  return (
    <Flex>
      <Heading level={3}>Get A Todo</Heading>
      <TextField label="Todo Id" onChange={(event: any) => {
        setIdToRetrieve(event.target.value);
      }}/>
      <Button onClick={retrieve}>Get Todo</Button>
      { retrievedTodo && <TodoDetail todo={retrievedTodo} /> }
    </Flex>
  );
};

const ListTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const query = async () => {
    const response = await API.graphql({ query: listTodos }) as any;
    setTodos(response.data.listTodos.items);
  };

  return (
    <Flex>
      <Heading level={3}>List Todos</Heading>
      <Button id="load-todos" onClick={query}>Load Todos</Button>
      <Collection
        items={todos}
          type="list"
          direction="row"
          gap="20px"
          wrap="nowrap"
        >
          {(todo) => <TodoDetail key={todo.id} todo={todo} /> }
      </Collection>
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
          <Heading level={2}>Subscriptions</Heading>
          <CreatedTodosSubscription />
          <UpdatedTodosSubscription />
          <DeletedTodosSubscription />
        </Flex>
      </Flex>
    </Flex>
  );
};
