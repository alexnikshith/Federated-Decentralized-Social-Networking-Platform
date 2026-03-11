import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../data/models/models.dart';
import '../../../feed/presentation/providers/feed_provider.dart';

class UserSearchScreen extends ConsumerStatefulWidget {
  const UserSearchScreen({super.key});

  @override
  ConsumerState<UserSearchScreen> createState() => _UserSearchScreenState();
}

class _UserSearchScreenState extends ConsumerState<UserSearchScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(userSearchProvider(_query.trim()));

    return Scaffold(
      appBar: AppBar(title: const Text('Find Users')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Search by username or name',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                border: const OutlineInputBorder(),
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          Expanded(
            child: _query.trim().isEmpty
                ? const Center(
                    child: Text('Search for people to follow and message'),
                  )
                : usersAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (error, stack) => Center(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          'Search failed: $error',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                    data: (users) {
                      if (users.isEmpty) {
                        return const Center(child: Text('No users found'));
                      }

                      return ListView.separated(
                        itemCount: users.length,
                        separatorBuilder: (context, index) =>
                            const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final user = users[index];
                          return _UserSearchTile(user: user);
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

class _UserSearchTile extends StatelessWidget {
  final UserModel user;

  const _UserSearchTile({required this.user});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        child: Text(
          user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : '?',
        ),
      ),
      title: Text(user.displayName),
      subtitle: Text('@${user.username}'),
      onTap: () => context.push('/profile/${user.id}'),
    );
  }
}
