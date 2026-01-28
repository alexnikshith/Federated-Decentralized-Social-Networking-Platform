import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  Globe,
  Heart,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Shield,
  Edit,
  UserPlus,
  Loader2,
  FileText,
  Activity,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { profileApi } from "../api/client";
import { getUserPosts } from "../../content-sharing/api/client";
import type { Post } from "../../content-sharing/types";
import type { User, ActivityLog } from "../types";
import { PostCard } from "../../content-sharing/components/PostCard";

const ProfileUI = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !username || username === currentUser?.username || username === currentUser?.id;

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        let userToDisplay: User;

        if (isOwnProfile && currentUser) {
          // Fetch fresh data for own profile
          userToDisplay = await profileApi.getMyProfile();
        } else if (username) {
          // Fetch other user's profile
          userToDisplay = await profileApi.getProfile(username);
        } else {
          throw new Error("User not found");
        }

        setProfileUser(userToDisplay);

        // Fetch posts for this user
        const postsData = await getUserPosts(userToDisplay.id);
        setPosts(postsData.posts);

        // Fetch activity if own profile
        if (isOwnProfile) {
          const activityData = await profileApi.getActivity(10);
          setActivities(activityData);
        }

      } catch (err: any) {
        console.error("Failed to load profile:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [username, isOwnProfile, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error || "User not found"}</p>
          <Button onClick={() => navigate("/feed")}>Back to Feed</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const tabs = isOwnProfile ? ["Posts", "Activity", "Media"] : ["Posts", "Media"];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 pb-20">
        {/* Cover */}
        <div className="h-48 md:h-72 bg-gradient-to-br from-primary/20 via-accent/10 to-background relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container mx-auto px-4 lg:px-8">
          {/* Profile header */}
          <div className="relative -mt-20 mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                {/* Avatar */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-primary flex items-center justify-center text-5xl font-bold text-primary-foreground border-8 border-background shadow-2xl z-10">
                  {profileUser.avatar_url ? (
                    <img src={profileUser.avatar_url} alt={profileUser.display_name} className="w-full h-full object-cover rounded-[1.25rem]" />
                  ) : (
                    profileUser.display_name?.[0]?.toUpperCase() || profileUser.username[0].toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="font-display text-3xl font-bold tracking-tight">{profileUser.display_name || profileUser.username}</h1>
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-3 h-3 text-primary" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                    <span className="font-medium">@{profileUser.username}</span>
                    <span className="instance-badge bg-secondary/50 text-secondary-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-border/50">
                      <Globe className="w-3 h-3" />
                      {profileUser.instance || "nexus.social"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-start md:self-end pb-2">
                {isOwnProfile ? (
                  <Button variant="hero" className="rounded-full px-6 gap-2 shadow-lg shadow-primary/20">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 hover:bg-secondary">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                    <Button
                      variant={isFollowing ? "outline" : "hero"}
                      className="rounded-full px-8 h-11 shadow-lg shadow-primary/20"
                      onClick={() => setIsFollowing(!isFollowing)}
                    >
                      {isFollowing ? "Following" : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </span>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Bio & Details */}
              <div className="glass-card rounded-[2rem] p-8 border-primary/10">
                <p className="text-foreground/90 leading-relaxed mb-6 text-lg">
                  {profileUser.bio || "No bio yet."}
                </p>

                <div className="space-y-4 text-sm font-medium">
                  {profileUser.location && (
                    <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{profileUser.location}</span>
                    </div>
                  )}
                  {profileUser.website && (
                    <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors font-bold pr-2">
                      <LinkIcon className="w-4 h-4 text-primary" />
                      <a
                        href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {profileUser.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Joined {new Date(profileUser.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="glass-card rounded-[2rem] p-8 border-primary/10 bg-gradient-to-br from-card to-secondary/30">
                <div className="grid grid-cols-2 gap-8">
                  <div className="group cursor-pointer">
                    <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                      {posts.length}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Posts</div>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                      {profileUser.followers_count || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Followers</div>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                      {profileUser.following_count || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Following</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="lg:col-span-8">
              {/* Tabs */}
              <div className="flex gap-2 p-1.5 bg-secondary/50 backdrop-blur-md rounded-2xl mb-8 border border-border/50 sticky top-20 z-20">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-xl transition-all",
                      activeTab === tab
                        ? "bg-background text-primary shadow-glow scale-[0.98]"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {tab === "Posts" && <FileText className="w-4 h-4" />}
                    {tab === "Activity" && <Activity className="w-4 h-4" />}
                    {tab === "Media" && <ImageIcon className="w-4 h-4" />}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === "Posts" && (
                  <>
                    {posts.length === 0 ? (
                      <div className="glass-card rounded-3xl p-20 text-center opacity-50">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-bold mb-1">No posts yet</h3>
                        <p className="text-sm">When they post, they'll appear here.</p>
                      </div>
                    ) : (
                      posts.map((post, index) => (
                        <div key={post.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                          <div className="glass-card rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all shadow-sm hover:shadow-glow">
                            <PostCard post={post} />
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === "Activity" && isOwnProfile && (
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <div className="glass-card rounded-3xl p-20 text-center opacity-50">
                        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-bold mb-1">No recent activity</h3>
                        <p className="text-sm">Your recent actions will be listed here.</p>
                      </div>
                    ) : (
                      activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className="glass-card rounded-2xl p-5 flex items-center gap-4 animate-scale-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl shadow-inner">
                            {activity.action === 'login' && '🔐'}
                            {activity.action === 'logout' && '🚪'}
                            {activity.action === 'profile_update' && '✏️'}
                            {activity.action === 'password_change' && '🔑'}
                            {activity.action === 'signup' && '✨'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold uppercase tracking-widest text-[10px] text-primary">{activity.action.replace('_', ' ')}</h4>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">{new Date(activity.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm font-medium text-foreground/80 mt-1">{activity.details}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "Media" && (
                  <div className="glass-card rounded-3xl p-20 text-center opacity-50 border-dashed">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-1">Gallery is empty</h3>
                    <p className="text-sm">Media uploads are currently in development.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfileUI;