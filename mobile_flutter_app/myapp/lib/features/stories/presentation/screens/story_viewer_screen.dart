import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/stories_provider.dart';

class StoryViewerScreen extends ConsumerStatefulWidget {
  final List<StoryGroup> groups;
  final int initialGroupIndex;

  const StoryViewerScreen({
    super.key,
    required this.groups,
    required this.initialGroupIndex,
  });

  @override
  ConsumerState<StoryViewerScreen> createState() => _StoryViewerScreenState();
}

class _StoryViewerScreenState extends ConsumerState<StoryViewerScreen>
    with SingleTickerProviderStateMixin {
  late PageController _pageController;
  late int _currentGroupIndex;
  int _currentStoryIndex = 0;
  late AnimationController _progressController;

  @override
  void initState() {
    super.initState();
    _currentGroupIndex = widget.initialGroupIndex;
    _pageController = PageController(initialPage: _currentGroupIndex);
    _progressController =
        AnimationController(vsync: this, duration: const Duration(seconds: 5))
          ..addStatusListener((status) {
            if (status == AnimationStatus.completed) {
              _nextStory();
            }
          });
    _startProgress();
    _markViewed();
  }

  @override
  void dispose() {
    _progressController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  void _startProgress() {
    _progressController.reset();
    _progressController.forward();
  }

  void _markViewed() {
    final group = widget.groups[_currentGroupIndex];
    if (_currentStoryIndex < group.stories.length) {
      ref
          .read(storiesProvider.notifier)
          .viewStory(group.stories[_currentStoryIndex].id);
    }
  }

  void _nextStory() {
    final group = widget.groups[_currentGroupIndex];
    if (_currentStoryIndex < group.stories.length - 1) {
      setState(() => _currentStoryIndex++);
      _startProgress();
      _markViewed();
    } else if (_currentGroupIndex < widget.groups.length - 1) {
      setState(() {
        _currentGroupIndex++;
        _currentStoryIndex = 0;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      _startProgress();
      _markViewed();
    } else {
      Navigator.of(context).pop();
    }
  }

  void _prevStory() {
    if (_currentStoryIndex > 0) {
      setState(() => _currentStoryIndex--);
      _startProgress();
      _markViewed();
    } else if (_currentGroupIndex > 0) {
      setState(() {
        _currentGroupIndex--;
        _currentStoryIndex =
            widget.groups[_currentGroupIndex].stories.length - 1;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      _startProgress();
      _markViewed();
    }
  }

  @override
  Widget build(BuildContext context) {
    final group = widget.groups[_currentGroupIndex];
    final story = group.stories[_currentStoryIndex];
    final currentUser = ref.watch(currentUserProvider);
    final isLiked = story.isLikedBy(currentUser?.id ?? '');

    String imageUrl = story.mediaUrl;
    if (imageUrl.startsWith('/')) {
      imageUrl = '${ApiConstants.baseUrl}$imageUrl';
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTapUp: (details) {
          final screenWidth = MediaQuery.of(context).size.width;
          if (details.globalPosition.dx < screenWidth / 3) {
            _prevStory();
          } else {
            _nextStory();
          }
        },
        onLongPressStart: (_) => _progressController.stop(),
        onLongPressEnd: (_) => _progressController.forward(),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Story image
            CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.contain,
              placeholder: (_, __) =>
                  const Center(child: CircularProgressIndicator()),
              errorWidget: (_, __, ___) => const Center(
                child: Icon(
                  Icons.broken_image,
                  color: Colors.white54,
                  size: 64,
                ),
              ),
            ),

            // Gradient overlays
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: 120,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.black54, Colors.transparent],
                  ),
                ),
              ),
            ),

            // Progress bars
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 8,
              right: 8,
              child: Row(
                children: List.generate(group.stories.length, (i) {
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: i < _currentStoryIndex
                          ? const LinearProgressIndicator(
                              value: 1,
                              backgroundColor: Colors.white38,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                              minHeight: 2.5,
                            )
                          : i == _currentStoryIndex
                          ? _AnimatedProgress(controller: _progressController)
                          : const LinearProgressIndicator(
                              value: 0,
                              backgroundColor: Colors.white38,
                              minHeight: 2.5,
                            ),
                    ),
                  );
                }),
              ),
            ),

            // Header - author info + close
            Positioned(
              top: MediaQuery.of(context).padding.top + 20,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundImage: group.authorAvatar != null
                        ? NetworkImage(
                            group.authorAvatar!.startsWith('/')
                                ? '${ApiConstants.baseUrl}${group.authorAvatar}'
                                : group.authorAvatar!,
                          )
                        : null,
                    child: group.authorAvatar == null
                        ? Text(
                            group.authorName.isNotEmpty
                                ? group.authorName[0].toUpperCase()
                                : '?',
                          )
                        : null,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    group.authorName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    DateFormatter.timeAgo(story.createdAt),
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  const Spacer(),
                  if (story.authorId == currentUser?.id)
                    IconButton(
                      icon: const Icon(
                        Icons.delete_outline,
                        color: Colors.white,
                      ),
                      onPressed: () async {
                        await ref
                            .read(storiesProvider.notifier)
                            .deleteStory(story.id);
                        if (mounted) Navigator.of(context).pop();
                      },
                    ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Bottom - caption + like
            if (story.content != null || true)
              Positioned(
                bottom: MediaQuery.of(context).padding.bottom + 16,
                left: 16,
                right: 16,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (story.content != null && story.content!.isNotEmpty)
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black45,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            story.content!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      )
                    else
                      const Spacer(),
                    const SizedBox(width: 12),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          onPressed: () {
                            if (isLiked) {
                              ref
                                  .read(storiesProvider.notifier)
                                  .unlikeStory(story.id);
                            } else {
                              ref
                                  .read(storiesProvider.notifier)
                                  .likeStory(story.id);
                            }
                          },
                          icon: Icon(
                            isLiked ? Icons.favorite : Icons.favorite_border,
                            color: isLiked ? Colors.red : Colors.white,
                            size: 28,
                          ),
                        ),
                        Text(
                          '${story.likeCount}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Icon(
                          Icons.visibility,
                          color: Colors.white70,
                          size: 22,
                        ),
                        Text(
                          '${story.viewCount}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AnimatedProgress extends AnimatedWidget {
  const _AnimatedProgress({required AnimationController controller})
    : super(listenable: controller);

  @override
  Widget build(BuildContext context) {
    final controller = listenable as AnimationController;
    return LinearProgressIndicator(
      value: controller.value,
      backgroundColor: Colors.white38,
      valueColor: const AlwaysStoppedAnimation(Colors.white),
      minHeight: 2.5,
    );
  }
}
