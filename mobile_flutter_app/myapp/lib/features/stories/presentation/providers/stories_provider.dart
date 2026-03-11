import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/stories_remote_datasource.dart';

final storiesDataSourceProvider = Provider<StoriesRemoteDataSource>((ref) {
  return StoriesRemoteDataSourceImpl(client: ref.read(dioClientProvider));
});

class StoriesState {
  final List<StoryModel> stories;
  final List<StoryGroup> groupedStories;
  final bool isLoading;
  final String? error;

  const StoriesState({
    this.stories = const [],
    this.groupedStories = const [],
    this.isLoading = false,
    this.error,
  });

  StoriesState copyWith({
    List<StoryModel>? stories,
    List<StoryGroup>? groupedStories,
    bool? isLoading,
    String? error,
  }) {
    return StoriesState(
      stories: stories ?? this.stories,
      groupedStories: groupedStories ?? this.groupedStories,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class StoriesNotifier extends StateNotifier<StoriesState> {
  final StoriesRemoteDataSource _dataSource;
  final String _currentUserId;

  StoriesNotifier({
    required StoriesRemoteDataSource dataSource,
    required String currentUserId,
  }) : _dataSource = dataSource,
       _currentUserId = currentUserId,
       super(const StoriesState());

  Future<void> loadStories() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final stories = await _dataSource.getStories();
      final groups = _groupStories(stories);
      state = state.copyWith(
        stories: stories,
        groupedStories: groups,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  List<StoryGroup> _groupStories(List<StoryModel> stories) {
    final map = <String, List<StoryModel>>{};
    for (final story in stories) {
      map.putIfAbsent(story.authorId, () => []).add(story);
    }
    // Put current user's stories first
    final groups = <StoryGroup>[];
    if (map.containsKey(_currentUserId)) {
      final myStories = map.remove(_currentUserId)!;
      groups.add(
        StoryGroup(
          authorId: _currentUserId,
          authorName: myStories.first.authorName,
          authorAvatar: myStories.first.authorAvatar,
          stories: myStories,
        ),
      );
    }
    for (final entry in map.entries) {
      groups.add(
        StoryGroup(
          authorId: entry.key,
          authorName: entry.value.first.authorName,
          authorAvatar: entry.value.first.authorAvatar,
          stories: entry.value,
        ),
      );
    }
    return groups;
  }

  Future<bool> createStory({
    required String mediaUrl,
    required String mediaType,
    String? content,
  }) async {
    try {
      await _dataSource.createStory(
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        content: content,
      );
      await loadStories();
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<void> deleteStory(String id) async {
    try {
      await _dataSource.deleteStory(id);
      await loadStories();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> likeStory(String id) async {
    try {
      await _dataSource.likeStory(id);
      final updated = state.stories.map((s) {
        if (s.id == id && !s.likes.contains(_currentUserId)) {
          return s.copyWith(likes: [...s.likes, _currentUserId]);
        }
        return s;
      }).toList();
      state = state.copyWith(
        stories: updated,
        groupedStories: _groupStories(updated),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> unlikeStory(String id) async {
    try {
      await _dataSource.unlikeStory(id);
      final updated = state.stories.map((s) {
        if (s.id == id) {
          return s.copyWith(
            likes: s.likes.where((l) => l != _currentUserId).toList(),
          );
        }
        return s;
      }).toList();
      state = state.copyWith(
        stories: updated,
        groupedStories: _groupStories(updated),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> viewStory(String id) async {
    try {
      await _dataSource.viewStory(id);
      final updated = state.stories.map((s) {
        if (s.id == id && !s.viewedBy.contains(_currentUserId)) {
          return s.copyWith(viewedBy: [...s.viewedBy, _currentUserId]);
        }
        return s;
      }).toList();
      state = state.copyWith(
        stories: updated,
        groupedStories: _groupStories(updated),
      );
    } catch (_) {}
  }

  Future<String?> uploadMedia(String filePath) async {
    try {
      return await _dataSource.uploadMedia(filePath);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }
}

final storiesProvider = StateNotifierProvider<StoriesNotifier, StoriesState>((
  ref,
) {
  final dataSource = ref.read(storiesDataSourceProvider);
  final user = ref.watch(currentUserProvider);
  return StoriesNotifier(dataSource: dataSource, currentUserId: user?.id ?? '');
});
