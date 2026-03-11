import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/profile_remote_datasource.dart';

// Profile data source provider
final profileRemoteDataSourceProvider = Provider<ProfileRemoteDataSource>((
  ref,
) {
  return ProfileRemoteDataSourceImpl(client: ref.read(dioClientProvider));
});

// Profile state
class ProfileState {
  final UserModel? user;
  final List<PostModel> posts;
  final bool isLoading;
  final bool isLoadingPosts;
  final String? error;
  final bool isFollowing;

  const ProfileState({
    this.user,
    this.posts = const [],
    this.isLoading = false,
    this.isLoadingPosts = false,
    this.error,
    this.isFollowing = false,
  });

  ProfileState copyWith({
    UserModel? user,
    List<PostModel>? posts,
    bool? isLoading,
    bool? isLoadingPosts,
    String? error,
    bool? isFollowing,
  }) {
    return ProfileState(
      user: user ?? this.user,
      posts: posts ?? this.posts,
      isLoading: isLoading ?? this.isLoading,
      isLoadingPosts: isLoadingPosts ?? this.isLoadingPosts,
      error: error,
      isFollowing: isFollowing ?? this.isFollowing,
    );
  }
}

class ProfileNotifier extends StateNotifier<ProfileState> {
  final ProfileRemoteDataSource _dataSource;

  ProfileNotifier({required ProfileRemoteDataSource dataSource})
    : _dataSource = dataSource,
      super(const ProfileState());

  Future<void> fetchProfile(String userId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _dataSource.getProfile(userId);
      state = state.copyWith(
        user: user,
        isLoading: false,
        isFollowing: user.isFollowing ?? false,
      );
      fetchUserPosts(userId);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchUserPosts(String userId) async {
    state = state.copyWith(isLoadingPosts: true);
    try {
      final posts = await _dataSource.getUserPosts(userId);
      state = state.copyWith(posts: posts, isLoadingPosts: false);
    } catch (e) {
      state = state.copyWith(isLoadingPosts: false);
    }
  }

  Future<bool> toggleFollow() async {
    if (state.user == null) return false;

    final wasFollowing = state.isFollowing;
    state = state.copyWith(isFollowing: !wasFollowing);

    try {
      if (wasFollowing) {
        await _dataSource.unfollowUser(state.user!.id);
      } else {
        await _dataSource.followUser(state.user!.id);
      }
      return true;
    } catch (e) {
      state = state.copyWith(isFollowing: wasFollowing, error: e.toString());
      return false;
    }
  }

  Future<bool> blockUser() async {
    if (state.user == null) return false;
    try {
      await _dataSource.blockUser(state.user!.id);
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<bool> unblockUser() async {
    if (state.user == null) return false;
    try {
      await _dataSource.unblockUser(state.user!.id);
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
}

// Profile provider family for different users
final profileProviderFamily =
    StateNotifierProvider.family<ProfileNotifier, ProfileState, String>((
      ref,
      userId,
    ) {
      return ProfileNotifier(
        dataSource: ref.read(profileRemoteDataSourceProvider),
      );
    });

// Followers provider
final followersProvider = FutureProvider.family<List<UserModel>, String>((
  ref,
  userId,
) async {
  final dataSource = ref.read(profileRemoteDataSourceProvider);
  return await dataSource.getFollowers(userId);
});

// Following provider
final followingProvider = FutureProvider.family<List<UserModel>, String>((
  ref,
  userId,
) async {
  final dataSource = ref.read(profileRemoteDataSourceProvider);
  return await dataSource.getFollowing(userId);
});

// Blocked users provider
final blockedUsersProvider = FutureProvider<List<UserModel>>((ref) async {
  final dataSource = ref.read(profileRemoteDataSourceProvider);
  return await dataSource.getBlockedUsers();
});
