import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Globe, Shield, Star, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const communities = [
  {
    id: 1,
    name: "Art & Creative",
    domain: "art.nexus.social",
    description: "A vibrant community for artists, illustrators, and creative minds to share their work and inspire each other.",
    members: 12400,
    posts: 45200,
    category: "Creative",
    featured: true,
    trustLevel: "high",
  },
  {
    id: 2,
    name: "Tech Enthusiasts",
    domain: "tech.nexus.social",
    description: "Discuss the latest in technology, programming, open source, and digital privacy.",
    members: 28900,
    posts: 89300,
    category: "Technology",
    featured: true,
    trustLevel: "high",
  },
  {
    id: 3,
    name: "Science Hub",
    domain: "science.nexus.social",
    description: "Share and discuss scientific discoveries, research, and the wonders of the natural world.",
    members: 8700,
    posts: 23400,
    category: "Education",
    featured: false,
    trustLevel: "high",
  },
  {
    id: 4,
    name: "Music Zone",
    domain: "music.nexus.social",
    description: "For musicians, producers, and music lovers. Share your creations and discover new sounds.",
    members: 15600,
    posts: 67800,
    category: "Creative",
    featured: true,
    trustLevel: "high",
  },
  {
    id: 5,
    name: "Writers Guild",
    domain: "writers.nexus.social",
    description: "A space for writers of all genres to share their work, get feedback, and connect with fellow authors.",
    members: 6200,
    posts: 31500,
    category: "Creative",
    featured: false,
    trustLevel: "medium",
  },
  {
    id: 6,
    name: "Gaming World",
    domain: "gaming.nexus.social",
    description: "From indie gems to AAA titles, discuss games, share experiences, and find teammates.",
    members: 34500,
    posts: 124000,
    category: "Entertainment",
    featured: true,
    trustLevel: "high",
  },
  {
    id: 7,
    name: "Photography Club",
    domain: "photo.nexus.social",
    description: "Showcase your photography, learn techniques, and appreciate the art of capturing moments.",
    members: 9800,
    posts: 52100,
    category: "Creative",
    featured: false,
    trustLevel: "high",
  },
  {
    id: 8,
    name: "Book Lovers",
    domain: "books.nexus.social",
    description: "Discuss literature, share recommendations, and connect with fellow bibliophiles.",
    members: 7400,
    posts: 28900,
    category: "Education",
    featured: false,
    trustLevel: "high",
  },
];

const categories = ["All", "Creative", "Technology", "Education", "Entertainment"];

const trustColors = {
  high: "text-success bg-success/15",
  medium: "text-primary bg-primary/15",
  low: "text-destructive bg-destructive/15",
};

const Communities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredCommunities = communities.filter((community) => {
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || community.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredCommunities = filteredCommunities.filter((c) => c.featured);
  const otherCommunities = filteredCommunities.filter((c) => !c.featured);

  return (
    <div className="min-h-screen">
      <main className="pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Explore <span className="text-gradient-gold">Communities</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Find your people. Each community is independently operated with its own culture,
              rules, and moderation. Join one that aligns with your interests and values.
            </p>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-secondary border-border"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "" : "border-border"}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Featured Communities */}
          {featuredCommunities.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-primary" />
                <h2 className="font-display font-semibold text-xl">Featured Communities</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {featuredCommunities.map((community, index) => (
                  <CommunityCard key={community.id} community={community} featured index={index} />
                ))}
              </div>
            </div>
          )}

          {/* All Communities */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-xl">All Communities</h2>
              <span className="text-sm text-muted-foreground">({filteredCommunities.length})</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherCommunities.map((community, index) => (
                <CommunityCard key={community.id} community={community} index={index} />
              ))}
            </div>
          </div>

          {filteredCommunities.length === 0 && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-xl mb-2">No communities found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface CommunityCardProps {
  community: typeof communities[0];
  featured?: boolean;
  index: number;
}

function CommunityCard({ community, featured, index }: CommunityCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 transition-all duration-300 hover:border-primary/30 group cursor-pointer opacity-0 animate-fade-in-up",
        featured && "border-primary/20"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">
            {community.name}
          </h3>
          <p className="text-sm text-muted-foreground">{community.domain}</p>
        </div>
        <div className={cn(
          "px-2 py-1 text-xs font-medium rounded-full",
          trustColors[community.trustLevel as keyof typeof trustColors]
        )}>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span className="capitalize">{community.trustLevel}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {community.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{community.members.toLocaleString()}</span>
          </div>
          <span className="text-border">•</span>
          <span>{community.posts.toLocaleString()} posts</span>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

export default Communities;