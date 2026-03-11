import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/federation_provider.dart';

class FederationScreen extends ConsumerStatefulWidget {
  const FederationScreen({super.key});

  @override
  ConsumerState<FederationScreen> createState() => _FederationScreenState();
}

class _FederationScreenState extends ConsumerState<FederationScreen> {
  final _handleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(federationProvider.notifier).resolveUser('');
    });
  }

  @override
  void dispose() {
    _handleController.dispose();
    super.dispose();
  }

  Future<void> _resolveUser() async {
    // Remove the requirement that the field can't be empty, as empty triggers the default "Discover" mode.
    final handle = _handleController.text.trim();
    await ref.read(federationProvider.notifier).resolveUser(handle);
  }

  ImageProvider? _buildAvatarProvider(String? avatarUrl) {
    if (avatarUrl == null || avatarUrl.isEmpty) return null;

    String resolvedUrl = avatarUrl;
    if (!avatarUrl.startsWith('http')) {
      final baseUrl = ApiConstants.baseUrl;
      final separator = avatarUrl.startsWith('/') ? '' : '/';
      resolvedUrl = '$baseUrl$separator$avatarUrl';
    }

    final uri = Uri.tryParse(resolvedUrl);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      debugPrint('Invalid avatar URL: $resolvedUrl');
      return null;
    }

    return CachedNetworkImageProvider(resolvedUrl);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(federationProvider);
    final instancesAsync = ref.watch(trustedInstancesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Explore Federation')),
      body: Column(
        children: [
          // Search Box
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _handleController,
                        decoration: const InputDecoration(
                          hintText: 'Search by name or username',
                          prefixIcon: Icon(Icons.search),
                          border: OutlineInputBorder(),
                        ),
                        onFieldSubmitted: (_) => _resolveUser(),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      height: 48,
                      child: ElevatedButton.icon(
                        icon: state.isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.search),
                        label: const Text('Search'),
                        onPressed: state.isLoading ? null : _resolveUser,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Content
          Expanded(
            child: state.isLoading && state.searchResults.isEmpty
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Error
                          if (state.error != null)
                            Card(
                              color: AppColors.error.withOpacity(0.1),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline,
                                        color: AppColors.error),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        state.error!,
                                        style: TextStyle(
                                            color: AppColors.error),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                          // Empty state
                          if (state.searchResults.isEmpty &&
                              state.error == null) ...[
                            const SizedBox(height: 40),
                            Icon(
                              Icons.public,
                              size: 80,
                              color: AppColors.grey400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Explore Federation',
                              textAlign: TextAlign.center,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                'Search for users across the federation network',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: AppColors.grey500,
                                ),
                              ),
                            ),
                            const SizedBox(height: 40),
                          ],

                          // Search Results
                          if (state.searchResults.isNotEmpty) ...[
                            Text(
                              'Search Results (${state.searchResults.length})',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 12),
                            ...state.searchResults.map((user) {
                              final isUserLoading =
                                  state.loadingUserIds.contains(user.id);
                              final userIsFollowing =
                                  user.isFollowing ?? false;

                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      CircleAvatar(
                                        radius: 40,
                                        backgroundImage:
                                            _buildAvatarProvider(
                                          user.avatarUrl,
                                        ),
                                        child: (user.avatarUrl == null ||
                                                user.avatarUrl!.isEmpty)
                                            ? Text(
                                                user.displayName.isNotEmpty
                                                    ? user.displayName[0]
                                                        .toUpperCase()
                                                    : (user.username
                                                            .isNotEmpty
                                                        ? user.username[0]
                                                            .toUpperCase()
                                                        : '?'),
                                                style: const TextStyle(
                                                    fontSize: 32),
                                              )
                                            : null,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        user.displayName.isNotEmpty
                                            ? user.displayName
                                            : user.username,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleLarge
                                            ?.copyWith(
                                                fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        user.displayHandle,
                                        style: TextStyle(
                                            color: AppColors.grey500),
                                      ),
                                      if (user.bio != null &&
                                          user.bio!.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          user.bio!,
                                          textAlign: TextAlign.center,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                              color: AppColors.grey600),
                                        ),
                                      ],
                                      const SizedBox(height: 16),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              icon: isUserLoading
                                                  ? const SizedBox(
                                                      width: 18,
                                                      height: 18,
                                                      child:
                                                          CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                      ),
                                                    )
                                                  : Icon(userIsFollowing
                                                      ? Icons.person_remove
                                                      : Icons.person_add),
                                              label: Text(
                                                userIsFollowing
                                                    ? 'Unfollow'
                                                    : 'Follow',
                                              ),
                                              onPressed: isUserLoading ||
                                                      state.isLoading
                                                  ? null
                                                  : () async {
                                                      if (userIsFollowing) {
                                                        await ref
                                                            .read(
                                                              federationProvider
                                                                  .notifier,
                                                            )
                                                            .unfollowUserDirect(
                                                              user,
                                                            );
                                                      } else {
                                                        await ref
                                                            .read(
                                                              federationProvider
                                                                  .notifier,
                                                            )
                                                            .followUserDirect(
                                                              user,
                                                            );
                                                      }
                                                      if (!mounted) return;
                                                      final message =
                                                          userIsFollowing
                                                              ? 'Unfollowed!'
                                                              : 'Following!';
                                                      ScaffoldMessenger.of(
                                                        context,
                                                      ).showSnackBar(
                                                        SnackBar(
                                                          content:
                                                              Text(message),
                                                          duration:
                                                              const Duration(
                                                                seconds: 2,
                                                              ),
                                                          backgroundColor:
                                                              Colors.green,
                                                        ),
                                                      );
                                                    },
                                              style: userIsFollowing
                                                  ? ElevatedButton.styleFrom(
                                                      backgroundColor:
                                                          AppColors.grey300,
                                                      foregroundColor:
                                                          AppColors.grey700,
                                                    )
                                                  : null,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: OutlinedButton(
                                              onPressed: state.isLoading
                                                  ? null
                                                  : () {
                                                      ref
                                                          .read(
                                                            federationProvider
                                                                .notifier,
                                                          )
                                                          .selectUser(user);
                                                    },
                                              child: const Text('View'),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                            const SizedBox(height: 24),
                          ],

                          // Federated Communities
                          Text(
                            'Federated Communities',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Connected instances in the federation network',
                            style: TextStyle(
                              color: AppColors.grey500,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 16),
                          instancesAsync.when(
                            loading: () => const Center(
                              child: CircularProgressIndicator(),
                            ),
                            error: (error, _) => Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  children: [
                                    Icon(Icons.error_outline,
                                        color: AppColors.grey400),
                                    const SizedBox(height: 8),
                                    const Text('Failed to load instances'),
                                    TextButton(
                                      onPressed: () => ref.invalidate(
                                          trustedInstancesProvider),
                                      child: const Text('Retry'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            data: (instances) => instances.isEmpty
                                ? Card(
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        children: [
                                          Icon(
                                            Icons.public_off,
                                            size: 48,
                                            color: AppColors.grey400,
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            'No federated instances',
                                            style: TextStyle(
                                                color: AppColors.grey500),
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                : Column(
                                    children: instances.map((instance) {
                                      return Card(
                                        margin:
                                            const EdgeInsets.only(bottom: 8),
                                        child: ListTile(
                                          leading: CircleAvatar(
                                            backgroundColor: instance.isTrusted
                                                ? AppColors.success
                                                    .withOpacity(0.1)
                                                : instance.isLimited
                                                    ? AppColors.warning
                                                        .withOpacity(0.1)
                                                    : AppColors.error
                                                        .withOpacity(0.1),
                                            child: Icon(
                                              Icons.public,
                                              color: instance.isTrusted
                                                  ? AppColors.success
                                                  : instance.isLimited
                                                      ? AppColors.warning
                                                      : AppColors.error,
                                            ),
                                          ),
                                          title: Text(
                                            instance.domain,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                          subtitle: Text(
                                            'Status: ${instance.trustLevel}',
                                            style: TextStyle(
                                              color: instance.isTrusted
                                                  ? AppColors.success
                                                  : instance.isLimited
                                                      ? AppColors.warning
                                                      : AppColors.error,
                                              fontSize: 12,
                                            ),
                                          ),
                                          trailing: Icon(
                                            instance.isTrusted
                                                ? Icons.check_circle
                                                : instance.isLimited
                                                    ? Icons.warning
                                                    : Icons.block,
                                            color: instance.isTrusted
                                                ? AppColors.success
                                                : instance.isLimited
                                                    ? AppColors.warning
                                                    : AppColors.error,
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Search for users across the federation network to discover and follow them',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.grey500,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],

                  // Search Results
                  if (state.searchResults.isNotEmpty) ...[
                    Text(
                      'Search Results (${state.searchResults.length})',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...state.searchResults.map((user) {
                      final isUserLoading = state.loadingUserIds.contains(
                        user.id,
                      );
                      final userIsFollowing = user.isFollowing ?? false;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              CircleAvatar(
                                radius: 40,
                                backgroundImage: _buildAvatarProvider(
                                  user.avatarUrl,
                                ),
                                child:
                                    (user.avatarUrl == null ||
                                        user.avatarUrl!.isEmpty)
                                    ? Text(
                                        user.displayName.isNotEmpty
                                            ? user.displayName[0].toUpperCase()
                                            : (user.username.isNotEmpty
                                                  ? user.username[0]
                                                        .toUpperCase()
                                                  : '?'),
                                        style: const TextStyle(fontSize: 32),
                                      )
                                    : null,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                user.displayName.isNotEmpty
                                    ? user.displayName
                                    : user.username,
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                user.displayHandle,
                                style: TextStyle(color: AppColors.grey500),
                              ),
                              if (user.bio != null && user.bio!.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(
                                  user.bio!,
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: AppColors.grey600),
                                ),
                              ],
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      icon: isUserLoading
                                          ? const SizedBox(
                                              width: 18,
                                              height: 18,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                              ),
                                            )
                                          : Icon(
                                              userIsFollowing
                                                  ? Icons.person_remove
                                                  : Icons.person_add,
                                            ),
                                      label: Text(
                                        userIsFollowing ? 'Unfollow' : 'Follow',
                                      ),
                                      onPressed:
                                          isUserLoading || state.isLoading
                                          ? null
                                          : () async {
                                              if (userIsFollowing) {
                                                await ref
                                                    .read(
                                                      federationProvider
                                                          .notifier,
                                                    )
                                                    .unfollowUserDirect(user);
                                              } else {
                                                await ref
                                                    .read(
                                                      federationProvider
                                                          .notifier,
                                                    )
                                                    .followUserDirect(user);
                                              }
                                              if (!mounted) return;

                                              final message = userIsFollowing
                                                  ? 'Unfollowed!'
                                                  : 'Following!';

                                              ScaffoldMessenger.of(
                                                context,
                                              ).showSnackBar(
                                                SnackBar(
                                                  content: Text(message),
                                                  duration: const Duration(
                                                    seconds: 2,
                                                  ),
                                                  backgroundColor: Colors.green,
                                                ),
                                              );
                                            },
                                      style: userIsFollowing
                                          ? ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  AppColors.grey300,
                                              foregroundColor:
                                                  AppColors.grey700,
                                            )
                                          : null,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: state.isLoading
                                          ? null
                                          : () {
                                              ref
                                                  .read(
                                                    federationProvider.notifier,
                                                  )
                                                  .selectUser(user);
                                            },
                                      child: const Text('View'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 24),
                  ],

                  // Federated Communities Section
                  Text(
                    'Federated Communities',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Connected instances in the federation network',
                    style: TextStyle(color: AppColors.grey500, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  instancesAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (error, _) => Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Icon(Icons.error_outline, color: AppColors.grey400),
                            const SizedBox(height: 8),
                            const Text('Failed to load instances'),
                            TextButton(
                              onPressed: () =>
                                  ref.invalidate(trustedInstancesProvider),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    data: (instances) => instances.isEmpty
                        ? Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.public_off,
                                    size: 48,
                                    color: AppColors.grey400,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No federated instances',
                                    style: TextStyle(color: AppColors.grey500),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : Column(
                            children: instances.map((instance) {
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: instance.isTrusted
                                        ? AppColors.success.withOpacity(0.1)
                                        : instance.isLimited
                                        ? AppColors.warning.withOpacity(0.1)
                                        : AppColors.error.withOpacity(0.1),
                                    child: Icon(
                                      Icons.public,
                                      color: instance.isTrusted
                                          ? AppColors.success
                                          : instance.isLimited
                                          ? AppColors.warning
                                          : AppColors.error,
                                    ),
                                  ),
                                  title: Text(
                                    instance.domain,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  subtitle: Text(
                                    'Status: ${instance.trustLevel}',
                                    style: TextStyle(
                                      color: instance.isTrusted
                                          ? AppColors.success
                                          : instance.isLimited
                                          ? AppColors.warning
                                          : AppColors.error,
                                      fontSize: 12,
                                    ),
                                  ),
                                  trailing: Icon(
                                    instance.isTrusted
                                        ? Icons.check_circle
                                        : instance.isLimited
                                        ? Icons.warning
                                        : Icons.block,
                                    color: instance.isTrusted
                                        ? AppColors.success
                                        : instance.isLimited
                                        ? AppColors.warning
                                        : AppColors.error,
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
