import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/stories_provider.dart';
import '../screens/story_viewer_screen.dart';

class StoriesRow extends ConsumerStatefulWidget {
  const StoriesRow({super.key});

  @override
  ConsumerState<StoriesRow> createState() => _StoriesRowState();
}

class _StoriesRowState extends ConsumerState<StoriesRow> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(storiesProvider.notifier).loadStories());
  }

  Future<void> _createStory() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    final url = await ref
        .read(storiesProvider.notifier)
        .uploadMedia(image.path);
    if (!mounted) return;
    Navigator.of(context).pop();

    if (url != null) {
      final captionController = TextEditingController();
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Add Story'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  File(image.path),
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: captionController,
                decoration: const InputDecoration(
                  hintText: 'Add a caption (optional)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Share'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        await ref
            .read(storiesProvider.notifier)
            .createStory(
              mediaUrl: url,
              mediaType: 'image',
              content: captionController.text.isEmpty
                  ? null
                  : captionController.text,
            );
      }
      captionController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final storiesState = ref.watch(storiesProvider);
    final currentUser = ref.watch(currentUserProvider);
    final groups = storiesState.groupedStories;

    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        itemCount: groups.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _AddStoryButton(onTap: _createStory);
          }
          final group = groups[index - 1];
          final isViewed = group.stories.every(
            (s) => s.isViewedBy(currentUser?.id ?? ''),
          );
          return _StoryAvatar(
            group: group,
            isViewed: isViewed,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => StoryViewerScreen(
                    groups: groups,
                    initialGroupIndex: index - 1,
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _AddStoryButton extends StatelessWidget {
  final VoidCallback onTap;
  const _AddStoryButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.grey300, width: 2),
              ),
              child: const Icon(Icons.add, size: 28, color: AppColors.primary),
            ),
            const SizedBox(height: 4),
            const Text('Your Story', style: TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _StoryAvatar extends StatelessWidget {
  final StoryGroup group;
  final bool isViewed;
  final VoidCallback onTap;

  const _StoryAvatar({
    required this.group,
    required this.isViewed,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: isViewed
                    ? null
                    : const LinearGradient(
                        colors: [AppColors.primary, Colors.purple],
                      ),
                border: isViewed
                    ? Border.all(color: AppColors.grey300, width: 2)
                    : null,
              ),
              child: CircleAvatar(
                backgroundImage: group.authorAvatar != null
                    ? NetworkImage(group.authorAvatar!)
                    : null,
                child: group.authorAvatar == null
                    ? Text(
                        group.authorName.isNotEmpty
                            ? group.authorName[0].toUpperCase()
                            : '?',
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 4),
            SizedBox(
              width: 64,
              child: Text(
                group.authorName,
                style: const TextStyle(fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
