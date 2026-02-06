import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Globe, Shield, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../../src/config/communities";
import { toast } from "sonner";
import { JoinCommunityModal } from "../../../src/components/auth/JoinCommunityModal";
import { useAuthStore } from "../../identity/store/authStore";

import { api } from "../../identity/api/client";

const Communities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  // Modal State
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [targetCommunity, setTargetCommunity] = useState<typeof COMMUNITIES[0] | null>(null);

  const { user, sessions } = useAuthStore();

  // Self-heal: Sync local sessions to backend profile
  useEffect(() => {
    if (user && sessions.length > 0) {
      sessions.forEach(s => {
        // If we have a session for a community, but backend doesn't know about it
        if (s.communityId && !user.joined_communities?.includes(s.communityId)) {
          // Skip if it's the current community ID (implied)
          const activeId = localStorage.getItem('active_community_id');
          if (s.communityId !== activeId) {
            api.post('/profile/me/communities', { community_id: s.communityId })
              .catch(err => console.error("Auto-sync failed", err));
          }
        }
      });
    }
  }, [user?.id, sessions.length]); // Depend on user ID and sessions count match usually

  const handleJoinClick = (community: typeof COMMUNITIES[0]) => {
    // Open Modal to Register/Login to the target community
    setTargetCommunity(community);
    setJoinModalOpen(true);
  };

  const handleJoinSuccess = () => {
    // Logic after successful Auth on new community
    if (targetCommunity) {
      toast.success(`Joined ${targetCommunity.name} successfully!`);
      // No reload needed potentially if we update store, but reload is safer for now
      setTimeout(() => window.location.reload(), 500);
    }
    setJoinModalOpen(false);
  };

  const filteredCommunities = COMMUNITIES.filter((community) => {
    return community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
              Find your people. Each community is independently operated. Join one to create an account there.
            </p>
          </div>

          {/* Search */}
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
          </div>

          {/* Communities Grid */}
          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunities.map((community, index) => {
                const activeId = localStorage.getItem('active_community_id');
                const hasSession = sessions.some(s => s.communityId === community.id && s.token);
                const inProfile = user?.joined_communities?.includes(community.id);
                const isJoined = (!!user && activeId === community.id) || hasSession || inProfile;
                return (
                  <div
                    key={community.id}
                    className="glass-card rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-display font-semibold text-lg">
                            {community.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{community.url.replace('http://', '')}</p>
                        </div>
                        <div className="px-2 py-1 text-xs font-medium rounded-full text-success bg-success/15">
                          <span className="capitalize">Verified</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-6 line-clamp-3">
                        {community.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Active</span>
                      </div>

                      <Button
                        variant={isJoined ? "outline" : "default"}
                        disabled={isJoined}
                        onClick={() => handleJoinClick(community)}
                        className="gap-2"
                      >
                        {isJoined ? "Joined" : "Join Now"}
                        {!isJoined && <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <JoinCommunityModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        targetCommunity={targetCommunity}
        currentUserEmail={user?.email || ""}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
};

export default Communities;