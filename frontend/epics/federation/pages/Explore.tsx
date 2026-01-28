import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Clock,
  Globe,
  MessageSquare,
  Heart,
  Share2,
  MoreHorizontal,
  Bookmark,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tabs = [
  { id: "trending", name: "Trending", icon: TrendingUp },
  { id: "recent", name: "Recent", icon: Clock },
  { id: "federated", name: "Federated", icon: Globe },
];

const posts = [
  {
    id: 1,
    author: {
      name: "Elena Rodriguez",
      handle: "@elena",
      instance: "art.nexus.social",
      avatar: "ER",
    },
    content: "Just finished my latest digital painting inspired by the northern lights. The way the colors dance across the sky is something I've been trying to capture for months. 🌌✨",
    timestamp: "2h ago",
    likes: 234,
    comments: 45,
    shares: 12,
    federated: false,
  },
  {
    id: 2,
    author: {
      name: "Marcus Chen",
      handle: "@mchen",
      instance: "tech.nexus.social",
      avatar: "MC",
    },
    content: "Excited to announce that our open-source privacy toolkit just hit 10k stars on GitHub! 🎉 This community-driven approach to protecting user data shows what's possible when we work together.",
    timestamp: "4h ago",
    likes: 567,
    comments: 89,
    shares: 156,
    federated: true,
  },
  {
    id: 3,
    author: {
      name: "Dr. Sarah Kim",
      handle: "@drkim",
      instance: "science.nexus.social",
      avatar: "SK",
    },
    content: "New research paper published! We've discovered a fascinating correlation between urban green spaces and community mental health outcomes. Open access link in my profile. 🌿🧠",
    timestamp: "6h ago",
    likes: 890,
    comments: 127,
    shares: 234,
    federated: true,
  },
  {
    id: 4,
    author: {
      name: "Jazz Collective",
      handle: "@jazzcollective",
      instance: "music.nexus.social",
      avatar: "JC",
    },
    content: "Tonight's jam session was absolutely magical. When everyone's in sync, there's nothing like it. Recording coming soon! 🎷🎹🎸",
    timestamp: "8h ago",
    likes: 156,
    comments: 23,
    shares: 8,
    federated: false,
  },
  {
    id: 5,
    author: {
      name: "Alex Rivers",
      handle: "@alexr",
      instance: "writers.nexus.social",
      avatar: "AR",
    },
    content: "Chapter 47 is finally done. This novel has been a journey of three years, countless cups of coffee, and more self-doubt than I'd like to admit. But we're almost there. 📚✍️",
    timestamp: "12h ago",
    likes: 423,
    comments: 67,
    shares: 29,
    federated: true,
  },
];

const Explore = () => {
  const [activeTab, setActiveTab] = useState("trending");

  return (
    <div className="min-h-screen">
      <main className="pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold mb-2">
                Explore the <span className="text-gradient-teal">Federation</span>
              </h1>
              <p className="text-muted-foreground">
                Discover content from across the federated network
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

            {/* Posts */}
            <div className="space-y-4">
              {posts.map((post, index) => (
                <PostCard key={post.id} post={post} index={index} />
              ))}
            </div>

            {/* Load more */}
            <div className="mt-8 text-center">
              <Button variant="outline" size="lg">
                Load more posts
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface PostCardProps {
  post: typeof posts[0];
  index: number;
}

function PostCard({ post, index }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <article
      className="glass-card rounded-xl p-5 transition-all hover:border-border/80 opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
            {post.author.avatar}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{post.author.name}</span>
              <span className="text-sm text-muted-foreground">{post.author.handle}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {post.federated && (
                <>
                  <span className="instance-badge">
                    <Globe className="w-3 h-3" />
                    {post.author.instance}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{post.timestamp}</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed mb-4">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 text-muted-foreground hover:text-foreground",
              liked && "text-destructive hover:text-destructive"
            )}
            onClick={() => setLiked(!liked)}
          >
            <Heart className={cn("w-4 h-4", liked && "fill-current")} />
            <span>{liked ? post.likes + 1 : post.likes}</span>
          </Button>

          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{post.comments}</span>
          </Button>

          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Share2 className="w-4 h-4" />
            <span>{post.shares}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-muted-foreground hover:text-foreground",
              bookmarked && "text-primary hover:text-primary"
            )}
            onClick={() => setBookmarked(!bookmarked)}
          >
            <Bookmark className={cn("w-4 h-4", bookmarked && "fill-current")} />
          </Button>

          {post.federated && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default Explore;