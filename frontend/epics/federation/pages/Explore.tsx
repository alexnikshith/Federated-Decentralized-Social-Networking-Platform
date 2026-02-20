import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../../src/config/communities";
import { getFeed } from "../../content-sharing/api/client";
import { PostCard } from "../../content-sharing/components/PostCard";
import type { Post } from "../../content-sharing/types";
import { useAuthStore } from "../../identity/store/authStore";

const tabs = [
  { id: "for-you", name: "For You", icon: Sparkles },
  { id: "trending", name: "Trending", icon: TrendingUp },
  { id: "recent", name: "Recent", icon: Clock },
];

const Explore = () => {
  const [activeTab, setActiveTab] = useState("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuthStore();

  const activeCommunityId = localStorage.getItem('active_community_id');
  const community = COMMUNITIES.find(c => c.id === activeCommunityId) || DEFAULT_COMMUNITY;

  const loadPosts = async () => {
    setLoading(true);
    setError("");
    try {
      // Ideally fetch different endpoints for trending/recent
      const data = await getFeed('public', 50); // Fetch public feed for community exploration
      setPosts(data.posts || []);
    } catch (e) {
      setError("Failed to load community content. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const getFilteredPosts = () => {
    if (activeTab === "trending") {
      if (posts.length === 0) return [];

      const getInteractions = (p: Post) => p.like_count + p.comment_count;

      const interactions = posts.map(getInteractions);
      const totalCombinedInteraction = interactions.reduce((sum, count) => sum + count, 0);
      const averageInteraction = totalCombinedInteraction / posts.length;

      // Filter: Must be above average AND have at least 2 interactions (likes+comments)
      // This prevents 1-like posts from trending if the average is very low (e.g. 0.02)
      return posts
        .filter(post => {
          const count = getInteractions(post);
          return count > averageInteraction && count > 1;
        })
        .sort((a, b) => getInteractions(b) - getInteractions(a));
    }

    if (activeTab === "recent") {
      const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;
      const now = Date.now();
      return posts
        .filter(post => {
          const postTime = new Date(post.created_at).getTime();
          return (now - postTime) < SIX_HOURS_IN_MS;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (activeTab === "for-you") {
      // Backend already sorts by recommendation for 'public' feed when logged in
      return posts;
    }

    return posts;
  };

  const filteredPosts = getFilteredPosts();

  return (
    <div className="min-h-screen">
      <main className="pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
                Explore in <span className="text-gradient-teal">{community.name}</span>
              </h1>
              <p className="text-muted-foreground">
                Discover the best content in {community.name}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>Loading community content...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p>{error}</p>
                  <Button variant="outline" onClick={loadPosts} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No posts found matching the current criteria.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;