import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../stories/presentation/widgets/stories_row.dart';
import '../providers/feed_provider.dart';
import '../widgets/post_card.dart';
import '../widgets/create_post_sheet.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(feedProvider.notifier).fetchFeed(refresh: true);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(feedProvider.notifier).loadMore();
    }
  }

  Future<void> _onRefresh() async {
    await ref.read(feedProvider.notifier).fetchFeed(refresh: true);
  }

  void _showCreatePost() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreatePostSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final feedState = ref.watch(feedProvider);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Feed'),
        actions: [
          // Feed type toggle
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              ref.read(feedProvider.notifier).setFeedType(value);
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'home',
                child: Row(
                  children: [
                    Icon(
                      Icons.home,
                      color: feedState.feedType == 'home'
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                    const SizedBox(width: 8),
                    const Text('Home Feed'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'public',
                child: Row(
                  children: [
                    Icon(
                      Icons.public,
                      color: feedState.feedType == 'public'
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                    const SizedBox(width: 8),
                    const Text('Public Feed'),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: feedState.isLoading && feedState.posts.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : feedState.error != null && feedState.posts.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: AppColors.grey400),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load feed',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  TextButton(onPressed: _onRefresh, child: const Text('Retry')),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _onRefresh,
              child: feedState.posts.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.6,
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.article_outlined,
                                  size: 64,
                                  color: AppColors.grey400,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No posts yet',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(color: AppColors.grey500),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  feedState.feedType == 'home'
                                      ? 'Follow users to see their posts'
                                      : 'Be the first to post!',
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(color: AppColors.grey400),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.only(bottom: 80),
                      itemCount:
                          feedState.posts.length +
                          1 + // stories row
                          (feedState.isLoadingMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return const StoriesRow();
                        }
                        final postIndex = index - 1;
                        if (postIndex == feedState.posts.length) {
                          return const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        return PostCard(
                          post: feedState.posts[postIndex],
                          currentUserId: user?.id,
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreatePost,
        child: const Icon(Icons.add),
      ),
    );
  }
}
