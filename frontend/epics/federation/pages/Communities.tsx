import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Globe, Shield, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../../src/config/communities";
import { toast } from "sonner";
import { JoinCommunityModal } from "../../../src/components/auth/JoinCommunityModal";
import { useAuthStore } from "../../identity/store/authStore";

import { api } from "../../identity/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Communities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  // Modal State
  // Modal State
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [targetCommunity, setTargetCommunity] = useState<typeof COMMUNITIES[0] | null>(null);
  const [leaveCommunity, setLeaveCommunity] = useState<typeof COMMUNITIES[0] | null>(null);
  const [password, setPassword] = useState("");

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
            api.post('/api/profile/me/communities', { community_id: s.communityId })
              .catch(err => console.error("Auto-sync failed", err));
          }
        }
      });
    }
  }, [user?.id, sessions.length]);
  // Real-time validation state: null = unknown, true = valid linked account, false = remote account missing/invalid
  const [validations, setValidations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const verifyConnections = async () => {
      if (!user?.email) return;

      const results: Record<string, boolean> = {};

      await Promise.all(COMMUNITIES.map(async (community) => {
        const communityId = community.id;
        const session = sessions.find(s => s.communityId === communityId && s.user.email === user.email);

        // 1. Try Token
        if (session?.token) {
          try {
            await axios.get(`${community.url}/api/auth/me`, {
              headers: { Authorization: `Bearer ${session.token}` }
            });
            results[communityId] = true;
            return;
          } catch (e) {
            // Token failed, fall through to email check
          }
        }

        // 2. Try Email Check (Public Endpoint)
        try {
          const res = await axios.post(`${community.url}/api/auth/check-email`, { email: user.email });
          results[communityId] = res.data.exists;
        } catch (e) {
          // Offline or error, fallback to local Profile knowledge if available
          results[communityId] = user.joined_communities?.includes(communityId) ?? false;
        }
      }));

      setValidations(results);
    };

    verifyConnections();
  }, [user?.joined_communities, sessions, user?.email]);

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

  const handleLeaveClick = (community: typeof COMMUNITIES[0]) => {
    setLeaveCommunity(community);
  };

  const handleLeaveConfirm = async () => {
    if (!leaveCommunity) return;

    try {
      if (!password) {
        toast.error("Please enter your password to confirm.");
        return;
      }

      // Login to verify and get token
      let deleteToken = null;
      try {
        const res = await axios.post(`${leaveCommunity.url}/api/auth/login`, {
          email: user?.email,
          password: password
        });
        deleteToken = res.data.token;
      } catch (e) {
        console.error("Verification failed", e);
        toast.error("Incorrect password or unable to connect to community.");
        return;
      }

      // Delete Account
      if (deleteToken) {
        try {
          await axios.delete(`${leaveCommunity.url}/api/profile/me`, {
            headers: { Authorization: `Bearer ${deleteToken}` }
          });
          toast.success(`Account deleted from ${leaveCommunity.name}`);

          const targetSession = user?.email ? sessions.find(s => s.communityId === leaveCommunity.id && s.user.email === user.email) : null;
          if (targetSession) {
            useAuthStore.getState().removeAccount(targetSession.user.id);
          }
        } catch (e) {
          console.error("Deletion failed", e);
          toast.error("Failed to delete account data.");
          return;
        }
      }

      await api.delete(`/api/profile/me/communities/${leaveCommunity.id}`);
      toast.success(`Left ${leaveCommunity.name}`);

      // Auto-update UI without reload
      setValidations(prev => ({ ...prev, [leaveCommunity.id]: false }));

      const state = useAuthStore.getState();
      if (state.user) {
        const updatedUser = {
          ...state.user,
          joined_communities: (state.user.joined_communities || []).filter(id => id !== leaveCommunity.id)
        };
        state.setAuth(updatedUser, state.token);
      }

      setLeaveCommunity(null);
      setPassword("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to leave community");
    }
    setLeaveCommunity(null);
    setPassword("");
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
                const hasSession = user?.email
                  ? sessions.some(s => s.communityId === community.id && s.token && s.user.email === user.email)
                  : false;

                const inProfile = user?.joined_communities?.includes(community.id);
                const isCurrent = activeId === community.id;
                const validation = validations[community.id];
                // Trust real-time validation if available, else fallback to local hints
                const isJoined = validation !== undefined
                  ? validation
                  : (inProfile || (user?.email && sessions.some(s => s.communityId === community.id && s.token && s.user.email === user.email)));

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

                      {isCurrent ? (
                        <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                          Current
                        </Button>
                      ) : isJoined ? (
                        <Button
                          variant="destructive"
                          onClick={() => handleLeaveClick(community)}
                          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                        >
                          Leave
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleJoinClick(community)}
                          className="gap-2"
                        >
                          Join Now
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      )}
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

      <AlertDialog open={!!leaveCommunity} onOpenChange={() => { setLeaveCommunity(null); setPassword(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {leaveCommunity?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave {leaveCommunity?.name}?
              This will <strong>permanently delete your account and data</strong> on {leaveCommunity?.name}.
              <br /><br />
              Please enter your password for <strong>{leaveCommunity?.name}</strong> to confirm:
            </AlertDialogDescription>
            <div className="py-4">
              <Input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Communities;