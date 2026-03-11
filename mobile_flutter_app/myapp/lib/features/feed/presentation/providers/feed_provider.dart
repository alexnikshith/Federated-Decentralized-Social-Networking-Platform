import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/feed_remote_datasource.dart';
import '../../data/repositories/feed_repository_impl.dart';

// Feed data source and repository providers
final feedRemoteDataSourceProvider = Provider<FeedRemoteDataSource>((ref) {
  return FeedRemoteDataSourceImpl(client: ref.read(dioClientProvider));
});

final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  return FeedRepositoryImpl(
    remoteDataSource: ref.read(feedRemoteDataSourceProvider),
  );
});

// Feed state
class FeedState {
  final List<PostModel> posts;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final String feedType;
  final int currentPage;
  final bool hasMore;

  const FeedState({
    this.posts = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.feedType = 'home',
    this.currentPage = 1,
    this.hasMore = true,
  });

  FeedState copyWith({
    List<PostModel>? posts,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    String? feedType,
    int? currentPage,
    bool? hasMore,
  }) {
    return FeedState(
      posts: posts ?? this.posts,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error,
      feedType: feedType ?? this.feedType,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class FeedNotifier extends StateNotifier<FeedState> {
  final FeedRepository _repository;

  FeedNotifier({required FeedRepository repository})
    : _repository = repository,
      super(const FeedState());

  Future<void> fetchFeed({String? type, bool refresh = false}) async {
    final feedType = type ?? state.feedType;

    if (refresh) {
      state = state.copyWith(
        isLoading: true,
        error: null,
        feedType: feedType,
        currentPage: 1,
        hasMore: true,
      );
    } else {
      state = state.copyWith(isLoading: true, error: null);
    }

    try {
      final posts = await _repository.getFeed(type: feedType, page: 1);
      state = state.copyWith(
        posts: posts,
        isLoading: false,
        feedType: feedType,
        currentPage: 1,
        hasMore: posts.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true);

    try {
      final nextPage = state.currentPage + 1;
      final posts = await _repository.getFeed(
        type: state.feedType,
        page: nextPage,
      );
      state = state.copyWith(
        posts: [...state.posts, ...posts],
        isLoadingMore: false,
        currentPage: nextPage,
        hasMore: posts.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  Future<bool> createPost({
    required String content,
    String? mediaUrl,
    String? mediaType,
  }) async {
    try {
      final post = await _repository.createPost(
        content: content,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
      );
      state = state.copyWith(posts: [post, ...state.posts]);
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<void> deletePost(String id) async {
    try {
      await _repository.deletePost(id);
      state = state.copyWith(
        posts: state.posts.where((p) => p.id != id).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> toggleLike(String postId) async {
    final postIndex = state.posts.indexWhere((p) => p.id == postId);
    if (postIndex == -1) return;

    final post = state.posts[postIndex];
    final isLiked = post.isLiked;

    // Optimistic update
    final updatedPost = post.copyWith(
      isLiked: !isLiked,
      likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
    );
    final updatedPosts = [...state.posts];
    updatedPosts[postIndex] = updatedPost;
    state = state.copyWith(posts: updatedPosts);

    try {
      if (isLiked) {
        await _repository.unlikePost(postId);
      } else {
        await _repository.likePost(postId);
      }
    } catch (e) {
      // Revert on error
      final revertedPosts = [...state.posts];
      revertedPosts[postIndex] = post;
      state = state.copyWith(posts: revertedPosts, error: e.toString());
    }
  }

  Future<void> toggleSave(String postId) async {
    final postIndex = state.posts.indexWhere((p) => p.id == postId);
    if (postIndex == -1) return;

    final post = state.posts[postIndex];
    final isSaved = post.isSaved;

    // Optimistic update
    final updatedPost = post.copyWith(isSaved: !isSaved);
    final updatedPosts = [...state.posts];
    updatedPosts[postIndex] = updatedPost;
    state = state.copyWith(posts: updatedPosts);

    try {
      if (isSaved) {
        await _repository.unsavePost(postId);
      } else {
        await _repository.savePost(postId);
      }
    } catch (e) {
      // Revert on error
      final revertedPosts = [...state.posts];
      revertedPosts[postIndex] = post;
      state = state.copyWith(posts: revertedPosts, error: e.toString());
    }
  }

  void updatePost(PostModel post) {
    final index = state.posts.indexWhere((p) => p.id == post.id);
    if (index != -1) {
      final updatedPosts = [...state.posts];
      updatedPosts[index] = post;
      state = state.copyWith(posts: updatedPosts);
    }
  }

  void setFeedType(String type) {
    if (type != state.feedType) {
      fetchFeed(type: type, refresh: true);
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final feedProvider = StateNotifierProvider<FeedNotifier, FeedState>((ref) {
  return FeedNotifier(repository: ref.read(feedRepositoryProvider));
});

// Comments provider
final commentsProvider = FutureProvider.family<List<CommentModel>, String>((
  ref,
  postId,
) async {
  final repository = ref.read(feedRepositoryProvider);
  return await repository.getComments(postId);
});

// Single post provider
final postDetailProvider = FutureProvider.family<PostModel, String>((
  ref,
  postId,
) async {
  final repository = ref.read(feedRepositoryProvider);
  return await repository.getPost(postId);
});

// User search provider
final userSearchProvider = FutureProvider.family<List<UserModel>, String>((
  ref,
  query,
) async {
  if (query.isEmpty) return [];
  final repository = ref.read(feedRepositoryProvider);
  return await repository.searchUsers(query);
});

// Saved posts provider
final savedPostsProvider = FutureProvider<List<PostModel>>((ref) async {
  final repository = ref.read(feedRepositoryProvider);
  return await repository.getSavedPosts();
});
