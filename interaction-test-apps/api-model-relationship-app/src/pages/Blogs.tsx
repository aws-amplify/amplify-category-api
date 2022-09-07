import { Flex, Heading } from '@aws-amplify/ui-react';
import { Blog, Post } from '../API';
import { createCreateRecordComponent, createDetailComponent, createEditComp, createGetRecordComponent, createListComponent, createViewComp, Subscriptions } from '../components';
import { createBlog, createPost, deleteBlog, deletePost, updateBlog, updatePost } from '../graphql/mutations';
import { getBlog, getPost, listBlogs, listPosts } from '../graphql/queries';
import { onCreateBlog, onCreatePost, onDeleteBlog, onDeletePost, onUpdateBlog, onUpdatePost } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const commonBlogProps = {
  recordName: 'blog',
  createMutation: createBlog,
  updateMutation: updateBlog,
  getQuery: getBlog,
  listQuery: listBlogs,
  deleteMutation: deleteBlog,
  fields: ['title', 'author'],
};

const CreateBlog = createCreateRecordComponent({
  ...commonBlogProps,
  sentinelData: {
    title: 'created blog',
    author: 'test suite',
  },
});

const ViewBlog = createViewComp<Blog>({ ...commonBlogProps, fields: ['title', 'author'] });

const EditBlog = createEditComp<Blog>({ ...commonBlogProps, fields: ['title', 'author'] });

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
  updateMutation: updatePost,
  getQuery: getPost,
  listQuery: listPosts,
  deleteMutation: deletePost,
  fields: ['title'],
};

const CreatePost = createCreateRecordComponent({
  ...commonPostProps,
  sentinelData: {
    title: 'created blog',
    author: 'test suite',
  },
});

const ViewPost = createViewComp<Post>({ ...commonPostProps, fields: ['title'] });

const EditPost = createEditComp<Post>({ ...commonPostProps, fields: ['title'] });

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
