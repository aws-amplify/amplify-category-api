/// <reference types='cypress' />


const uuid = () => Cypress._.random(0, 1e6)

const TEST_ID = `${uuid()}`;
const PAGE_ROUTE = 'http://localhost:3000/auth-modes';
const SUCCESS_MARK = '✅';
const FAILURE_MARK = '❌';
const PAGE_TITLE = 'Multiauth Controls';

/**
 * It's not great practice, but these tests rely on being in-order for now.
 */
describe('auth-mode interactions', () => {
  before(() => {
    cy.visit(PAGE_ROUTE)
  });

  describe('page state is stable', () => {
    it('loads', () => {
      cy.contains(PAGE_TITLE);
    })
  
    /**
     * Non-owner based subscriptions work for models which also have owner-based auth attached.
     */
    it('initializes subscriptions when owner auth is not selected, despite existing on the model', () => {
      cy.get('#subscription-state').contains(SUCCESS_MARK);
    })
  });

  describe('simple create model emits an event', () => {
    it('creates a record and sees the result in the observable', () => {
      cy.get('#MultiAuth-id-input').clear().type(TEST_ID);
      cy.get('#MultiAuth-create').click();
      cy.get('#MultiAuth-is-created').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#created-MultiAuths-subscription').within(() => { cy.contains(TEST_ID) });
    });
  });
});
