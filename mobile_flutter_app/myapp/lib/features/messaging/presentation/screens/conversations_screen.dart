import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../feed/presentation/providers/feed_provider.dart';
import '../../../../data/models/models.dart';
import '../providers/messaging_provider.dart';

class ConversationsScreen extends ConsumerStatefulWidget {
  const ConversationsScreen({super.key});

  @override
  ConsumerState<ConversationsScreen> createState() =>
      _ConversationsScreenState();
}

class _ConversationsScreenState extends ConsumerState<ConversationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(conversationsProvider.notifier).fetchConversations();
    });
  }

  Future<void> _onRefresh() async {
    await ref.read(conversationsProvider.notifier).fetchConversations();
  }

  void _openNewMessagePicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _NewMessageSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(conversationsProvider);
    final currentUser = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'New message',
            onPressed: _openNewMessagePicker,
          ),
        ],
      ),
      body: state.isLoading && state.conversations.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.conversations.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: AppColors.grey400),
                  const SizedBox(height: 16),
                  const Text('Failed to load conversations'),
                  TextButton(onPressed: _onRefresh, child: const Text('Retry')),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _onRefresh,
              child: state.conversations.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.6,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.chat_bubble_outline,
                                size: 64,
                                color: AppColors.grey400,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No conversations yet',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(color: AppColors.grey500),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tap the pencil icon to message someone',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(color: AppColors.grey400),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton.icon(
                                onPressed: _openNewMessagePicker,
                                icon: const Icon(Icons.edit_outlined),
                                label: const Text('New Message'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      itemCount: state.conversations.length,
                      itemBuilder: (context, index) {
                        final conversation = state.conversations[index];
                        final otherUserId =
                            conversation.getOtherParticipantId(
                              currentUser?.id ?? '',
                            );
                        final otherUserName =
                            conversation.getOtherParticipantName(
                              currentUser?.id ?? '',
                            );
                        final otherUserAvatar =
                            conversation.getOtherParticipantAvatar(
                              currentUser?.id ?? '',
                            );

                        return Dismissible(
                          key: Key(conversation.id),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            color: AppColors.error,
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 16),
                            child: const Icon(
                              Icons.delete,
                              color: Colors.white,
                            ),
                          ),
                          confirmDismiss: (_) async {
                            return await showDialog<bool>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: const Text('Delete Conversation'),
                                content: const Text(
                                  'Are you sure you want to delete this conversation?',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, false),
                                    child: const Text('Cancel'),
                                  ),
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, true),
                                    style: TextButton.styleFrom(
                                      foregroundColor: AppColors.error,
                                    ),
                                    child: const Text('Delete'),
                                  ),
                                ],
                              ),
                            );
                          },
                          onDismissed: (_) {
                            ref
                                .read(conversationsProvider.notifier)
                                .deleteConversation(conversation.id);
                          },
                          child: ListTile(
                            leading: Stack(
                              children: [
                                CircleAvatar(
                                  radius: 24,
                                  backgroundImage: otherUserAvatar != null
                                      ? CachedNetworkImageProvider(
                                          otherUserAvatar,
                                        )
                                      : null,
                                  child: otherUserAvatar == null
                                      ? Text(
                                          (otherUserName ?? '?')[0]
                                              .toUpperCase(),
                                          style: const TextStyle(fontSize: 18),
                                        )
                                      : null,
                                ),
                                if (conversation.unreadCount > 0)
                                  Positioned(
                                    right: 0,
                                    top: 0,
                                    child: Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.primary,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: Theme.of(
                                            context,
                                          ).scaffoldBackgroundColor,
                                          width: 2,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            title: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    otherUserName ?? 'Unknown',
                                    style: TextStyle(
                                      fontWeight: conversation.unreadCount > 0
                                          ? FontWeight.bold
                                          : FontWeight.normal,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (conversation.lastMessage != null)
                                  Text(
                                    DateFormatter.formatMessageTime(
                                      conversation.lastMessage!.createdAt,
                                    ),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: conversation.unreadCount > 0
                                          ? Theme.of(
                                              context,
                                            ).colorScheme.primary
                                          : AppColors.grey500,
                                    ),
                                  ),
                              ],
                            ),
                            subtitle: conversation.lastMessage != null
                                ? Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          conversation.lastMessage!.isText
                                              ? conversation
                                                    .lastMessage!
                                                    .content
                                              : conversation
                                                    .lastMessage!
                                                    .isImage
                                              ? '📷 Image'
                                              : '📎 File',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: conversation.unreadCount > 0
                                                ? AppColors.grey800
                                                : AppColors.grey500,
                                            fontWeight:
                                                conversation.unreadCount > 0
                                                    ? FontWeight.w500
                                                    : FontWeight.normal,
                                          ),
                                        ),
                                      ),
                                      if (conversation.unreadCount > 0)
                                        Container(
                                          margin: const EdgeInsets.only(
                                            left: 8,
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Theme.of(
                                              context,
                                            ).colorScheme.primary,
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          child: Text(
                                            conversation.unreadCount.toString(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                    ],
                                  )
                                : null,
                            onTap: () {
                              ref
                                  .read(conversationsProvider.notifier)
                                  .markConversationAsRead(conversation.id);
                              context.push(
                                '/chat/${conversation.id}?receiverId=$otherUserId&name=${Uri.encodeComponent(otherUserName ?? 'Unknown')}',
                              );
                            },
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── New Message Bottom Sheet ──────────────────────────────────────────────────

class _NewMessageSheet extends ConsumerStatefulWidget {
  const _NewMessageSheet();

  @override
  ConsumerState<_NewMessageSheet> createState() => _NewMessageSheetState();
}

class _NewMessageSheetState extends ConsumerState<_NewMessageSheet> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(userSearchProvider(_query.trim()));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
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
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'New Message',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _controller,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Search by name or username…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          // Results
          Expanded(
            child: _query.trim().isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.person_search_outlined,
                          size: 56,
                          color: AppColors.grey400,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Search for people to message',
                          style: TextStyle(color: AppColors.grey500),
                        ),
                      ],
                    ),
                  )
                : usersAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) =>
                        Center(child: Text('Search failed: $e')),
                    data: (users) {
                      if (users.isEmpty) {
                        return Center(
                          child: Text(
                            'No users found for "$_query"',
                            style: TextStyle(color: AppColors.grey500),
                          ),
                        );
                      }
                      return ListView.separated(
                        itemCount: users.length,
                        separatorBuilder: (_, __) =>
                            const Divider(height: 1, indent: 72),
                        itemBuilder: (context, index) {
                          final user = users[index];
                          return _UserTile(user: user);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  final UserModel user;
  const _UserTile({required this.user});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: AppColors.grey200,
        backgroundImage: user.avatarUrl != null
            ? CachedNetworkImageProvider(user.avatarUrl!)
            : null,
        child: user.avatarUrl == null
            ? Text(
                user.displayName.isNotEmpty
                    ? user.displayName[0].toUpperCase()
                    : '?',
                style: const TextStyle(fontWeight: FontWeight.bold),
              )
            : null,
      ),
      title: Text(user.displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text('@${user.username}', style: TextStyle(color: AppColors.grey500)),
      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.grey400),
      onTap: () {
        Navigator.pop(context); // close sheet
        context.push(
          '/chat/new?receiverId=${user.id}&name=${Uri.encodeComponent(user.displayName)}',
        );
      },
    );
  }
}
