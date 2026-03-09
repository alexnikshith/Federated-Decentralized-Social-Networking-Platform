import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Globe, Users, Loader2, AlertCircle,
  UserPlus, UserCheck, AtSign, Hash
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "../../identity/api/client";
import { useAuthStore } from "../../identity/store/authStore";
import { CommunitiesSkeleton } from "@/components/skeletons/page-skeletons";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FederatedUser {
  actor_id?: string;
  username: string;
  display_name?: string;
  displayName?: string;
  handle?: string;
  domain?: string;
  instance?: string;
  avatar_url?: string;
  bio?: string;
  is_following?: boolean;
}

interface FederatedInstance {
  id?: string;
  name?: string;
  instance_id?: string;
  url?: string;
  description?: string;
  user_count?: number;
  is_trusted?: boolean;
}

const TABS = [
  { id: "people", label: "People", icon: Users },
  { id: "communities", label: "Communities", icon: Globe },
] as const;
type Tab = typeof TABS[number]["id"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isFederatedHandle = (q: string) =>
  /^@?[a-zA-Z0-9_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(q.trim());

const avatarLetter = (u: FederatedUser) =>
  (u.display_name || u.displayName || u.username || "?")[0].toUpperCase();

// ─── Component ────────────────────────────────────────────────────────────────

const Communities = () => {
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [people, setPeople] = useState<FederatedUser[]>([]);
  const [instances, setInstances] = useState<FederatedInstance[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { user } = useAuthStore();

  // ── Search people ──────────────────────────────────────────────────────────
  const searchPeople = useCallback(async (q: string) => {
    if (!q.trim()) { setPeople([]); return; }
    setLoading(true);
    setError("");
    try {
      if (isFederatedHandle(q)) {
        // Exact federated actor resolution
        const res = await api.get(`/api/activitypub/resolve?handle=${encodeURIComponent(q)}`);
        const data = res.data?.data || res.data;
        if (data) {
          setPeople(Array.isArray(data) ? data : [data]);
        } else {
          setPeople([]);
        }
      } else {
        // Regular user search (local + remote cache)
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(q)}&limit=20`);
        const data = res.data?.data || res.data || [];
        setPeople(Array.isArray(data) ? data : []);
      }
    } catch {
      setError("Could not search for people. Try again.");
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Search communities ─────────────────────────────────────────────────────
  const searchCommunities = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/federation/instances");
      const list: FederatedInstance[] = res.data?.data || res.data || [];
      const filtered = q.trim()
        ? list.filter(c =>
          (c.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (c.instance_id || c.url || "").toLowerCase().includes(q.toLowerCase()) ||
          (c.description || "").toLowerCase().includes(q.toLowerCase())
        )
        : list;
      setInstances(filtered);
    } catch {
      setError("Could not load communities. Try again.");
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounced search dispatch ──────────────────────────────────────────────
  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (activeTab === "people") searchPeople(val);
      else searchCommunities(val);
    }, 400);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPeople([]);
    setInstances([]);
    setError("");
    if (tab === "communities") searchCommunities(query);
    else if (query.trim()) searchPeople(query);
  };

  // ── Follow ─────────────────────────────────────────────────────────────────
  const handleFollow = async (person: FederatedUser) => {
    // Build the full handle: prefer person.handle, then construct @user@domain if domain/instance present
    const fullHandle =
      person.handle ||
      (person.username && (person.domain || person.instance)
        ? `@${person.username}@${person.domain || person.instance}`
        : person.username);

    if (!fullHandle) return;

    const key = person.actor_id || person.handle || `${person.username}@${person.domain || person.instance || "local"}`;
    setFollowLoading(s => new Set(s).add(key));
    try {
      await api.post("/api/follow", { handle: fullHandle });
      setFollowing(s => new Set(s).add(key));
      toast.success(`Following ${fullHandle}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not follow user.");
    } finally {
      setFollowLoading(s => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const isFollowing = (pu: FederatedUser) => {
    const key = pu.actor_id || pu.handle || `${pu.username}@${pu.domain || pu.instance || "local"}`;
    return pu.is_following || following.has(key);
  };


  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <main className="pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
              Explore <span className="text-gradient-gold">Federation</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover people and communities across the federated social network.
            </p>
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="federation-search-input"
                type="text"
                placeholder={
                  activeTab === "people"
                    ? "Search by name, username, or @user@domain…"
                    : "Search communities…"
                }
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                className="pl-12 h-12 text-base bg-secondary border-border rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50"
                autoComplete="off"
              />
              {loading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
            </div>
            {activeTab === "people" && (
              <p className="text-xs text-muted-foreground mt-2 ml-1 flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                To search Mastodon users, type{" "}
                <code className="px-1 rounded bg-muted">@username@mastodon.social</code>
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-8 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                id={`federation-tab-${t.id}`}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === t.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive mb-6 p-3 rounded-lg bg-destructive/10">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* ── People results ────────────────────────────────────── */}
          {activeTab === "people" && (
            <div>
              {!query.trim() ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground mb-1">Search for people</p>
                    <p className="text-sm">Find local users or discover people across the Mastodon network</p>
                  </div>
                </div>
              ) : loading && people.length === 0 ? (
                <CommunitiesSkeleton />
              ) : people.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-foreground">No results found</p>
                  <p className="text-sm mt-1">
                    Try a full handle like <code className="px-1 rounded bg-muted">@name@mastodon.social</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {people.map((pu, i) => {
                    const displayName = pu.display_name || pu.displayName || pu.username;
                    const handle = pu.handle ||
                      (pu.username && pu.domain ? `@${pu.username}@${pu.domain}` :
                        pu.username && pu.instance ? `@${pu.username}@${pu.instance}` :
                          `@${pu.username}`);
                    const key = pu.actor_id || pu.handle || `${i}-${pu.username}`;
                    const isMe = user?.username === pu.username && !pu.domain;
                    const alreadyFollowing = isFollowing(pu);
                    const fLoading = followLoading.has(pu.handle || pu.actor_id || pu.username || "");

                    return (
                      <div
                        key={key}
                        className="glass-card rounded-xl p-4 flex items-center gap-4 group"
                      >
                        {/* Avatar */}
                        <div className="shrink-0">
                          {pu.avatar_url ? (
                            <img
                              src={pu.avatar_url}
                              alt={displayName}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                              {avatarLetter(pu)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">{handle}</p>
                          {pu.bio && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pu.bio}</p>
                          )}
                        </div>

                        {/* Follow button */}
                        {!isMe && (
                          <Button
                            id={`follow-btn-${key}`}
                            size="sm"
                            variant={alreadyFollowing ? "outline" : "default"}
                            disabled={fLoading || alreadyFollowing}
                            onClick={() => handleFollow(pu)}
                            className="shrink-0 gap-1.5"
                          >
                            {fLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : alreadyFollowing ? (
                              <><UserCheck className="w-4 h-4" /> Following</>
                            ) : (
                              <><UserPlus className="w-4 h-4" /> Follow</>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Communities results ───────────────────────────────── */}
          {activeTab === "communities" && (
            <div>
              {loading && instances.length === 0 ? (
                <CommunitiesSkeleton />
              ) : instances.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Hash className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-foreground">No communities found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {instances.map((c, i) => {
                    const name = c.name || c.instance_id || c.url || `Community ${i + 1}`;
                    const domain = c.url || c.instance_id || "";
                    const key = c.id || c.instance_id || `inst-${i}`;

                    return (
                      <div key={key} className="glass-card rounded-xl p-5 flex flex-col gap-3">
                        {/* Icon + Name */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">{domain.replace(/^https?:\/\//, "")}</p>
                          </div>
                          {c.is_trusted && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full text-emerald-400 bg-emerald-400/15 shrink-0">
                              Trusted
                            </span>
                          )}
                        </div>

                        {c.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                        )}

                        {c.user_count != null && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            {c.user_count.toLocaleString()} members
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Communities;