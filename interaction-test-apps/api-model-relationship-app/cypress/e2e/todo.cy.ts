/// <reference types='cypress' />

const uuid = () => Cypress._.random(0, 1e6)

const PAGE_ROUTE = 'http://localhost:3000/todos';
const TEST_ID = `${uuid()}`;
const SUCCESS_MARK = '✅';
const FAILURE_MARK = '❌';
const PAGE_TITLE = 'Todo Controls';
const UPDATED_TITLE = `updated todo content ${TEST_ID}`;

/**
 * It's not great practice, but these tests rely on being in-order for now.
 */
describe('todo interactions', () => {
  before(() => {
    cy.visit(PAGE_ROUTE)
  });

  describe('page state is stable', () => {
    it('loads', () => {
      cy.contains(PAGE_TITLE);
    })
  
    it('initializes subscriptions', () => {
      cy.get('#subscription-state').contains(SUCCESS_MARK);
    })
  });

  describe('create', () => {
    it('creates a todo', () => {
      cy.get('#todo-id-input').clear().type(TEST_ID);
      cy.get('#todo-create').click();
      cy.get('#todo-is-created').within(() => { cy.contains(SUCCESS_MARK) });
    });

    it('does not allow creation of a todo with identical id', () => {
      cy.get('#todo-id-input').clear().type(TEST_ID);
      cy.get('#todo-create').click();
      cy.get('#todo-is-created').within(() => { cy.contains(FAILURE_MARK) });
    });

    it('subscription observes todo creation', () => {
      cy.get('#created-todos-subscription').within(() => { cy.contains(TEST_ID) });
    });

    it('gets a created todo by id', () => {
      cy.get('#retrieve-todo-id').clear().type(TEST_ID);
      cy.get('#retrieve-todo-button').click();
      cy.get('#todo-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#retrieved-todo').contains(TEST_ID);
    });

    it('lists the created todos', () => {
      cy.get('#list-todos').click();
      cy.get('#todos-are-listed').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#listed-todos').contains(TEST_ID);
    });
  });

  describe('update', () => {
    it('updates a todo', () => {
      // Load the todo
      cy.get('#retrieve-todo-id').clear().type(TEST_ID);
      cy.get('#retrieve-todo-button').click();
      cy.get('#todo-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#retrieved-todo').contains(TEST_ID);

      // Go to Edit State, Update, and Save
      cy.get('#retrieved-todo').within(() => {
        cy.contains('Edit').click();
        cy.get('#update-content-input').clear().type(UPDATED_TITLE);
        cy.get('#update-content').click();
        cy.get('#todo-is-updated').contains(SUCCESS_MARK);
      });
    });

    it('subscription observes todo update', () => {
      cy.get('#updated-todos-subscription').within(() => { cy.contains(UPDATED_TITLE) });
    });

    it('lists the updated todo', () => {
      cy.get('#list-todos').click();
      cy.get('#todos-are-listed').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#listed-todos').contains(UPDATED_TITLE);
    });
  });

  describe('delete', () => {
    it('deletes a retrieved todo', () => {
      // Load the todo
      cy.get('#retrieve-todo-id').clear().type(TEST_ID);
      cy.get('#retrieve-todo-button').click();
      cy.get('#todo-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#retrieved-todo').contains(TEST_ID);

      // Deletes
      cy.get('#retrieved-todo').within(() => {
        cy.get('#delete-todo').click();
        cy.get('#todo-is-updated').contains(SUCCESS_MARK);
      });

      // Does not reload
      cy.get('#retrieve-todo-id').clear().type(TEST_ID);
      cy.get('#retrieve-todo-button').click();
      cy.get('#todo-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#retrieved-todo').contains(TEST_ID).should('not.exist');
    });

    it('subscription observes todo deletion', () => {
      cy.get('#deleted-todos-subscription').within(() => { cy.contains(TEST_ID) });
    });

    it('no longer gets deleted todo in list', () => {
      cy.get('#list-todos').click();
      cy.get('#todos-are-listed').within(() => { cy.contains(SUCCESS_MARK) });
      cy.get('#listed-todos').contains(TEST_ID).should('not.exist');
    });
  });
});
