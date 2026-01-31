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
import { getUserPosts, getUserLikedPosts, getUserCommentedPosts } from "../../content-sharing/api/client";
import type { Post } from "../../content-sharing/types";
import type { User } from "../types";
import { PostCard } from "../../content-sharing/components/PostCard";


const ProfileUI = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [commentedPosts, setCommentedPosts] = useState<Post[]>([]);
  const [activeSubTab, setActiveSubTab] = useState("Likes");
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



      } catch (err: any) {
        console.error("Failed to load profile:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [username, isOwnProfile, currentUser]);

  useEffect(() => {
    const fetchActivityData = async () => {
      if (activeTab === "Activity" && profileUser) {
        try {
          if (activeSubTab === "Likes") {
            const posts = await getUserLikedPosts(profileUser.id);
            setLikedPosts(posts);
          } else {
            const posts = await getUserCommentedPosts(profileUser.id);
            setCommentedPosts(posts);
          }
        } catch (err) {
          console.error("Failed to fetch activity data", err);
        }
      }
    };
    fetchActivityData();
  }, [activeTab, activeSubTab, profileUser]);

  const handleProfileUpdated = (updatedUser: User) => {
    setProfileUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-muted-foreground mb-4">{error || "User not found"}</p>
        <Button onClick={() => navigate("/feed")}>Back to Feed</Button>
      </div>
    );
  }

  const tabs = ["Posts", "Activity", "Media"];

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-8">
        {/* Cover */}
        <div className="h-32 md:h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-background relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Profile header */}
          <div className="relative -mt-16 md:-mt-20 mb-6">
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
                  <Button
                    variant="hero"
                    className="rounded-full px-6 gap-2 shadow-lg shadow-primary/20"
                    onClick={() => navigate("/settings")}
                  >
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
              <div className="glass-card rounded-[2rem] p-6 border-primary/10 bg-gradient-to-br from-card to-secondary/30">
                <div className="grid grid-cols-3 gap-4">
                  <div className="group cursor-pointer text-center">
                    <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                      {profileUser.posts_count || posts.length}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Posts</div>
                  </div>
                  <div className="group cursor-pointer text-center">
                    <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                      {profileUser.followers_count || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Followers</div>
                  </div>
                  <div className="group cursor-pointer text-center">
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
              <div className="flex gap-2 p-1.5 bg-secondary/50 backdrop-blur-md rounded-2xl mb-8 border border-border/50 sticky top-4 z-20">
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

                {activeTab === "Activity" && (
                  <div className="space-y-6">
                    {/* Sub Tabs */}
                    <div className="flex items-center gap-6 border-b border-border/50 px-2">
                      {["Likes", "Comments"].map((subTab) => (
                        <button
                          key={subTab}
                          onClick={() => setActiveSubTab(subTab)}
                          className={cn(
                            "py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors",
                            activeSubTab === subTab
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {subTab}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {activeSubTab === "Likes" && (
                        likedPosts.length === 0 ? (
                          <div className="glass-card rounded-3xl p-16 text-center opacity-50">
                            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-bold mb-1">No liked posts</h3>
                            <p className="text-sm">Posts {profileUser.display_name} likes will appear here.</p>
                          </div>
                        ) : (
                          likedPosts.map((post) => (
                            <div key={post.id} className="glass-card rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all shadow-sm">
                              <PostCard post={post} />
                            </div>
                          ))
                        )
                      )}

                      {activeSubTab === "Comments" && (
                        commentedPosts.length === 0 ? (
                          <div className="glass-card rounded-3xl p-16 text-center opacity-50">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-bold mb-1">No comments</h3>
                            <p className="text-sm">Posts {profileUser.display_name} commented on will appear here.</p>
                          </div>
                        ) : (
                          commentedPosts.map((post) => (
                            <div key={post.id} className="glass-card rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all shadow-sm">
                              <PostCard post={post} />
                            </div>
                          ))
                        )
                      )}
                    </div>
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
    </div>
  );
};

export default ProfileUI;