/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type Recipe = {
  __typename: 'Recipe';
  ingredients: Array< string >,
  instructions: string,
  name: string,
};

export type Todo = {
  __typename: 'Todo';
  content?: string | null;
  createdAt: string;
  id: string;
  isDone?: boolean | null;
  updatedAt: string;
};

export type GenerateRecipeQueryVariables = {
  description?: string | null;
};

export type GenerateRecipeQuery = {
  generateRecipe?:  {
    __typename: "GenerateRecipeReturnType",
    ingredients: Array< string >,
    instructions: string,
    name: string,
  } | null,
};

export type GetTodoQueryVariables = {
  id: string;
};

export type GetTodoQuery = {
  getTodo?: {
    __typename: 'Todo';
    content?: string | null;
    createdAt: string;
    id: string;
    isDone?: boolean | null;
    updatedAt: string;
  } | null;
};

export type MakeTodoQueryVariables = {
  description: string;
};

export type MakeTodoQuery = {
  makeTodo?: {
    __typename: 'Todo';
    content?: string | null;
    createdAt: string;
    id: string;
    isDone?: boolean | null;
    updatedAt: string;
  } | null;
};

export type SummarizeQueryVariables = {
  input?: string | null;
};

export type SummarizeQuery = {
  summarize?: string | null;
};

export type SolveEquationQueryVariables = {
  equation?: string | null;
};

export type SolveEquation = {
  solveEquation?: number | null;
};
