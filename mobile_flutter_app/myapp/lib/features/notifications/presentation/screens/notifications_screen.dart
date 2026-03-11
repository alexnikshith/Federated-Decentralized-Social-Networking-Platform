import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../data/models/models.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationsProvider.notifier).fetchNotifications();
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
      ref.read(notificationsProvider.notifier).loadMore();
    }
  }

  Future<void> _onRefresh() async {
    await ref.read(notificationsProvider.notifier).fetchNotifications();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: state.isLoading && state.notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: AppColors.grey400),
                  const SizedBox(height: 16),
                  Text('Failed to load notifications'),
                  TextButton(onPressed: _onRefresh, child: const Text('Retry')),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _onRefresh,
              child: state.notifications.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.6,
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.notifications_none,
                                  size: 64,
                                  color: AppColors.grey400,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No notifications yet',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(color: AppColors.grey500),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      itemCount:
                          state.notifications.length +
                          (state.isLoadingMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == state.notifications.length) {
                          return const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        return _NotificationTile(
                          notification: state.notifications[index],
                          onTap: () => _handleNotificationTap(
                            state.notifications[index],
                          ),
                        );
                      },
                    ),
            ),
    );
  }

  void _handleNotificationTap(NotificationModel notification) {
    // Mark as read
    if (!notification.isRead) {
      ref.read(notificationsProvider.notifier).markAsRead(notification.id);
    }

    // Navigate based on type
    switch (notification.type) {
      case NotificationType.like:
      case NotificationType.comment:
      case NotificationType.mention:
        if (notification.relatedEntityId != null) {
          context.push('/post/${notification.relatedEntityId}');
        }
        break;
      case NotificationType.follow:
        if (notification.relatedUserId != null) {
          context.push('/profile/${notification.relatedUserId}');
        }
        break;
      case NotificationType.message:
        context.push('/messages');
        break;
      case NotificationType.storyLike:
        // Navigate to stories
        break;
    }
  }
}

class _NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onTap;

  const _NotificationTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: notification.isRead ? null : AppColors.primary.withOpacity(0.05),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: notification.relatedUserAvatar != null
              ? CachedNetworkImageProvider(notification.relatedUserAvatar!)
              : null,
          child: notification.relatedUserAvatar == null
              ? Text((notification.relatedUserName ?? '?')[0].toUpperCase())
              : null,
        ),
        title: RichText(
          text: TextSpan(
            style: DefaultTextStyle.of(context).style,
            children: [
              TextSpan(
                text: notification.relatedUserName ?? 'Someone',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              TextSpan(text: ' ${_getActionText()}'),
            ],
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (notification.commentContent != null &&
                notification.commentContent!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  notification.commentContent!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: AppColors.grey600),
                ),
              ),
            const SizedBox(height: 4),
            Text(
              DateFormatter.timeAgo(notification.createdAt),
              style: TextStyle(fontSize: 12, color: AppColors.grey500),
            ),
          ],
        ),
        trailing: Icon(_getIcon(), color: _getIconColor(), size: 20),
        onTap: onTap,
      ),
    );
  }

  String _getActionText() {
    switch (notification.type) {
      case NotificationType.like:
        return 'liked your post';
      case NotificationType.comment:
        return 'commented on your post';
      case NotificationType.follow:
        return 'started following you';
      case NotificationType.mention:
        return 'mentioned you in a post';
      case NotificationType.message:
        return 'sent you a message';
      case NotificationType.storyLike:
        return 'liked your story';
    }
  }

  IconData _getIcon() {
    switch (notification.type) {
      case NotificationType.like:
        return Icons.favorite;
      case NotificationType.comment:
        return Icons.chat_bubble;
      case NotificationType.follow:
        return Icons.person_add;
      case NotificationType.mention:
        return Icons.alternate_email;
      case NotificationType.message:
        return Icons.mail;
      case NotificationType.storyLike:
        return Icons.auto_awesome;
    }
  }

  Color _getIconColor() {
    switch (notification.type) {
      case NotificationType.like:
      case NotificationType.storyLike:
        return AppColors.error;
      case NotificationType.comment:
        return AppColors.info;
      case NotificationType.follow:
        return AppColors.success;
      case NotificationType.mention:
        return AppColors.warning;
      case NotificationType.message:
        return AppColors.primary;
    }
  }
}
