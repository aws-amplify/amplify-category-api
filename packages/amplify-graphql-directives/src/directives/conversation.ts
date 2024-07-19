import { Directive } from './directive';

const name = 'conversation';
// const definition = /* GraphQL */`
//   directive @${name}(
//     aiModel: String,
//     sessionModel: SessionModel,
//     eventModel: EventModel
//   ) on FIELD_DEFINITION
//   input SessionModel {
//     name: String
//   }
//   input EventModel {
//     name: String
//   }
// `;

const definition = /* GraphQL */ `
  directive @${name}(
    aiModel: String,
    functionName: String,
    systemPrompt: String
  ) on FIELD_DEFINITION
`;
const defaults = {};

export const ConversationDirective: Directive = {
  name,
  definition,
  defaults,
};

/*
Params to add:
 - function name
 -
*/
