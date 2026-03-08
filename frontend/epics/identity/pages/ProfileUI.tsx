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
  Image as ImageIcon,
  Lock,
  Calendar as CalendarIcon,
  X,
  Ban,
  Flag,
  Bookmark
} from "lucide-react";
import { ReportModal } from "../../reports/components/ReportModal";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { profileApi, api } from "../api/client";
import {
  getUserPosts,
  getUserLikedPosts,
  getUserCommentedPosts,
  followUser,
  unfollowUser,
  followRemoteUser,
  unfollowRemoteUser,
  followMastodonUser,
  unfollowMastodonUser,
  getFollowers,
  getFollowing,
  getSavedPosts
} from "../../content-sharing/api/client";
import type { Post } from "../../content-sharing/types";
import type { User } from "../types";
import { PostCard } from "../../content-sharing/components/PostCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileSkeleton } from "@/components/skeletons/page-skeletons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { blockUser, unblockUser, getBlockedUsers } from "../../safety/api/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, isToday, isYesterday, isSameDay } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "@/config/communities";
import axios from "axios";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: Array<{ id: string; username: string; display_name: string; avatar_url: string }>;
  loading: boolean;
}

const UserListModal = ({ isOpen, onClose, title, users, loading }: UserListModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No users found.</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => {
                    navigate(`/profile/${user.username}`);
                    onClose();
                  }}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.display_name?.[0] || user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{user.display_name || user.username}</span>
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


// ProfileUI displays the user profile
// It handles:
// 1. User information display (bio, stats, avatar)
// 2. Tabular content (Posts, Activity) and sub-tabs
// 3. Interactions (Follow, Block, Report)
const ProfileUI = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const { toast } = useToast();
  // UI State for tabs
  const [activeTab, setActiveTab] = useState("Posts");

  // Relationship State
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Data State
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [commentedPosts, setCommentedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [targetCommunityUrl, setTargetCommunityUrl] = useState("");

  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState("All");
  const [activitySubTab, setActivitySubTab] = useState("Likes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get("post");
  const shouldOpenComments = searchParams.get("openComments") === "true";
  const communityHint = searchParams.get("community");

  // Date Filter State
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();


  const isOwnProfile = !username || username === currentUser?.username || username === currentUser?.id;

  const loadProfileData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      let userToDisplay: User | null = null;
      let foundUrl = "";

      if (isOwnProfile && currentUser) {
        // Fetch fresh data for own profile
        userToDisplay = await profileApi.getMyProfile();
        foundUrl = ""; // Use local
      } else if (username) {
        // 1. Try ACTIVE community first (authenticated)
        try {
          userToDisplay = await profileApi.getProfile(username);
          foundUrl = localStorage.getItem('active_community_url') || "";
        } catch (err: any) {
          // If not found on active community, proceed to federated search
          if (err.response?.status !== 404) {
            console.error("Error checking active community:", err);
          }
        }

        // 2. If still not found, search others (Federated Discovery)
        if (!userToDisplay) {
          const communitiesToSearch = [
            ...(communityHint ? [{ url: communityHint, name: "Hinted Community" }] : []),
            DEFAULT_COMMUNITY,
            ...COMMUNITIES.filter(c => c.url !== DEFAULT_COMMUNITY.url && c.url !== localStorage.getItem('active_community_url') && c.url !== communityHint)
          ];

          for (const community of communitiesToSearch) {
            try {
              // We use the authenticated api instance but with an absolute URL
              // This ensures our token is sent to others too (they might accept it if federated trust exists)
              // Or at least it's consistent. 
              const response = await api.get(`${community.url}/api/profile/${username}`);
              if (response.data) {
                userToDisplay = response.data;
                foundUrl = community.url;

                // If we're logged in, resolve this user on our LOCAL server too
                // This ensures they are cached in our database and we get a local ID for follow actions
                if (currentUser) {
                  try {
                    const cleanDomain = foundUrl.replace(/^https?:\/\//, '');
                    const resolveResponse = await api.post('/api/federation/users/resolve', {
                      handle: `${userToDisplay.username}@${cleanDomain}`
                    });
                    if (resolveResponse.data && resolveResponse.data.id) {
                      // Use the local resolved user data (contains our local ObjectID)
                      userToDisplay = resolveResponse.data;
                    }
                  } catch (resolveErr) {
                    console.error("Local resolve failed for remote user:", resolveErr);
                  }
                }
                break;
              }
            } catch (err: any) {
              if (err.response?.status !== 404) {
                console.error(`Error fetching profile from ${community.name}:`, err);
              }
            }
          }
        }
      }

      setTargetCommunityUrl(foundUrl);

      if (!userToDisplay) {
        throw new Error("User not found in the federation");
      }

      // Ensure stats are present
      userToDisplay.followers_count = userToDisplay.followers_count ?? 0;
      userToDisplay.following_count = userToDisplay.following_count ?? 0;
      userToDisplay.posts_count = userToDisplay.posts_count ?? 0;

      setProfileUser(userToDisplay);
      setIsFollowing(!!userToDisplay.is_following);

      // Fetch posts for this user from the CORRECT community
      const postsUrl = foundUrl || ""; // Empty means local base
      const postsResponse = await api.get(`${postsUrl}/api/users/${userToDisplay.id}/posts`);
      setPosts(postsResponse.data.data.posts || []);

    } catch (err: any) {
      console.error("Failed to load profile:", err);
      setError(err.response?.data?.message || err.message || "Failed to load profile");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Load Initial Profile Data
  // Load Initial Profile Data
  useEffect(() => {
    // Soft reload if we already have the correct user data
    const isDataLoaded = profileUser && (
      (isOwnProfile && profileUser.id === currentUser?.id) ||
      (!isOwnProfile && profileUser.username === username)
    );

    loadProfileData(!isDataLoaded);
  }, [username, isOwnProfile, currentUser?.id]);

  // Handle scrolling to target post (deep linking)
  useEffect(() => {
    if (targetPostId && !loading && posts.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`post-${targetPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // Wait for animations
      return () => clearTimeout(timer);
    }
  }, [targetPostId, loading, posts]);

  const [activityLoading, setActivityLoading] = useState(false);

  // Lazy load activity data when tabs change
  useEffect(() => {
    const fetchActivityData = async () => {
      if (activeTab === "Activity" && profileUser) {
        setActivityLoading(true);
        try {
          const baseUrl = targetCommunityUrl || "";
          if (activitySubTab === "Likes") {
            const response = await api.get(`${baseUrl}/api/users/${profileUser.id}/likes`);
            setLikedPosts(response.data.data.posts || []); // Ensure we get the posts array
          } else if (activitySubTab === "Comments") {
            const response = await api.get(`${baseUrl}/api/users/${profileUser.id}/comments`);
            setCommentedPosts(response.data.data.posts || []); // Ensure we get the posts array
          }
        } catch (err) {
          console.error("Failed to fetch activity data", err);
        } finally {
          setActivityLoading(false);
        }
      } else if (activeTab === "Posts" && activeSubTab === "Saved" && profileUser) {
        setActivityLoading(true);
        try {
          const data = await getSavedPosts();
          setSavedPosts(data.posts);
        } catch (err) {
          console.error("Failed to fetch saved posts", err);
        } finally {
          setActivityLoading(false);
        }
      }
    };
    fetchActivityData();
  }, [activeTab, activitySubTab, activeSubTab, profileUser, targetCommunityUrl]);

  // Check if user is blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!currentUser || !profileUser) return;
      try {
        const blockedUsers = await getBlockedUsers();
        const isUserBlocked = blockedUsers.some(b => b.blocked_id === profileUser.id);
        setIsBlocked(isUserBlocked);
      } catch (error) {
        console.error("Failed to check block status", error);
      }
    };
    checkBlockStatus();
  }, [currentUser, profileUser]);

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState("");
  const [listModalUsers, setListModalUsers] = useState<Array<{ id: string; username: string; display_name: string; avatar_url: string }>>([]);
  const [listModalLoading, setListModalLoading] = useState(false);
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);


  const handleOpenFollowers = async () => {
    if (!profileUser) return;
    setListModalTitle("Followers");
    setIsListModalOpen(true);
    setListModalLoading(true);
    try {
      const data = await getFollowers(profileUser.id);
      setListModalUsers(data);
    } catch (err) {
      console.error("Failed to fetch followers", err);
    } finally {
      setListModalLoading(false);
    }
  };

  const handleOpenFollowing = async () => {
    if (!profileUser) return;
    setListModalTitle("Following");
    setIsListModalOpen(true);
    setListModalLoading(true);
    try {
      const data = await getFollowing(profileUser.id);
      setListModalUsers(data);
    } catch (err) {
      console.error("Failed to fetch following", err);
    } finally {
      setListModalLoading(false);
    }
  };

  const handleProfileUpdated = (updatedUser: User) => {
    setProfileUser(updatedUser);
  };

  // Toggle block/unblock user
  const handleBlockUser = async () => {
    if (!profileUser) return;

    if (isBlocked) {
      try {
        await unblockUser(profileUser.id);
        setIsBlocked(false);
        toast({
          title: "User unblocked",
          description: `${profileUser.display_name} has been unblocked.`,
        });
      } catch (error) {
        console.error("Failed to unblock user:", error);
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to unblock user",
          variant: "destructive",
        });
      }
    } else {
      setShowBlockConfirmation(true);
    }
  };

  // Confirm block action
  const confirmBlockUser = async () => {
    if (!profileUser) return;
    try {
      await blockUser(profileUser.id);
      setIsBlocked(true);
      setIsFollowing(false); // Auto unfollow
      setShowBlockConfirmation(false);
      // Clear posts to reflect blocked state
      setPosts([]);
      setLikedPosts([]);
      setCommentedPosts([]);
      toast({
        title: "User blocked",
        description: `${profileUser.display_name} has been blocked.`,
      });
      // Do not navigate away, show the blocked state on profile
    } catch (error) {
      console.error("Failed to block user:", error);
      // Better error message handling
      const errorMessage = error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? "Route not found (404)" : "Failed to block user");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setShowBlockConfirmation(false);
    }
  };

  // Reusable Filter Logic
  const applyFilters = (items: Post[]) => {
    if (!startDate && !endDate) return items;
    return items.filter(post => {
      const postDate = new Date(post.created_at);
      if (startDate && postDate < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (postDate > endOfDay) return false;
      }
      return true;
    });
  };

  const filteredPosts = applyFilters(posts);
  const filteredLikedPosts = applyFilters(likedPosts);
  const filteredCommentedPosts = applyFilters(commentedPosts);
  const filteredSavedPosts = applyFilters(savedPosts);

  // Toggle like on a post and update local state
  const handlePostLike = (postId: string) => {
    const updateList = (list: Post[]) => list.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !p.is_liked,
          like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1
        };
      }
      return p;
    });

    setPosts(prev => updateList(prev));
    setLikedPosts(prev => updateList(prev));
    setCommentedPosts(prev => updateList(prev));
    setSavedPosts(prev => updateList(prev));
  };

  // Render Filter Section UI
  const renderFilterUI = () => (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-2 px-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-2">Quick Filters:</span>
        <Button variant="outline" size="sm" onClick={() => { setStartDate(subDays(new Date(), 7)); setEndDate(new Date()); }} className="rounded-full h-8 text-xs hover:bg-primary/10 hover:border-primary/50 transition-all">Last 7 Days</Button>
        <Button variant="outline" size="sm" onClick={() => { setStartDate(subDays(new Date(), 30)); setEndDate(new Date()); }} className="rounded-full h-8 text-xs hover:bg-primary/10 hover:border-primary/50 transition-all">Last 30 Days</Button>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }} className="rounded-full h-8 text-xs text-destructive hover:bg-destructive/10">Clear</Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 py-2 px-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[180px] justify-start text-left font-normal rounded-xl border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-all h-10",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {startDate ? format(startDate, "MMM dd, yyyy") : <span>Start Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground font-medium text-sm">to</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[180px] justify-start text-left font-normal rounded-xl border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-all h-10",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {endDate ? format(endDate, "MMM dd, yyyy") : <span>End Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
            }}
            className="text-xs hover:bg-destructive/10 hover:text-destructive h-10 px-4 rounded-xl"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filter
          </Button>
        )}
      </div>
    </div>
  );

  // Helper to format date for separators
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, 'MMM dd, yyyy');
  };

  // Render list of posts with date separators
  const renderPostList = (items: Post[], targetId?: string) => {
    return items.map((post, index) => {
      // Determine if a date separator is needed
      const showSeparator = index === 0 || !isSameDay(new Date(post.created_at), new Date(items[index - 1].created_at));
      return (
        <div key={post.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s`, animationFillMode: 'backwards' }}>
          {showSeparator && (
            <div className="flex items-center justify-center py-6 opacity-80">
              <div className="px-4 py-1 bg-secondary/60 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest text-muted-foreground border border-border/50 shadow-sm">
                {getDateLabel(post.created_at)}
              </div>
            </div>
          )}
          <div
            id={`post-${post.id}`}
            className={cn(
              "transition-all duration-300",
              targetId === post.id && "ring-2 ring-primary ring-offset-4 ring-offset-background rounded-[2.2rem] shadow-glow"
            )}
          >
            <div className="glass-card rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all shadow-sm hover:shadow-glow">
              <PostCard
                post={post}
                initialShowComments={targetId === post.id && shouldOpenComments}
                onLikeToggle={() => handlePostLike(post.id)}
                onPostAction={(action, postId) => {
                  if (action === 'report' || action === 'delete' || action === 'hide') {
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    setLikedPosts(prev => prev.filter(p => p.id !== postId));
                    setCommentedPosts(prev => prev.filter(p => p.id !== postId));
                    setSavedPosts(prev => prev.filter(p => p.id !== postId));

                    if (action === 'report') {
                      // Optional: Show specific toast if not handled by PostCard, but PostCard handles success toast.
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return <ProfileSkeleton />;
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

  const tabs = isOwnProfile ? ["Posts", "Activity"] : ["Posts"];

  // Main Profile Layout
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-8">
        {/* Cover Image Section */}
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
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-primary flex items-center justify-center text-5xl font-bold text-primary-foreground border-8 border-background shadow-2xl z-10 overflow-hidden">
                  {profileUser.avatar_url ? (
                    <img src={profileUser.avatar_url} alt={profileUser.display_name} className="w-full h-full object-cover" />
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
                      {(() => {
                        const instance = profileUser.instance || targetCommunityUrl;
                        if (instance) {
                          const known = COMMUNITIES.find(c => c.url === instance || (instance && c.url.includes(instance)) || c.name === instance);
                          return known ? known.name : instance.replace(/^https?:\/\//, '');
                        }
                        const savedCommId = localStorage.getItem('active_community_id');
                        const currentComm = COMMUNITIES.find(c => c.id === savedCommId) || DEFAULT_COMMUNITY;
                        return currentComm.name;
                      })()}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 hover:bg-secondary">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isBlocked && (
                          <DropdownMenuItem onClick={handleBlockUser} className="text-destructive font-medium cursor-pointer">
                            <Ban className="w-4 h-4 mr-2" />
                            Block User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setShowReportModal(true)} className="cursor-pointer">
                          <Flag className="w-4 h-4 mr-2" />
                          Report User
                        </DropdownMenuItem>

                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isBlocked ? (
                      <Button
                        variant="destructive"
                        className="rounded-full px-8 h-11 shadow-lg shadow-destructive/20"
                        onClick={handleBlockUser}
                      >
                        <span className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Unblock User
                        </span>
                      </Button>
                    ) : (
                      <Button
                        variant={isFollowing ? "outline" : "hero"}
                        className="rounded-full px-8 h-11 shadow-lg shadow-primary/20"
                        onClick={async () => {
                          if (!profileUser) return;
                          try {
                            // A valid local user ID is a 24-char hex MongoDB ObjectID.
                            // If it's anything else (ActivityPub URI, etc.), always use the federated follow path.
                            const isValidObjectId = /^[a-f0-9]{24}$/i.test(profileUser.id);

                            const currentInstanceUrl = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080';
                            const currentInstanceDomain = currentInstanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
                            const profileInstance = (profileUser.instance || targetCommunityUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

                            // Check for local aliases (Docker/Dev environment) and production identical domains
                            const isCommunity1 = currentInstanceDomain.includes('localhost:8080') || currentInstanceDomain.includes('federated-decentralized-social.onrender.com');
                            const isCommunity2 = currentInstanceDomain.includes('localhost:8081') || currentInstanceDomain.includes('community-2');

                            const isLocalAlias = (
                              (isCommunity1 && (profileInstance === 'localhost:8080' || profileInstance === 'default-instance' || profileInstance === 'default' || profileInstance === '')) ||
                              (isCommunity2 && (profileInstance === 'localhost:8081' || profileInstance === 'community-2')) ||
                              (profileInstance === currentInstanceDomain)
                            );

                            // It is remote if:
                            // - the ID is not a valid local ObjectID, OR
                            // - the profile instance is different from the current instance
                            const isRemoteUser = !isValidObjectId || (
                              profileInstance !== '' &&
                              profileInstance !== currentInstanceDomain &&
                              !isLocalAlias
                            );

                            const isMastodonNode = isRemoteUser && !(
                              profileInstance.includes('localhost') ||
                              profileInstance.includes('community-2') ||
                              profileInstance.includes('federated-decentralized-social.onrender.com') ||
                              profileInstance === '' ||
                              profileInstance === 'default'
                            );

                            if (isFollowing) {
                              if (isMastodonNode) {
                                const handle = `@${profileUser.username}@${profileInstance || currentInstanceDomain}`;
                                await unfollowMastodonUser(handle);
                              } else if (isRemoteUser) {
                                const handle = `${profileUser.username}@${profileInstance || currentInstanceDomain}`;
                                await unfollowRemoteUser(handle);
                              } else {
                                await unfollowUser(profileUser.id);
                              }
                              setIsFollowing(false);
                              setProfileUser(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) - 1 } : null);
                              setTimeout(() => loadProfileData(false), 500);
                            } else {
                              if (isMastodonNode) {
                                const handle = `@${profileUser.username}@${profileInstance || currentInstanceDomain}`;
                                await followMastodonUser(handle);
                              } else if (isRemoteUser) {
                                const handle = `${profileUser.username}@${profileInstance || currentInstanceDomain}`;
                                await followRemoteUser(handle);
                              } else {
                                await followUser(profileUser.id);
                              }
                              setIsFollowing(true);
                              setProfileUser(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
                              setTimeout(() => loadProfileData(false), 500);
                            }
                          } catch (err) {
                            console.error("Follow/unfollow failed:", err);
                            toast({
                              title: "Error",
                              description: "Action failed. Please try again.",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        {isFollowing ? "Following" : (
                          <span className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </span>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {/* Top Row: Bio and Stats Side by Side */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Bio & Details */}
              <div className="flex-[2] glass-card rounded-[2rem] p-8 border-primary/10">
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
              <div className="flex-1 glass-card rounded-[2rem] p-6 border-primary/10 bg-gradient-to-br from-card to-secondary/30 flex items-center">
                <div className="grid grid-cols-3 gap-4 w-full">
                  <div className="group cursor-pointer text-center">
                    <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                      {profileUser.posts_count || (posts.length > 0 ? posts.length : 0)}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Posts</div>
                  </div>
                  <div className="group cursor-pointer text-center" onClick={(isBlocked) ? undefined : handleOpenFollowers}>
                    <div className={cn("text-3xl font-display font-black transition-colors", (isBlocked) ? "text-muted-foreground" : "text-foreground group-hover:text-primary")}>
                      {profileUser.followers_count || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Followers</div>
                  </div>
                  <div className="group cursor-pointer text-center" onClick={(isBlocked) ? undefined : handleOpenFollowing}>
                    <div className={cn("text-3xl font-display font-black transition-colors", (isBlocked) ? "text-muted-foreground" : "text-foreground group-hover:text-primary")}>
                      {profileUser.following_count || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Following</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content (Tabs etc) below */}
            {isBlocked ? (
              <div className="w-full">
                <div className="glass-card rounded-[2rem] p-12 text-center border-destructive/20 bg-destructive/5">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">You have blocked this user</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    You cannot see their posts, followers, or activity. To view their profile again, you must unblock them.
                  </p>

                </div>
              </div>
            ) : (profileUser.can_view_details === false) ? (
              <div className="w-full">
                <div className="glass-card rounded-[2rem] p-12 text-center border-primary/10 bg-secondary/5">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">This account is private</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Follow this account to see their posts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full">
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
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                  {activeTab === "Posts" && (
                    <>
                      {/* Sub Tabs for Posts */}
                      <div className="flex flex-col gap-4 mb-4">
                        {isOwnProfile && (
                          <div className="flex items-center gap-6 border-b border-border/50 px-2">
                            {["All", "Saved"].map((subTab) => (
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
                        )}
                      </div>

                      {activeSubTab === "All" && (
                        <>
                          {renderFilterUI()}

                          {filteredPosts.length === 0 ? (
                            <div className="glass-card rounded-3xl p-20 text-center opacity-50 border-dashed">
                              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                              <h3 className="text-xl font-bold mb-1">
                                {(startDate || endDate) ? "No posts in range" : "No posts yet"}
                              </h3>
                              <p className="text-sm">
                                {(startDate || endDate) ? "Try adjusting your dates." : "When they post, they'll appear here."}
                              </p>
                            </div>
                          ) : (
                            renderPostList(filteredPosts, targetPostId || undefined)
                          )}
                        </>
                      )}

                      {activeSubTab === "Saved" && isOwnProfile && (
                        <div className="space-y-4">
                          {renderFilterUI()}
                          {activityLoading ? (
                            <div className="flex justify-center py-20">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                          ) : filteredSavedPosts.length === 0 ? (
                            <div className="glass-card rounded-3xl p-16 text-center opacity-50 border-dashed">
                              <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                              <h3 className="text-xl font-bold mb-1">
                                {(startDate || endDate) ? "No saved posts in range" : "No saved posts"}
                              </h3>
                              <p className="text-sm">
                                {(startDate || endDate) ? "Try adjusting your dates." : "Posts you've saved will appear here."}
                              </p>
                            </div>
                          ) : (
                            renderPostList(filteredSavedPosts)
                          )}
                        </div>
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
                            onClick={() => setActivitySubTab(subTab)}
                            className={cn(
                              "py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors",
                              activitySubTab === subTab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {subTab}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        {renderFilterUI()}
                        {activityLoading ? (
                          <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        ) : (
                          <>
                            {activitySubTab === "Likes" && (
                              filteredLikedPosts.length === 0 ? (
                                <div className="glass-card rounded-3xl p-16 text-center opacity-50 border-dashed">
                                  <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                  <h3 className="text-xl font-bold mb-1">
                                    {(startDate || endDate) ? "No liked posts in range" : "No liked posts"}
                                  </h3>
                                  <p className="text-sm">
                                    {(startDate || endDate) ? "Try adjusting your dates." : `Posts ${profileUser.display_name} likes will appear here.`}
                                  </p>
                                </div>
                              ) : (
                                renderPostList(filteredLikedPosts)
                              )
                            )}

                            {activitySubTab === "Comments" && (
                              filteredCommentedPosts.length === 0 ? (
                                <div className="glass-card rounded-3xl p-16 text-center opacity-50 border-dashed">
                                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                  <h3 className="text-xl font-bold mb-1">
                                    {(startDate || endDate) ? "No comments in range" : "No comments"}
                                  </h3>
                                  <p className="text-sm">
                                    {(startDate || endDate) ? "Try adjusting your dates." : `Posts ${profileUser.display_name} commented on will appear here.`}
                                  </p>
                                </div>
                              ) : (
                                renderPostList(filteredCommentedPosts)
                              )
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <UserListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={listModalTitle}
        users={listModalUsers}
        loading={listModalLoading}
      />

      <Dialog open={showBlockConfirmation} onOpenChange={setShowBlockConfirmation}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Block {profileUser?.display_name || profileUser?.username}?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to block this user?
            </DialogDescription>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-left text-sm text-muted-foreground">
              <li>They will not be able to follow you.</li>
              <li>They will not see your posts.</li>
              <li>You will not see their posts.</li>
              <li>This action is reversible.</li>
            </ul>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowBlockConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBlockUser}>
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUser={profileUser}
        onSuccess={() => {
          // Clear all posts from the reported user
          setPosts([]);
          setLikedPosts([]);
          setCommentedPosts([]);
          setSavedPosts([]);
        }}
      />
    </div>
  );
};

export default ProfileUI;