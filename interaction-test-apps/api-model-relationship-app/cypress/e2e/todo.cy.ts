/// <reference types="cypress" />

const uuid = () => Cypress._.random(0, 1e6)

describe('todo interactions', () => {
  before(() => {
    cy.visit('http://localhost:3000/todos')
  });

  it('loads', () => {
    cy.contains('Todo Interaction Tests');
  })

  describe('create todos', () => {
    const testId = uuid();

    it('successfully saves a todo that you an read', () => {
      cy.get('#todo-text-input').type(`entered from cypress:${testId}`);
      cy.get('#todo-create').click();
      cy.get('#todo-is-created').within(() => {
        cy.contains('✅');
      });
    });

    it('can observes todo creation', () => {
      cy.get('#created-todos-subscription').within(() => {
        cy.contains(`entered from cypress:${testId}`);
      });
    });

    it('gets a created todo by id', () => {});

    it('can list the created todos', () => {
      cy.get('#load-todos').click();
      cy.contains(`entered from cypress:${testId}`)
    });
  });
});
