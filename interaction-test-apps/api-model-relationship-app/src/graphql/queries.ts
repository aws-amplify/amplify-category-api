/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTodo = /* GraphQL */ `
  query GetTodo($id: ID!) {
    getTodo(id: $id) {
      id
      content
      metadata {
        targetCompletionDate
        percentChanceOfCompletion
      }
      createdAt
      updatedAt
    }
  }
`;
export const listTodos = /* GraphQL */ `
  query ListTodos(
    $filter: ModelTodoFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTodos(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        content
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getBlog = /* GraphQL */ `
  query GetBlog($id: ID!) {
    getBlog(id: $id) {
      id
      title
      author
      posts {
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`;
export const listBlogs = /* GraphQL */ `
  query ListBlogs(
    $filter: ModelBlogFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listBlogs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        author
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getPost = /* GraphQL */ `
  query GetPost($id: ID!) {
    getPost(id: $id) {
      id
      title
      content
      blog {
        id
        title
        author
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      blogPostsId
    }
  }
`;
export const listPosts = /* GraphQL */ `
  query ListPosts(
    $filter: ModelPostFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPosts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        content
        createdAt
        updatedAt
        blogPostsId
      }
      nextToken
    }
  }
`;
export const getListing = /* GraphQL */ `
  query GetListing($id: ID!) {
    getListing(id: $id) {
      id
      title
      bedroomCount
      bathroomCount
      listPriceUSD
      state
      isHotProperty
      tags {
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`;
export const listListings = /* GraphQL */ `
  query ListListings(
    $filter: ModelListingFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listListings(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        bedroomCount
        bathroomCount
        listPriceUSD
        state
        isHotProperty
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getTag = /* GraphQL */ `
  query GetTag($id: ID!) {
    getTag(id: $id) {
      id
      label
      listings {
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`;
export const listTags = /* GraphQL */ `
  query ListTags(
    $filter: ModelTagFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTags(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        label
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getListingTags = /* GraphQL */ `
  query GetListingTags($id: ID!) {
    getListingTags(id: $id) {
      id
      listingID
      tagID
      listing {
        id
        title
        bedroomCount
        bathroomCount
        listPriceUSD
        state
        isHotProperty
        createdAt
        updatedAt
      }
      tag {
        id
        label
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;
export const listListingTags = /* GraphQL */ `
  query ListListingTags(
    $filter: ModelListingTagsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listListingTags(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        listingID
        tagID
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const blogByAuthor = /* GraphQL */ `
  query BlogByAuthor(
    $author: String!
    $sortDirection: ModelSortDirection
    $filter: ModelBlogFilterInput
    $limit: Int
    $nextToken: String
  ) {
    blogByAuthor(
      author: $author
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        author
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
