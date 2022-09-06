/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTodo = /* GraphQL */ `
  subscription OnCreateTodo {
    onCreateTodo {
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
export const onUpdateTodo = /* GraphQL */ `
  subscription OnUpdateTodo {
    onUpdateTodo {
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
export const onDeleteTodo = /* GraphQL */ `
  subscription OnDeleteTodo {
    onDeleteTodo {
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
export const onCreateBlog = /* GraphQL */ `
  subscription OnCreateBlog {
    onCreateBlog {
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
export const onUpdateBlog = /* GraphQL */ `
  subscription OnUpdateBlog {
    onUpdateBlog {
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
export const onDeleteBlog = /* GraphQL */ `
  subscription OnDeleteBlog {
    onDeleteBlog {
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
export const onCreatePost = /* GraphQL */ `
  subscription OnCreatePost {
    onCreatePost {
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
export const onUpdatePost = /* GraphQL */ `
  subscription OnUpdatePost {
    onUpdatePost {
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
export const onDeletePost = /* GraphQL */ `
  subscription OnDeletePost {
    onDeletePost {
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
export const onCreateListing = /* GraphQL */ `
  subscription OnCreateListing {
    onCreateListing {
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
export const onUpdateListing = /* GraphQL */ `
  subscription OnUpdateListing {
    onUpdateListing {
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
export const onDeleteListing = /* GraphQL */ `
  subscription OnDeleteListing {
    onDeleteListing {
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
export const onCreateTag = /* GraphQL */ `
  subscription OnCreateTag {
    onCreateTag {
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
export const onUpdateTag = /* GraphQL */ `
  subscription OnUpdateTag {
    onUpdateTag {
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
export const onDeleteTag = /* GraphQL */ `
  subscription OnDeleteTag {
    onDeleteTag {
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
export const onCreateListingTags = /* GraphQL */ `
  subscription OnCreateListingTags {
    onCreateListingTags {
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
export const onUpdateListingTags = /* GraphQL */ `
  subscription OnUpdateListingTags {
    onUpdateListingTags {
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
export const onDeleteListingTags = /* GraphQL */ `
  subscription OnDeleteListingTags {
    onDeleteListingTags {
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
