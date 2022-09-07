/// <reference types='cypress' />

const uuid = () => Cypress._.random(0, 1e6)

const PAGE_ROUTE = 'http://localhost:3000/blogs';
const TEST_ID = `${uuid()}`;
const SUCCESS_MARK = '✅';
const FAILURE_MARK = '❌';
const PAGE_TITLE = 'Blog Controls';
const UPDATED_TITLE = `updated blog title ${TEST_ID}`;

/**
 * It's not great practice, but these tests rely on being in-order for now.
 */
describe('blog page', () => {
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

  describe('blog interactions', () => {
    describe('create', () => {
      it('creates a blog', () => {
        cy.get('#blog-id-input').clear().type(TEST_ID);
        cy.get('#blog-create').click();
        cy.get('#blog-is-created').within(() => { cy.contains(SUCCESS_MARK) });
      });

      it('does not allow creation of a blog with identical id', () => {
        cy.get('#blog-id-input').clear().type(TEST_ID);
        cy.get('#blog-create').click();
        cy.get('#blog-is-created').within(() => { cy.contains(FAILURE_MARK) });
      });

      it('subscription observes blog creation', () => {
        cy.get('#created-blogs-subscription').within(() => { cy.contains(TEST_ID) });
      });

      it('gets a created blog by id', () => {
        cy.get('#retrieve-blog-id').clear().type(TEST_ID);
        cy.get('#retrieve-blog-button').click();
        cy.get('#blog-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-blog').contains(TEST_ID);
      });

      it('lists the created blogs', () => {
        cy.get('#list-blogs').click();
        cy.get('#blogs-are-listed').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#listed-blogs').contains(TEST_ID);
      });
    });

    describe('update', () => {
      it('updates a blog', () => {
        // Load the blog
        cy.get('#retrieve-blog-id').clear().type(TEST_ID);
        cy.get('#retrieve-blog-button').click();
        cy.get('#blog-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-blog').contains(TEST_ID);

        // Go to Edit State, Update, and Save
        cy.get('#retrieved-blog').within(() => {
          cy.contains('Edit').click();
          cy.get('#update-title-input').clear().type(UPDATED_TITLE);
          cy.get('#update-blog').click();
          cy.get('#blog-is-updated').contains(SUCCESS_MARK);
        });
      });

      it('subscription observes blog update', () => {
        cy.get('#updated-blogs-subscription').within(() => { cy.contains(UPDATED_TITLE) });
      });

      it('lists the updated blog', () => {
        cy.get('#list-blogs').click();
        cy.get('#blogs-are-listed').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#listed-blogs').contains(UPDATED_TITLE);
      });
    });

    describe('delete', () => {
      it('deletes a retrieved blog', () => {
        // Load the blog
        cy.get('#retrieve-blog-id').clear().type(TEST_ID);
        cy.get('#retrieve-blog-button').click();
        cy.get('#blog-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-blog').contains(TEST_ID);

        // Deletes
        cy.get('#retrieved-blog').within(() => {
          cy.get('#delete-blog').click();
          cy.get('#blog-is-updated').contains(SUCCESS_MARK);
        });

        // Does not reload
        cy.get('#retrieve-blog-id').clear().type(TEST_ID);
        cy.get('#retrieve-blog-button').click();
        cy.get('#blog-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-blog').contains(TEST_ID).should('not.exist');
      });

      it('subscription observes blog deletion', () => {
        cy.get('#deleted-blogs-subscription').within(() => { cy.contains(TEST_ID) });
      });

      it('no longer gets deleted blog in list', () => {
        cy.get('#list-blogs').click();
        cy.get('#blogs-are-listed').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#listed-blogs').contains(TEST_ID).should('not.exist');
      });
    });
  });

  describe('post interactions', () => {
    const BLOG_ID = `${uuid()}`;
    const POST_ID_1 = `${uuid()}`;
    const POST_ID_2 = `${uuid()}`;

    describe('attaches relationship', () => {
      it('creates a blog', () => {
        cy.get('#blog-id-input').clear().type(BLOG_ID);
        cy.get('#blog-create').click();
        cy.get('#blog-is-created').within(() => { cy.contains(SUCCESS_MARK) });
      });

      it('creates a post', () => {
        cy.get('#post-id-input').clear().type(POST_ID_1);
        cy.get('#post-create').click();
        cy.get('#post-is-created').within(() => { cy.contains(SUCCESS_MARK) });
      });

      it('attaches the post to the blog', () => {
        // Load the Post
        cy.get('#retrieve-post-id').clear().type(POST_ID_1);
        cy.get('#retrieve-post-button').click();
        cy.get('#post-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-post').contains(POST_ID_1);

        // Go to Edit State, Update, and Save
        cy.get('#retrieved-post').within(() => {
          cy.contains('Edit').click();
          cy.get('#update-blogPostsId-input').clear().type(BLOG_ID);
          cy.get('#update-post').click();
          cy.get('#post-is-updated').contains(SUCCESS_MARK);
        });
      });

      it('creates and attaches second post', () => {
        // Create the post
        cy.get('#post-id-input').clear().type(POST_ID_2);
        cy.get('#post-create').click();
        cy.get('#post-is-created').within(() => { cy.contains(SUCCESS_MARK) });

        // Load the Post
        cy.get('#retrieve-post-id').clear().type(POST_ID_2);
        cy.get('#retrieve-post-button').click();
        cy.get('#post-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-post').contains(POST_ID_2);

        // Go to Edit State, Update, and Save
        cy.get('#retrieved-post').within(() => {
          cy.get('#update-blogPostsId-input').clear().type(BLOG_ID);
          cy.get('#update-post').click();
          cy.get('#post-is-updated').contains(SUCCESS_MARK);
        });
      });

      it('can retrieve the blog with posts', () => {
        cy.get('#retrieve-blog-id').clear().type(BLOG_ID);
        cy.get('#retrieve-blog-button').click();
        cy.get('#blog-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-blog').contains(BLOG_ID);
        cy.get('#retrieved-blog').contains('created blog');
        cy.get('#retrieved-blog').contains(POST_ID_1);
        cy.get('#retrieved-blog').contains(POST_ID_2);
        cy.get('#retrieved-blog').contains('created post');
      });

      it('can retrieve the post with blog', () => {
        cy.get('#retrieve-post-id').clear().type(POST_ID_1);
        cy.get('#retrieve-post-button').click();
        cy.get('#post-is-retrieved').within(() => { cy.contains(SUCCESS_MARK) });
        cy.get('#retrieved-post').within(() => {
          cy.contains('View').click();
        });
        cy.get('#retrieved-post').contains(POST_ID_1);
        cy.get('#retrieved-post').contains('created post');
        cy.get('#retrieved-post').contains(BLOG_ID);
        cy.get('#retrieved-post').contains('created blog');
      });
    });
  });
});