import { Directive } from "./directive";

const name = 'conversation';
const definition = /* GraphQL */`
  directive @${name}(
    aiModel: String,
    sessionModel: SessionModel,
    eventModel: EventModel
  ) on MUTATION
  input SessionModel {
    name: String
  }
  input EventModel {
    name: String
  }
`
const defaults = {};

export const ConversationDirective: Directive = {
  name,
  definition,
  defaults,
};