import { Flex } from '@aws-amplify/ui-react';
import { Blog, Post } from '../API';
import { createModelHarness } from '../components';
import { createBlog, createPost, deleteBlog, deletePost, updateBlog, updatePost } from '../graphql/mutations';
import { getBlog, getPost, listBlogs, listPosts } from '../graphql/queries';
import { onCreateBlog, onCreatePost, onDeleteBlog, onDeletePost, onUpdateBlog, onUpdatePost } from '../graphql/subscriptions';
import { NavBar } from '../NavBar';

const BlogHarness = createModelHarness<Blog>({
  recordName: 'blog',
  fields: ['title', 'posts'],
  createMutation: createBlog,
  updateMutation: updateBlog,
  deleteMutation: deleteBlog,
  getQuery: getBlog,
  listQuery: listBlogs,
  onCreateSubscription: onCreateBlog,
  onUpdateSubscription: onUpdateBlog,
  onDeleteSubscription: onDeleteBlog,
  sentinelData: {
    title: 'created blog',
    author: 'test suite',
  },
});

const PostHarness = createModelHarness<Post>({
  recordName: 'post',
  fields: ['title', 'blog', 'blogPostsId'],
  createMutation: createPost,
  updateMutation: updatePost,
  deleteMutation: deletePost,
  getQuery: getPost,
  listQuery: listPosts,
  onCreateSubscription: onCreatePost,
  onUpdateSubscription: onUpdatePost,
  onDeleteSubscription: onDeletePost,
  sentinelData: {
    title: 'created post',
    content: 'what a great post',
  },
});

export const Blogs = () => {
  return (
    <Flex direction='column'>
      <NavBar />
      <BlogHarness />
      <PostHarness />
    </Flex>
  );
};
