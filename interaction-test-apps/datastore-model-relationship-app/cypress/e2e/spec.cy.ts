describe('empty spec', () => {
  before(() => {
    cy.visit('http://localhost:3000')
  });

  it('loads', () => {
    cy.contains('Todo Interaction Tests');
  })

  it('successfully saves a todo that you an read', () => {
    // Save
    cy.get('#todo-text-input').type('entered from cypress');
    cy.get('#todo-create').click();
    cy.get('#todo-is-created').within(() => {
      cy.contains('✅');
    });

    // Load
    cy.get('#load-todos').click();
    cy.contains('"content":"entered from cypress"')
  });
})