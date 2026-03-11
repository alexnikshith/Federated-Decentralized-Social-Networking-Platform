import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../data/models/models.dart';
import '../../../profile/presentation/providers/profile_provider.dart';

class BlockedUsersScreen extends ConsumerWidget {
  const BlockedUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blockedUsersAsync = ref.watch(blockedUsersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Blocked Users')),
      body: blockedUsersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Failed to load blocked users\n$error',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => ref.refresh(blockedUsersProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (users) {
          if (users.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No blocked users.\nUsers you block will appear here.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(blockedUsersProvider),
            child: ListView.separated(
              itemCount: users.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final user = users[index];
                return _BlockedUserTile(user: user);
              },
            ),
          );
        },
      ),
    );
  }
}

class _BlockedUserTile extends ConsumerWidget {
  final UserModel user;

  const _BlockedUserTile({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: CircleAvatar(
        child: Text(
          user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : '?',
        ),
      ),
      title: Text(user.displayName),
      subtitle: Text('@${user.username}'),
      onTap: () => context.push('/profile/${user.id}'),
      trailing: OutlinedButton(
        onPressed: () async {
          final dataSource = ref.read(profileRemoteDataSourceProvider);
          try {
            await dataSource.unblockUser(user.id);
            ref.invalidate(blockedUsersProvider);
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Unblocked ${user.displayName}')),
              );
            }
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Failed to unblock user: $e')),
              );
            }
          }
        },
        child: const Text('Unblock'),
      ),
    );
  }
}
