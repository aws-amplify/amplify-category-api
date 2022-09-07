/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateTodoInput = {
  id?: string | null,
  content?: string | null,
  metadata?: TodoMetadataInput | null,
};

export type TodoMetadataInput = {
  targetCompletionDate?: string | null,
  percentChanceOfCompletion?: number | null,
};

export type ModelTodoConditionInput = {
  content?: ModelStringInput | null,
  and?: Array< ModelTodoConditionInput | null > | null,
  or?: Array< ModelTodoConditionInput | null > | null,
  not?: ModelTodoConditionInput | null,
};

export type ModelStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
  _null = "_null",
}


export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type Todo = {
  __typename: "Todo",
  id: string,
  content?: string | null,
  metadata?: TodoMetadata | null,
  createdAt: string,
  updatedAt: string,
};

export type TodoMetadata = {
  __typename: "TodoMetadata",
  targetCompletionDate?: string | null,
  percentChanceOfCompletion?: number | null,
};

export type UpdateTodoInput = {
  id: string,
  content?: string | null,
  metadata?: TodoMetadataInput | null,
};

export type DeleteTodoInput = {
  id: string,
};

export type CreateBlogInput = {
  id?: string | null,
  title: string,
  author: string,
};

export type ModelBlogConditionInput = {
  title?: ModelStringInput | null,
  author?: ModelStringInput | null,
  and?: Array< ModelBlogConditionInput | null > | null,
  or?: Array< ModelBlogConditionInput | null > | null,
  not?: ModelBlogConditionInput | null,
};

export type Blog = {
  __typename: "Blog",
  id: string,
  title: string,
  author: string,
  posts?: ModelPostConnection | null,
  createdAt: string,
  updatedAt: string,
};

export type ModelPostConnection = {
  __typename: "ModelPostConnection",
  items:  Array<Post | null >,
  nextToken?: string | null,
};

export type Post = {
  __typename: "Post",
  id: string,
  title: string,
  content: string,
  blog?: Blog | null,
  createdAt: string,
  updatedAt: string,
  blogPostsId?: string | null,
};

export type UpdateBlogInput = {
  id: string,
  title?: string | null,
  author?: string | null,
};

export type DeleteBlogInput = {
  id: string,
};

export type CreatePostInput = {
  id?: string | null,
  title: string,
  content: string,
  blogPostsId?: string | null,
};

export type ModelPostConditionInput = {
  title?: ModelStringInput | null,
  content?: ModelStringInput | null,
  and?: Array< ModelPostConditionInput | null > | null,
  or?: Array< ModelPostConditionInput | null > | null,
  not?: ModelPostConditionInput | null,
  blogPostsId?: ModelIDInput | null,
};

export type ModelIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export type UpdatePostInput = {
  id: string,
  title?: string | null,
  content?: string | null,
  blogPostsId?: string | null,
};

export type DeletePostInput = {
  id: string,
};

export type CreateListingInput = {
  id?: string | null,
  title: string,
  bedroomCount?: number | null,
  bathroomCount?: number | null,
  listPriceUSD?: number | null,
  state?: ListingState | null,
  isHotProperty?: boolean | null,
};

export enum ListingState {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  SOLD = "SOLD",
}


export type ModelListingConditionInput = {
  title?: ModelStringInput | null,
  bedroomCount?: ModelIntInput | null,
  bathroomCount?: ModelIntInput | null,
  listPriceUSD?: ModelFloatInput | null,
  state?: ModelListingStateInput | null,
  isHotProperty?: ModelBooleanInput | null,
  and?: Array< ModelListingConditionInput | null > | null,
  or?: Array< ModelListingConditionInput | null > | null,
  not?: ModelListingConditionInput | null,
};

export type ModelIntInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
};

export type ModelFloatInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
};

export type ModelListingStateInput = {
  eq?: ListingState | null,
  ne?: ListingState | null,
};

export type ModelBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
};

export type Listing = {
  __typename: "Listing",
  id: string,
  title: string,
  bedroomCount?: number | null,
  bathroomCount?: number | null,
  listPriceUSD?: number | null,
  state?: ListingState | null,
  isHotProperty?: boolean | null,
  tags?: ModelListingTagsConnection | null,
  createdAt: string,
  updatedAt: string,
};

export type ModelListingTagsConnection = {
  __typename: "ModelListingTagsConnection",
  items:  Array<ListingTags | null >,
  nextToken?: string | null,
};

export type ListingTags = {
  __typename: "ListingTags",
  id: string,
  listingID: string,
  tagID: string,
  listing: Listing,
  tag: Tag,
  createdAt: string,
  updatedAt: string,
};

export type Tag = {
  __typename: "Tag",
  id: string,
  label: string,
  listings?: ModelListingTagsConnection | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateListingInput = {
  id: string,
  title?: string | null,
  bedroomCount?: number | null,
  bathroomCount?: number | null,
  listPriceUSD?: number | null,
  state?: ListingState | null,
  isHotProperty?: boolean | null,
};

export type DeleteListingInput = {
  id: string,
};

export type CreateTagInput = {
  id?: string | null,
  label: string,
};

export type ModelTagConditionInput = {
  label?: ModelStringInput | null,
  and?: Array< ModelTagConditionInput | null > | null,
  or?: Array< ModelTagConditionInput | null > | null,
  not?: ModelTagConditionInput | null,
};

export type UpdateTagInput = {
  id: string,
  label?: string | null,
};

export type DeleteTagInput = {
  id: string,
};

export type CreateListingTagsInput = {
  id?: string | null,
  listingID: string,
  tagID: string,
};

export type ModelListingTagsConditionInput = {
  listingID?: ModelIDInput | null,
  tagID?: ModelIDInput | null,
  and?: Array< ModelListingTagsConditionInput | null > | null,
  or?: Array< ModelListingTagsConditionInput | null > | null,
  not?: ModelListingTagsConditionInput | null,
};

export type UpdateListingTagsInput = {
  id: string,
  listingID?: string | null,
  tagID?: string | null,
};

export type DeleteListingTagsInput = {
  id: string,
};

export type ModelTodoFilterInput = {
  id?: ModelIDInput | null,
  content?: ModelStringInput | null,
  and?: Array< ModelTodoFilterInput | null > | null,
  or?: Array< ModelTodoFilterInput | null > | null,
  not?: ModelTodoFilterInput | null,
};

export type ModelTodoConnection = {
  __typename: "ModelTodoConnection",
  items:  Array<Todo | null >,
  nextToken?: string | null,
};

export type ModelBlogFilterInput = {
  id?: ModelIDInput | null,
  title?: ModelStringInput | null,
  author?: ModelStringInput | null,
  and?: Array< ModelBlogFilterInput | null > | null,
  or?: Array< ModelBlogFilterInput | null > | null,
  not?: ModelBlogFilterInput | null,
};

export type ModelBlogConnection = {
  __typename: "ModelBlogConnection",
  items:  Array<Blog | null >,
  nextToken?: string | null,
};

export type ModelPostFilterInput = {
  id?: ModelIDInput | null,
  title?: ModelStringInput | null,
  content?: ModelStringInput | null,
  and?: Array< ModelPostFilterInput | null > | null,
  or?: Array< ModelPostFilterInput | null > | null,
  not?: ModelPostFilterInput | null,
  blogPostsId?: ModelIDInput | null,
};

export type ModelListingFilterInput = {
  id?: ModelIDInput | null,
  title?: ModelStringInput | null,
  bedroomCount?: ModelIntInput | null,
  bathroomCount?: ModelIntInput | null,
  listPriceUSD?: ModelFloatInput | null,
  state?: ModelListingStateInput | null,
  isHotProperty?: ModelBooleanInput | null,
  and?: Array< ModelListingFilterInput | null > | null,
  or?: Array< ModelListingFilterInput | null > | null,
  not?: ModelListingFilterInput | null,
};

export type ModelListingConnection = {
  __typename: "ModelListingConnection",
  items:  Array<Listing | null >,
  nextToken?: string | null,
};

export type ModelTagFilterInput = {
  id?: ModelIDInput | null,
  label?: ModelStringInput | null,
  and?: Array< ModelTagFilterInput | null > | null,
  or?: Array< ModelTagFilterInput | null > | null,
  not?: ModelTagFilterInput | null,
};

export type ModelTagConnection = {
  __typename: "ModelTagConnection",
  items:  Array<Tag | null >,
  nextToken?: string | null,
};

export type ModelListingTagsFilterInput = {
  id?: ModelIDInput | null,
  listingID?: ModelIDInput | null,
  tagID?: ModelIDInput | null,
  and?: Array< ModelListingTagsFilterInput | null > | null,
  or?: Array< ModelListingTagsFilterInput | null > | null,
  not?: ModelListingTagsFilterInput | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelSubscriptionListingFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  title?: ModelSubscriptionStringInput | null,
  bedroomCount?: ModelSubscriptionIntInput | null,
  bathroomCount?: ModelSubscriptionIntInput | null,
  listPriceUSD?: ModelSubscriptionFloatInput | null,
  state?: ModelSubscriptionStringInput | null,
  isHotProperty?: ModelSubscriptionBooleanInput | null,
  and?: Array< ModelSubscriptionListingFilterInput | null > | null,
  or?: Array< ModelSubscriptionListingFilterInput | null > | null,
};

export type ModelSubscriptionIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIntInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  in?: Array< number | null > | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionFloatInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  in?: Array< number | null > | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
};

export type ModelSubscriptionTagFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  label?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionTagFilterInput | null > | null,
  or?: Array< ModelSubscriptionTagFilterInput | null > | null,
};

export type ModelSubscriptionListingTagsFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  listingID?: ModelSubscriptionIDInput | null,
  tagID?: ModelSubscriptionIDInput | null,
  and?: Array< ModelSubscriptionListingTagsFilterInput | null > | null,
  or?: Array< ModelSubscriptionListingTagsFilterInput | null > | null,
};

export type CreateTodoMutationVariables = {
  input: CreateTodoInput,
  condition?: ModelTodoConditionInput | null,
};

export type CreateTodoMutation = {
  createTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateTodoMutationVariables = {
  input: UpdateTodoInput,
  condition?: ModelTodoConditionInput | null,
};

export type UpdateTodoMutation = {
  updateTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteTodoMutationVariables = {
  input: DeleteTodoInput,
  condition?: ModelTodoConditionInput | null,
};

export type DeleteTodoMutation = {
  deleteTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateBlogMutationVariables = {
  input: CreateBlogInput,
  condition?: ModelBlogConditionInput | null,
};

export type CreateBlogMutation = {
  createBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateBlogMutationVariables = {
  input: UpdateBlogInput,
  condition?: ModelBlogConditionInput | null,
};

export type UpdateBlogMutation = {
  updateBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteBlogMutationVariables = {
  input: DeleteBlogInput,
  condition?: ModelBlogConditionInput | null,
};

export type DeleteBlogMutation = {
  deleteBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreatePostMutationVariables = {
  input: CreatePostInput,
  condition?: ModelPostConditionInput | null,
};

export type CreatePostMutation = {
  createPost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type UpdatePostMutationVariables = {
  input: UpdatePostInput,
  condition?: ModelPostConditionInput | null,
};

export type UpdatePostMutation = {
  updatePost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type DeletePostMutationVariables = {
  input: DeletePostInput,
  condition?: ModelPostConditionInput | null,
};

export type DeletePostMutation = {
  deletePost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type CreateListingMutationVariables = {
  input: CreateListingInput,
  condition?: ModelListingConditionInput | null,
};

export type CreateListingMutation = {
  createListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateListingMutationVariables = {
  input: UpdateListingInput,
  condition?: ModelListingConditionInput | null,
};

export type UpdateListingMutation = {
  updateListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteListingMutationVariables = {
  input: DeleteListingInput,
  condition?: ModelListingConditionInput | null,
};

export type DeleteListingMutation = {
  deleteListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateTagMutationVariables = {
  input: CreateTagInput,
  condition?: ModelTagConditionInput | null,
};

export type CreateTagMutation = {
  createTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateTagMutationVariables = {
  input: UpdateTagInput,
  condition?: ModelTagConditionInput | null,
};

export type UpdateTagMutation = {
  updateTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteTagMutationVariables = {
  input: DeleteTagInput,
  condition?: ModelTagConditionInput | null,
};

export type DeleteTagMutation = {
  deleteTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateListingTagsMutationVariables = {
  input: CreateListingTagsInput,
  condition?: ModelListingTagsConditionInput | null,
};

export type CreateListingTagsMutation = {
  createListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateListingTagsMutationVariables = {
  input: UpdateListingTagsInput,
  condition?: ModelListingTagsConditionInput | null,
};

export type UpdateListingTagsMutation = {
  updateListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteListingTagsMutationVariables = {
  input: DeleteListingTagsInput,
  condition?: ModelListingTagsConditionInput | null,
};

export type DeleteListingTagsMutation = {
  deleteListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type GetTodoQueryVariables = {
  id: string,
};

export type GetTodoQuery = {
  getTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListTodosQueryVariables = {
  filter?: ModelTodoFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListTodosQuery = {
  listTodos?:  {
    __typename: "ModelTodoConnection",
    items:  Array< {
      __typename: "Todo",
      id: string,
      content?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetBlogQueryVariables = {
  id: string,
};

export type GetBlogQuery = {
  getBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListBlogsQueryVariables = {
  filter?: ModelBlogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListBlogsQuery = {
  listBlogs?:  {
    __typename: "ModelBlogConnection",
    items:  Array< {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetPostQueryVariables = {
  id: string,
};

export type GetPostQuery = {
  getPost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type ListPostsQueryVariables = {
  filter?: ModelPostFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListPostsQuery = {
  listPosts?:  {
    __typename: "ModelPostConnection",
    items:  Array< {
      __typename: "Post",
      id: string,
      title: string,
      content: string,
      createdAt: string,
      updatedAt: string,
      blogPostsId?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetListingQueryVariables = {
  id: string,
};

export type GetListingQuery = {
  getListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListListingsQueryVariables = {
  filter?: ModelListingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListListingsQuery = {
  listListings?:  {
    __typename: "ModelListingConnection",
    items:  Array< {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetTagQueryVariables = {
  id: string,
};

export type GetTagQuery = {
  getTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListTagsQueryVariables = {
  filter?: ModelTagFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListTagsQuery = {
  listTags?:  {
    __typename: "ModelTagConnection",
    items:  Array< {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetListingTagsQueryVariables = {
  id: string,
};

export type GetListingTagsQuery = {
  getListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListListingTagsQueryVariables = {
  filter?: ModelListingTagsFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListListingTagsQuery = {
  listListingTags?:  {
    __typename: "ModelListingTagsConnection",
    items:  Array< {
      __typename: "ListingTags",
      id: string,
      listingID: string,
      tagID: string,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type BlogByAuthorQueryVariables = {
  author: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelBlogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type BlogByAuthorQuery = {
  blogByAuthor?:  {
    __typename: "ModelBlogConnection",
    items:  Array< {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreateTodoSubscription = {
  onCreateTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateTodoSubscription = {
  onUpdateTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteTodoSubscription = {
  onDeleteTodo?:  {
    __typename: "Todo",
    id: string,
    content?: string | null,
    metadata?:  {
      __typename: "TodoMetadata",
      targetCompletionDate?: string | null,
      percentChanceOfCompletion?: number | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateBlogSubscription = {
  onCreateBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateBlogSubscription = {
  onUpdateBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteBlogSubscription = {
  onDeleteBlog?:  {
    __typename: "Blog",
    id: string,
    title: string,
    author: string,
    posts?:  {
      __typename: "ModelPostConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreatePostSubscription = {
  onCreatePost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type OnUpdatePostSubscription = {
  onUpdatePost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type OnDeletePostSubscription = {
  onDeletePost?:  {
    __typename: "Post",
    id: string,
    title: string,
    content: string,
    blog?:  {
      __typename: "Blog",
      id: string,
      title: string,
      author: string,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
    blogPostsId?: string | null,
  } | null,
};

export type OnCreateListingSubscriptionVariables = {
  filter?: ModelSubscriptionListingFilterInput | null,
};

export type OnCreateListingSubscription = {
  onCreateListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateListingSubscriptionVariables = {
  filter?: ModelSubscriptionListingFilterInput | null,
};

export type OnUpdateListingSubscription = {
  onUpdateListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteListingSubscriptionVariables = {
  filter?: ModelSubscriptionListingFilterInput | null,
};

export type OnDeleteListingSubscription = {
  onDeleteListing?:  {
    __typename: "Listing",
    id: string,
    title: string,
    bedroomCount?: number | null,
    bathroomCount?: number | null,
    listPriceUSD?: number | null,
    state?: ListingState | null,
    isHotProperty?: boolean | null,
    tags?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateTagSubscriptionVariables = {
  filter?: ModelSubscriptionTagFilterInput | null,
};

export type OnCreateTagSubscription = {
  onCreateTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateTagSubscriptionVariables = {
  filter?: ModelSubscriptionTagFilterInput | null,
};

export type OnUpdateTagSubscription = {
  onUpdateTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteTagSubscriptionVariables = {
  filter?: ModelSubscriptionTagFilterInput | null,
};

export type OnDeleteTagSubscription = {
  onDeleteTag?:  {
    __typename: "Tag",
    id: string,
    label: string,
    listings?:  {
      __typename: "ModelListingTagsConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateListingTagsSubscriptionVariables = {
  filter?: ModelSubscriptionListingTagsFilterInput | null,
};

export type OnCreateListingTagsSubscription = {
  onCreateListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateListingTagsSubscriptionVariables = {
  filter?: ModelSubscriptionListingTagsFilterInput | null,
};

export type OnUpdateListingTagsSubscription = {
  onUpdateListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteListingTagsSubscriptionVariables = {
  filter?: ModelSubscriptionListingTagsFilterInput | null,
};

export type OnDeleteListingTagsSubscription = {
  onDeleteListingTags?:  {
    __typename: "ListingTags",
    id: string,
    listingID: string,
    tagID: string,
    listing:  {
      __typename: "Listing",
      id: string,
      title: string,
      bedroomCount?: number | null,
      bathroomCount?: number | null,
      listPriceUSD?: number | null,
      state?: ListingState | null,
      isHotProperty?: boolean | null,
      createdAt: string,
      updatedAt: string,
    },
    tag:  {
      __typename: "Tag",
      id: string,
      label: string,
      createdAt: string,
      updatedAt: string,
    },
    createdAt: string,
    updatedAt: string,
  } | null,
};
