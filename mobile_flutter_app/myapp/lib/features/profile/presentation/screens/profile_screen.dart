import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../feed/presentation/widgets/post_card.dart';
import '../providers/profile_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  final String userId;

  const ProfileScreen({super.key, required this.userId});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(profileProviderFamily(widget.userId).notifier)
          .fetchProfile(widget.userId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(profileProviderFamily(widget.userId));
    final currentUser = ref.watch(currentUserProvider);
    final isOwnProfile = currentUser?.id == widget.userId;

    return Scaffold(
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.user == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: AppColors.grey400),
                  const SizedBox(height: 16),
                  Text('Failed to load profile'),
                  TextButton(
                    onPressed: () => ref
                        .read(profileProviderFamily(widget.userId).notifier)
                        .fetchProfile(widget.userId),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : NestedScrollView(
              headerSliverBuilder: (context, innerBoxIsScrolled) {
                return [
                  SliverAppBar(
                    expandedHeight: 280,
                    pinned: true,
                    flexibleSpace: FlexibleSpaceBar(
                      background: _buildProfileHeader(state, isOwnProfile),
                    ),
                    actions: [
                      if (!isOwnProfile)
                        PopupMenuButton<String>(
                          icon: const Icon(Icons.more_vert),
                          onSelected: (value) => _handleMenuAction(value),
                          itemBuilder: (context) => [
                            PopupMenuItem(
                              value: state.user?.isBlocked == true
                                  ? 'unblock'
                                  : 'block',
                              child: Row(
                                children: [
                                  Icon(
                                    state.user?.isBlocked == true
                                        ? Icons.check
                                        : Icons.block,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    state.user?.isBlocked == true
                                        ? 'Unblock'
                                        : 'Block',
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      if (isOwnProfile)
                        IconButton(
                          icon: const Icon(Icons.settings),
                          onPressed: () => context.push('/settings'),
                        ),
                    ],
                  ),
                  SliverPersistentHeader(
                    delegate: _TabBarDelegate(
                      TabBar(
                        controller: _tabController,
                        labelColor: Theme.of(context).colorScheme.primary,
                        unselectedLabelColor: AppColors.grey500,
                        indicatorColor: Theme.of(context).colorScheme.primary,
                        tabs: const [
                          Tab(text: 'Posts'),
                          Tab(text: 'About'),
                        ],
                      ),
                    ),
                    pinned: true,
                  ),
                ];
              },
              body: TabBarView(
                controller: _tabController,
                children: [_buildPostsTab(state), _buildAboutTab(state)],
              ),
            ),
    );
  }

  Widget _buildProfileHeader(ProfileState state, bool isOwnProfile) {
    final user = state.user;
    if (user == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.only(top: 80, bottom: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Theme.of(context).colorScheme.primary.withOpacity(0.2),
            Theme.of(context).scaffoldBackgroundColor,
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          CircleAvatar(
            radius: 50,
            backgroundImage: user.avatarUrl != null
                ? CachedNetworkImageProvider(user.avatarUrl!)
                : null,
            child: user.avatarUrl == null
                ? Text(
                    user.displayName.isNotEmpty
                        ? user.displayName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(fontSize: 36),
                  )
                : null,
          ),
          const SizedBox(height: 12),
          Text(
            user.displayName,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          Text(user.handle, style: TextStyle(color: AppColors.grey500)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildStatItem('${user.postsCount ?? 0}', 'Posts'),
              Container(
                height: 24,
                width: 1,
                margin: const EdgeInsets.symmetric(horizontal: 24),
                color: AppColors.grey300,
              ),
              GestureDetector(
                onTap: () => _showFollowersSheet(),
                child: _buildStatItem(
                  '${user.followersCount ?? 0}',
                  'Followers',
                ),
              ),
              Container(
                height: 24,
                width: 1,
                margin: const EdgeInsets.symmetric(horizontal: 24),
                color: AppColors.grey300,
              ),
              GestureDetector(
                onTap: () => _showFollowingSheet(),
                child: _buildStatItem(
                  '${user.followingCount ?? 0}',
                  'Following',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (!isOwnProfile)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () => ref
                      .read(profileProviderFamily(widget.userId).notifier)
                      .toggleFollow(),
                  style: state.isFollowing
                      ? ElevatedButton.styleFrom(
                          backgroundColor: AppColors.grey300,
                          foregroundColor: AppColors.grey700,
                        )
                      : null,
                  child: Text(state.isFollowing ? 'Following' : 'Follow'),
                ),
                const SizedBox(width: 12),
                OutlinedButton(
                  onPressed: () {
                    // Navigate to chat
                    context.push(
                      '/chat/new?receiverId=${user.id}&name=${Uri.encodeComponent(user.displayName)}',
                    );
                  },
                  child: const Text('Message'),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        Text(label, style: TextStyle(fontSize: 12, color: AppColors.grey500)),
      ],
    );
  }

  Widget _buildPostsTab(ProfileState state) {
    if (state.isLoadingPosts) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.posts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.article_outlined, size: 64, color: AppColors.grey400),
            const SizedBox(height: 16),
            Text('No posts yet', style: TextStyle(color: AppColors.grey500)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(top: 8),
      itemCount: state.posts.length,
      itemBuilder: (context, index) {
        return PostCard(
          post: state.posts[index],
          currentUserId: ref.read(currentUserProvider)?.id,
        );
      },
    );
  }

  Widget _buildAboutTab(ProfileState state) {
    final user = state.user;
    if (user == null) return const SizedBox.shrink();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (user.bio != null && user.bio!.isNotEmpty) ...[
            Text(
              'Bio',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(user.bio!),
            const SizedBox(height: 24),
          ],
          Text(
            'Information',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildInfoRow(Icons.alternate_email, 'Username', '@${user.username}'),
          if (user.instanceId != null)
            _buildInfoRow(Icons.public, 'Instance', user.instanceId!),
          _buildInfoRow(
            Icons.visibility,
            'Profile visibility',
            user.profileVisibility.toUpperCase(),
          ),
          if (user.createdAt != null)
            _buildInfoRow(
              Icons.calendar_today,
              'Joined',
              '${user.createdAt!.month}/${user.createdAt!.year}',
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.grey500),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(color: AppColors.grey500, fontSize: 12),
                ),
                Text(value),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _handleMenuAction(String action) async {
    final notifier = ref.read(profileProviderFamily(widget.userId).notifier);
    switch (action) {
      case 'block':
        final success = await notifier.blockUser();
        if (success && mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('User blocked')));
        }
        break;
      case 'unblock':
        final success = await notifier.unblockUser();
        if (success && mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('User unblocked')));
        }
        break;
    }
  }

  void _showFollowersSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _UserListSheet(
        title: 'Followers',
        provider: followersProvider(widget.userId),
      ),
    );
  }

  void _showFollowingSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _UserListSheet(
        title: 'Following',
        provider: followingProvider(widget.userId),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}

class _UserListSheet extends ConsumerWidget {
  final String title;
  final FutureProvider<List<UserModel>> provider;

  const _UserListSheet({required this.title, required this.provider});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(provider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.grey300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(title, style: Theme.of(context).textTheme.titleLarge),
          ),
          Expanded(
            child: usersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('Error: $error')),
              data: (users) => users.isEmpty
                  ? Center(
                      child: Text(
                        'No $title yet',
                        style: TextStyle(color: AppColors.grey500),
                      ),
                    )
                  : ListView.builder(
                      itemCount: users.length,
                      itemBuilder: (context, index) {
                        final user = users[index];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundImage: user.avatarUrl != null
                                ? CachedNetworkImageProvider(user.avatarUrl!)
                                : null,
                            child: user.avatarUrl == null
                                ? Text(
                                    user.displayName.isNotEmpty
                                        ? user.displayName[0].toUpperCase()
                                        : '?',
                                  )
                                : null,
                          ),
                          title: Text(user.displayName),
                          subtitle: Text('@${user.username}'),
                          onTap: () {
                            Navigator.pop(context);
                            context.push('/profile/${user.id}');
                          },
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
