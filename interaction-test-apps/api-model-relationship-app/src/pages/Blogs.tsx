import { Button, Flex, Heading, TextField } from "@aws-amplify/ui-react";
import { API, graphqlOperation } from "aws-amplify";
import { useState } from "react";
import { Todo } from "../API";
import { createTodo } from '../graphql/mutations';
import { listTodos } from '../graphql/queries';
import { NavBar } from "../NavBar";

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
      { todos.length > 0 && (
        <ul>
          { todos.map((todo) => <li key={todo.id}>{ JSON.stringify(todo) }</li>) }
        </ul>
      )}
    </Flex>
  );
};

export const Blogs = () => {
  return (
    <Flex direction={'column'}>
      <NavBar />
      <Heading level={1}>Todo Interaction Tests</Heading>
      <CreateTodo />
      <ListTodos />
    </Flex>
  );
};
