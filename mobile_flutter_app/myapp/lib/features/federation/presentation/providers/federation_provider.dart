import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/federation_remote_datasource.dart';
import '../../data/repositories/federation_repository_impl.dart';

// Federation data source and repository providers
final federationRemoteDataSourceProvider = Provider<FederationRemoteDataSource>(
  (ref) {
    return FederationRemoteDataSourceImpl(client: ref.read(dioClientProvider));
  },
);

final federationRepositoryProvider = Provider<FederationRepository>((ref) {
  return FederationRepositoryImpl(
    remoteDataSource: ref.read(federationRemoteDataSourceProvider),
  );
});

// Instance info provider
final instanceInfoProvider = FutureProvider<InstanceInfo>((ref) async {
  return await ref.read(federationRepositoryProvider).getInstanceInfo();
});

// Trusted instances provider
final trustedInstancesProvider = FutureProvider<List<InstanceModel>>((
  ref,
) async {
  return await ref.read(federationRepositoryProvider).getTrustedInstances();
});

// Federation state for user resolution
class FederationState {
  final RemoteUserModel? resolvedUser;
  final List<RemoteUserModel> searchResults;
  final bool isLoading;
  final String? error;
  final bool isFollowing;
  final Set<String>
  loadingUserIds; // Track which users are being followed/unfollowed

  const FederationState({
    this.resolvedUser,
    this.searchResults = const [],
    this.isLoading = false,
    this.error,
    this.isFollowing = false,
    this.loadingUserIds = const {},
  });

  FederationState copyWith({
    RemoteUserModel? resolvedUser,
    List<RemoteUserModel>? searchResults,
    bool? isLoading,
    String? error,
    bool? isFollowing,
    Set<String>? loadingUserIds,
  }) {
    return FederationState(
      resolvedUser: resolvedUser ?? this.resolvedUser,
      searchResults: searchResults ?? this.searchResults,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isFollowing: isFollowing ?? this.isFollowing,
      loadingUserIds: loadingUserIds ?? this.loadingUserIds,
    );
  }
}

class FederationNotifier extends StateNotifier<FederationState> {
  final FederationRepository _repository;

  FederationNotifier({required FederationRepository repository})
    : _repository = repository,
      super(const FederationState());

  Future<bool> resolveUser(String handle) async {
    final query = handle.trim();
    state = state.copyWith(
      isLoading: true,
      error: null,
      resolvedUser: null,
      searchResults: const [],
    );
    try {
      final isFederatedHandle =
          query.contains('@') &&
          (query.startsWith('@') || query.split('@').length > 1);

      // Search by name/username for regular queries to match website Explore UX.
      if (!isFederatedHandle || query.isEmpty) {
        final users = await _repository.searchUsers(query, limit: 20);
        if (users.isNotEmpty) {
          final first = users.first;
          state = state.copyWith(
            searchResults: users,
            resolvedUser: query.isEmpty ? null : first,
            isLoading: false,
            isFollowing: query.isEmpty ? false : (first.isFollowing ?? false),
          );
          return true;
        } else if (query.isEmpty) {
          state = state.copyWith(isLoading: false, searchResults: []);
          return true;
        }
      }

      // Try ActivityPub resolve for explicit handles.
      if (isFederatedHandle && query.isNotEmpty) {
        final user = await _repository.resolveActivityPubHandle(query);
        if (user != null) {
          state = state.copyWith(
            searchResults: [user],
            resolvedUser: user,
            isLoading: false,
            isFollowing: user.isFollowing ?? false,
          );
          return true;
        }
      }

      if (query.isNotEmpty) {
        // Fall back to internal federation resolve endpoint.
        final user = await _repository.resolveUser(query);
        state = state.copyWith(
          searchResults: [user],
          resolvedUser: user,
          isLoading: false,
          isFollowing: user.isFollowing ?? false,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> followUser() async {
    if (state.resolvedUser == null) return false;

    state = state.copyWith(isLoading: true, error: null);
    try {
      final handle = state.resolvedUser!.displayHandle;
      await _repository.followRemoteUser(handle);
      state = state.copyWith(isLoading: false, isFollowing: true);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> unfollowUser() async {
    if (state.resolvedUser == null) return false;

    state = state.copyWith(isLoading: true, error: null);
    try {
      final handle = state.resolvedUser!.displayHandle;
      await _repository.unfollowRemoteUser(handle);
      state = state.copyWith(isLoading: false, isFollowing: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  /// Follow a user directly from search results
  Future<bool> followUserDirect(RemoteUserModel user) async {
    // Add user to loading set
    state = state.copyWith(loadingUserIds: {...state.loadingUserIds, user.id});

    try {
      final handle = user.displayHandle;
      await _repository.followRemoteUser(handle);

      // Update search results to reflect the follow status
      final updatedResults = state.searchResults.map((u) {
        if (u.id == user.id) {
          return u.copyWith(isFollowing: true);
        }
        return u;
      }).toList();

      // Remove user from loading set
      final updatedLoadingIds = {...state.loadingUserIds}..remove(user.id);

      state = state.copyWith(
        searchResults: updatedResults,
        loadingUserIds: updatedLoadingIds,
      );

      // If this was the resolved user, update it too
      if (state.resolvedUser?.id == user.id) {
        state = state.copyWith(isFollowing: true);
      }

      return true;
    } catch (e) {
      // Remove user from loading set on error
      final updatedLoadingIds = {...state.loadingUserIds}..remove(user.id);
      state = state.copyWith(
        loadingUserIds: updatedLoadingIds,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Unfollow a user directly from search results
  Future<bool> unfollowUserDirect(RemoteUserModel user) async {
    // Add user to loading set
    state = state.copyWith(loadingUserIds: {...state.loadingUserIds, user.id});

    try {
      final handle = user.displayHandle;
      await _repository.unfollowRemoteUser(handle);

      // Update search results to reflect the unfollow status
      final updatedResults = state.searchResults.map((u) {
        if (u.id == user.id) {
          return u.copyWith(isFollowing: false);
        }
        return u;
      }).toList();

      // Remove user from loading set
      final updatedLoadingIds = {...state.loadingUserIds}..remove(user.id);

      state = state.copyWith(
        searchResults: updatedResults,
        loadingUserIds: updatedLoadingIds,
      );

      // If this was the resolved user, update it too
      if (state.resolvedUser?.id == user.id) {
        state = state.copyWith(isFollowing: false);
      }

      return true;
    } catch (e) {
      // Remove user from loading set on error
      final updatedLoadingIds = {...state.loadingUserIds}..remove(user.id);
      state = state.copyWith(
        loadingUserIds: updatedLoadingIds,
        error: e.toString(),
      );
      return false;
    }
  }

  void selectUser(RemoteUserModel user) {
    state = state.copyWith(
      resolvedUser: user,
      isFollowing: user.isFollowing ?? false,
      error: null,
    );
  }

  void clearResolvedUser() {
    state = const FederationState();
  }
}

final federationProvider =
    StateNotifierProvider<FederationNotifier, FederationState>((ref) {
      return FederationNotifier(
        repository: ref.read(federationRepositoryProvider),
      );
    });
