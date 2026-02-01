import React from 'react';
import { useGeneratedPosts } from '../hooks/useDb';
import PostCard from '../components/PostCard';
import Spinner from '../components/Spinner';
import { useAuth } from '../contexts/AuthContext';

const GeneratedPosts: React.FC = () => {
  const { user } = useAuth();
  const { data: posts, loading, error, refresh } = useGeneratedPosts(user?.id);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Generated Posts</h2>
      
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Spinner />
          <span className="ml-4 text-text-secondary">Loading posts...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 text-red-300 p-4 rounded-md">
          <p>Error loading posts: {error.message}</p>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-lg">
          {!user ? (
            <>
                <h3 className="text-xl font-semibold text-text-primary">Sign in to View Posts</h3>
                <p className="mt-2 text-text-secondary">Your generated posts will be stored here once you sign in.</p>
            </>
          ) : (
            <>
                <h3 className="text-xl font-semibold text-text-primary">No Posts Yet</h3>
                <p className="mt-2 text-text-secondary">Go to the Dashboard to generate your first post with AI.</p>
            </>
          )}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onPostUpdate={refresh} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneratedPosts;