import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../data/models/models.dart';
import '../providers/feed_provider.dart';
import 'comments_sheet.dart';

class PostCard extends ConsumerWidget {
  final PostModel post;
  final String? currentUserId;
  final bool showFullContent;

  const PostCard({
    super.key,
    required this.post,
    this.currentUserId,
    this.showFullContent = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAuthor = currentUserId == post.authorId;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          ListTile(
            leading: GestureDetector(
              onTap: () => context.push('/profile/${post.authorId}'),
              child: CircleAvatar(
                backgroundImage: post.authorAvatar != null
                    ? CachedNetworkImageProvider(post.authorAvatar!)
                    : null,
                child: post.authorAvatar == null
                    ? Text(
                        post.authorName.isNotEmpty
                            ? post.authorName[0].toUpperCase()
                            : '?',
                      )
                    : null,
              ),
            ),
            title: GestureDetector(
              onTap: () => context.push('/profile/${post.authorId}'),
              child: Row(
                children: [
                  Flexible(
                    child: Text(
                      post.authorName,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (post.authorInstance != null &&
                      post.authorInstance!.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '@${post.authorInstance}',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            subtitle: Text(
              DateFormatter.timeAgo(post.createdAt),
              style: TextStyle(fontSize: 12, color: AppColors.grey500),
            ),
            trailing: PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleMenuAction(context, ref, value),
              itemBuilder: (context) => [
                if (isAuthor)
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, color: AppColors.error),
                        SizedBox(width: 8),
                        Text('Delete'),
                      ],
                    ),
                  ),
                PopupMenuItem(
                  value: post.isSaved ? 'unsave' : 'save',
                  child: Row(
                    children: [
                      Icon(
                        post.isSaved ? Icons.bookmark : Icons.bookmark_border,
                      ),
                      const SizedBox(width: 8),
                      Text(post.isSaved ? 'Unsave' : 'Save'),
                    ],
                  ),
                ),
                if (!isAuthor)
                  const PopupMenuItem(
                    value: 'report',
                    child: Row(
                      children: [
                        Icon(Icons.flag_outlined),
                        SizedBox(width: 8),
                        Text('Report'),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              post.content,
              maxLines: showFullContent ? null : 5,
              overflow: showFullContent ? null : TextOverflow.ellipsis,
            ),
          ),

          // Media
          if (post.hasMedia) ...[
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => _showMediaFullScreen(context),
              child: ClipRRect(
                child: post.isImage
                    ? CachedNetworkImage(
                        imageUrl: post.mediaUrl!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        placeholder: (context, url) => Container(
                          height: 200,
                          color: AppColors.grey200,
                          child: const Center(
                            child: CircularProgressIndicator(),
                          ),
                        ),
                        errorWidget: (context, url, error) => Container(
                          height: 200,
                          color: AppColors.grey200,
                          child: const Icon(Icons.error),
                        ),
                      )
                    : Container(
                        height: 200,
                        color: AppColors.grey900,
                        child: const Center(
                          child: Icon(
                            Icons.play_circle_outline,
                            size: 48,
                            color: Colors.white,
                          ),
                        ),
                      ),
              ),
            ),
          ],

          // Actions
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                // Like button
                _ActionButton(
                  icon: post.isLiked ? Icons.favorite : Icons.favorite_border,
                  label: post.likeCount.toString(),
                  color: post.isLiked ? AppColors.error : null,
                  onTap: () =>
                      ref.read(feedProvider.notifier).toggleLike(post.id),
                ),
                const SizedBox(width: 16),
                // Comment button
                _ActionButton(
                  icon: Icons.chat_bubble_outline,
                  label: post.commentCount.toString(),
                  onTap: () => _showComments(context),
                ),
                const Spacer(),
                // Save button
                IconButton(
                  icon: Icon(
                    post.isSaved ? Icons.bookmark : Icons.bookmark_border,
                    color: post.isSaved ? AppColors.primary : null,
                  ),
                  onPressed: () =>
                      ref.read(feedProvider.notifier).toggleSave(post.id),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _handleMenuAction(BuildContext context, WidgetRef ref, String action) {
    switch (action) {
      case 'delete':
        _confirmDelete(context, ref);
        break;
      case 'save':
        ref.read(feedProvider.notifier).toggleSave(post.id);
        break;
      case 'unsave':
        ref.read(feedProvider.notifier).toggleSave(post.id);
        break;
      case 'report':
        _showReportDialog(context, ref);
        break;
    }
  }

  void _confirmDelete(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Post'),
        content: const Text('Are you sure you want to delete this post?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(feedProvider.notifier).deletePost(post.id);
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showReportDialog(BuildContext context, WidgetRef ref) {
    final reasons = [
      'Spam',
      'Harassment',
      'Inappropriate content',
      'Misinformation',
      'Other',
    ];

    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Report Post'),
        children: reasons
            .map(
              (reason) => SimpleDialogOption(
                onPressed: () async {
                  Navigator.pop(context);
                  try {
                    await ref
                        .read(feedRepositoryProvider)
                        .reportPost(post.id, reason);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Post reported'),
                          backgroundColor: AppColors.success,
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Failed to report: $e'),
                          backgroundColor: AppColors.error,
                        ),
                      );
                    }
                  }
                },
                child: Text(reason),
              ),
            )
            .toList(),
      ),
    );
  }

  void _showComments(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CommentsSheet(postId: post.id),
    );
  }

  void _showMediaFullScreen(BuildContext context) {
    if (post.mediaUrl == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: Center(
            child: InteractiveViewer(
              child: CachedNetworkImage(
                imageUrl: post.mediaUrl!,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color ?? AppColors.grey600),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: color ?? AppColors.grey600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
