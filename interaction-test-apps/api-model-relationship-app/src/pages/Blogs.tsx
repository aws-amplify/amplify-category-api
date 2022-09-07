import { Button, Flex, Heading, TextField } from '@aws-amplify/ui-react';
import { API, graphqlOperation } from 'aws-amplify';
import { useState } from 'react';
import { Blog, Post } from '../API';
import { createCreateRecordComponent, createDetailComponent, createGetRecordComponent, createListComponent, OperationStateIndicator, SimpleIdRecordProps, Subscriptions, useOperationStateWrapper } from '../components';
import { createBlog, createPost, deleteBlog, deletePost, updateBlog, updatePost } from '../graphql/mutations';
import { getBlog, getPost, listBlogs, listPosts } from '../graphql/queries';
import { onCreateBlog, onCreatePost, onDeleteBlog, onDeletePost, onUpdateBlog, onUpdatePost } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const commonBlogProps = {
  recordName: 'blog',
  createMutation: createBlog,
  getQuery: getBlog,
  listQuery: listBlogs,
  deleteMutation: deleteBlog,
};

const CreateBlog = createCreateRecordComponent({
  ...commonBlogProps,
  sentinelData: {
    title: 'created blog',
    author: 'test suite',
  },
});

// View/Edit are a little tougher to make super generic, just injecting them instead.
const ViewBlog = ({ record }: SimpleIdRecordProps<Blog>) => {
  return <p>{ record.title }</p>;
};

const EditBlog = ({ record }: SimpleIdRecordProps<Blog>) => {
  const [updatedTitle, setUpdatedTitle] = useState(record.title);
  const { wrappedFn, opState } = useOperationStateWrapper(async () => await API.graphql(graphqlOperation(updateBlog, { input: { id: record.id, title: updatedTitle} })));

  return (
    <Flex direction='row'>
      <TextField id='update-title-input' label='Updated Title' labelHidden placeholder={ record.title || '' } onChange={(event: any) => {
        setUpdatedTitle(event.target.value);
      }} />
      <Button id='update-title' onClick={wrappedFn}>Update</Button>
      <OperationStateIndicator id='blog-is-updated' state={opState} />
    </Flex>
  );
};

const BlogDetail = createDetailComponent({
  ...commonBlogProps,
  ViewComp: ViewBlog,
  EditComp: EditBlog,
});

const GetBlog = createGetRecordComponent({
  ...commonBlogProps,
  DetailComp: BlogDetail,
});

const ListBlogs = createListComponent({
  ...commonBlogProps,
  DetailComp: BlogDetail,
});


const commonPostProps = {
  recordName: 'post',
  createMutation: createPost,
  getQuery: getPost,
  listQuery: listPosts,
  deleteMutation: deletePost,
};

const CreatePost = createCreateRecordComponent({
  ...commonPostProps,
  sentinelData: {
    title: 'created blog',
    author: 'test suite',
  },
});

// View/Edit are a little tougher to make super generic, just injecting them instead.
const ViewPost = ({ record }: SimpleIdRecordProps<Post>) => {
  return <p>{ record.title }</p>;
};

const EditPost = ({ record }: SimpleIdRecordProps<Post>) => {
  const [updatedTitle, setUpdatedTitle] = useState(record.title);
  const { wrappedFn, opState } = useOperationStateWrapper(async () => await API.graphql(graphqlOperation(updatePost, { input: { id: record.id, title: updatedTitle} })));

  return (
    <Flex direction='row'>
      <TextField id='update-title-input' label='Updated Title' labelHidden placeholder={ record.title || '' } onChange={(event: any) => {
        setUpdatedTitle(event.target.value);
      }} />
      <Button id='update-title' onClick={wrappedFn}>Update</Button>
      <OperationStateIndicator id='post-is-updated' state={opState} />
    </Flex>
  );
};

const PostDetail = createDetailComponent({
  ...commonPostProps,
  ViewComp: ViewPost,
  EditComp: EditPost,
});

const GetPost = createGetRecordComponent({
  ...commonPostProps,
  DetailComp: PostDetail,
});

const ListPosts = createListComponent({
  ...commonPostProps,
  DetailComp: PostDetail,
});

export const Blogs = () => {
  return (
    <Flex direction='column'>
      <NavBar />
      <Heading level={1}>Blog Controls</Heading>
      <Flex direction='row'>
        <Flex direction='column'>
          <Heading level={2}>CRUDL Actions</Heading>
          <CreateBlog />
          <GetBlog />
          <ListBlogs />
        </Flex>
        <Subscriptions
          recordName='blog'
          createSubscriptionQuery={onCreateBlog}
          updateSubscriptionQuery={onUpdateBlog}
          deleteSubscriptionQuery={onDeleteBlog}
        />
      </Flex>
      <Heading level={1}>Post Controls</Heading>
      <Flex direction='row'>
        <Flex direction='column'>
          <Heading level={2}>CRUDL Actions</Heading>
          <CreatePost />
          <GetPost />
          <ListPosts />
        </Flex>
        <Subscriptions
          recordName='post'
          createSubscriptionQuery={onCreatePost}
          updateSubscriptionQuery={onUpdatePost}
          deleteSubscriptionQuery={onDeletePost}
        />
      </Flex>
    </Flex>
  );
};
