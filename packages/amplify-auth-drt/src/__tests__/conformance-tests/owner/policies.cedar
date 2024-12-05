// ################################################################
// Todo
// ################################################################
@id("permit owners to perform all operations on Todo")
permit (
  principal is AmplifyApi::AmplifyCognitoUserPoolsUser,
  action in
    [AmplifyApi::Action::"SelectionSetResolve.Todo",
     AmplifyApi::Action::"SelectionSetResolve.Todo.id",
     AmplifyApi::Action::"SelectionSetResolve.Todo.content",
     AmplifyApi::Action::"SelectionSetResolve.Todo.owner",
     AmplifyApi::Action::"Query.getTodo",
     AmplifyApi::Action::"Query.getTodo.id",
     AmplifyApi::Action::"Query.getTodo.content",
     AmplifyApi::Action::"Query.getTodo.owner",
     AmplifyApi::Action::"Query.listTodo",
     AmplifyApi::Action::"Query.listTodo.id",
     AmplifyApi::Action::"Query.listTodo.content",
     AmplifyApi::Action::"Query.listTodo.owner",
     AmplifyApi::Action::"Mutation.createTodo",
     AmplifyApi::Action::"Mutation.createTodo.id",
     AmplifyApi::Action::"Mutation.createTodo.content",
     AmplifyApi::Action::"Mutation.createTodo.owner",
     AmplifyApi::Action::"Mutation.updateTodo",
     AmplifyApi::Action::"Mutation.updateTodo.id",
     AmplifyApi::Action::"Mutation.updateTodo.content",
     AmplifyApi::Action::"Mutation.updateTodo.owner",
     AmplifyApi::Action::"Mutation.deleteTodo",
     AmplifyApi::Action::"Mutation.deleteTodo.id",
     AmplifyApi::Action::"Mutation.deleteTodo.content",
     AmplifyApi::Action::"Mutation.deleteTodo.owner"],
     // TODO: Add subscription support
  resource is AmplifyApi::Todo
)
when
{
  resource.owner == principal.subUsername ||
  resource.owner == principal.sub ||
  resource.owner == principal.username
};
