/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createTodo = /* GraphQL */ `
  mutation CreateTodo(
    $input: CreateTodoInput!
    $condition: ModelTodoConditionInput
  ) {
    createTodo(input: $input, condition: $condition) {
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
export const updateTodo = /* GraphQL */ `
  mutation UpdateTodo(
    $input: UpdateTodoInput!
    $condition: ModelTodoConditionInput
  ) {
    updateTodo(input: $input, condition: $condition) {
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
export const deleteTodo = /* GraphQL */ `
  mutation DeleteTodo(
    $input: DeleteTodoInput!
    $condition: ModelTodoConditionInput
  ) {
    deleteTodo(input: $input, condition: $condition) {
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
export const createBlog = /* GraphQL */ `
  mutation CreateBlog(
    $input: CreateBlogInput!
    $condition: ModelBlogConditionInput
  ) {
    createBlog(input: $input, condition: $condition) {
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
export const updateBlog = /* GraphQL */ `
  mutation UpdateBlog(
    $input: UpdateBlogInput!
    $condition: ModelBlogConditionInput
  ) {
    updateBlog(input: $input, condition: $condition) {
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
export const deleteBlog = /* GraphQL */ `
  mutation DeleteBlog(
    $input: DeleteBlogInput!
    $condition: ModelBlogConditionInput
  ) {
    deleteBlog(input: $input, condition: $condition) {
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
export const createPost = /* GraphQL */ `
  mutation CreatePost(
    $input: CreatePostInput!
    $condition: ModelPostConditionInput
  ) {
    createPost(input: $input, condition: $condition) {
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
export const updatePost = /* GraphQL */ `
  mutation UpdatePost(
    $input: UpdatePostInput!
    $condition: ModelPostConditionInput
  ) {
    updatePost(input: $input, condition: $condition) {
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
export const deletePost = /* GraphQL */ `
  mutation DeletePost(
    $input: DeletePostInput!
    $condition: ModelPostConditionInput
  ) {
    deletePost(input: $input, condition: $condition) {
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
export const createListing = /* GraphQL */ `
  mutation CreateListing(
    $input: CreateListingInput!
    $condition: ModelListingConditionInput
  ) {
    createListing(input: $input, condition: $condition) {
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
export const updateListing = /* GraphQL */ `
  mutation UpdateListing(
    $input: UpdateListingInput!
    $condition: ModelListingConditionInput
  ) {
    updateListing(input: $input, condition: $condition) {
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
export const deleteListing = /* GraphQL */ `
  mutation DeleteListing(
    $input: DeleteListingInput!
    $condition: ModelListingConditionInput
  ) {
    deleteListing(input: $input, condition: $condition) {
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
export const createTag = /* GraphQL */ `
  mutation CreateTag(
    $input: CreateTagInput!
    $condition: ModelTagConditionInput
  ) {
    createTag(input: $input, condition: $condition) {
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
export const updateTag = /* GraphQL */ `
  mutation UpdateTag(
    $input: UpdateTagInput!
    $condition: ModelTagConditionInput
  ) {
    updateTag(input: $input, condition: $condition) {
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
export const deleteTag = /* GraphQL */ `
  mutation DeleteTag(
    $input: DeleteTagInput!
    $condition: ModelTagConditionInput
  ) {
    deleteTag(input: $input, condition: $condition) {
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
export const createListingTags = /* GraphQL */ `
  mutation CreateListingTags(
    $input: CreateListingTagsInput!
    $condition: ModelListingTagsConditionInput
  ) {
    createListingTags(input: $input, condition: $condition) {
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
export const updateListingTags = /* GraphQL */ `
  mutation UpdateListingTags(
    $input: UpdateListingTagsInput!
    $condition: ModelListingTagsConditionInput
  ) {
    updateListingTags(input: $input, condition: $condition) {
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
export const deleteListingTags = /* GraphQL */ `
  mutation DeleteListingTags(
    $input: DeleteListingTagsInput!
    $condition: ModelListingTagsConditionInput
  ) {
    deleteListingTags(input: $input, condition: $condition) {
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
