/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const generateRecipe = /* GraphQL */ `query GenerateRecipe($description: String) {
  generateRecipe(description: $description) {
    ingredients
    instructions
    name
    __typename
  }
}
` as GeneratedQuery<APITypes.GenerateRecipeQueryVariables, APITypes.GenerateRecipeQuery>;
export const getTodo = /* GraphQL */ `query GetTodo($id: ID!) {
  getTodo(id: $id) {
    content
    createdAt
    id
    isDone
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetTodoQueryVariables, APITypes.GetTodoQuery>;
export const makeTodo = /* GraphQL */ `query MakeTodo($description: String!) {
  makeTodo(description: $description) {
    content
    createdAt
    id
    isDone
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.MakeTodoQueryVariables, APITypes.MakeTodoQuery>;
export const summarize = /* GraphQL */ `query Summarize($input: String) {
  summarize(input: $input)
}
` as GeneratedQuery<APITypes.SummarizeQueryVariables, APITypes.SummarizeQuery>;

export const solveEquation = /* GraphQL */ `query SolveEquation($equation: String) {
  solveEquation(equation: $equation)
}
` as GeneratedQuery<APITypes.SolveEquationQueryVariables, APITypes.SolveEquation>;
