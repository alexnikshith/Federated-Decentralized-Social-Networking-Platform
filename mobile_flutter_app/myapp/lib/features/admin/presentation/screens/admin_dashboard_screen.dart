import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/admin_provider.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    Future.microtask(() => ref.read(adminProvider.notifier).loadDashboard());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final adminState = ref.watch(adminProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Users'),
            Tab(text: 'Reports'),
            Tab(text: 'Traffic'),
          ],
        ),
      ),
      body: adminState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : adminState.error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48),
                  const SizedBox(height: 16),
                  Text(adminState.error!),
                  TextButton(
                    onPressed: () =>
                        ref.read(adminProvider.notifier).loadDashboard(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : TabBarView(
              controller: _tabController,
              children: [
                _OverviewTab(stats: adminState.stats),
                _UsersTab(users: adminState.users),
                _ReportsTab(reports: adminState.reports),
                _TrafficTab(traffic: adminState.traffic),
              ],
            ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  final Map<String, dynamic> stats;
  const _OverviewTab({required this.stats});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Platform Overview',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _AdminStatCard(
                title: 'Total Users',
                value: '${stats['total_users'] ?? 0}',
                icon: Icons.people,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _AdminStatCard(
                title: 'Total Posts',
                value: '${stats['total_posts'] ?? 0}',
                icon: Icons.article,
                color: Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _AdminStatCard(
                title: 'Active Today',
                value: '${stats['active_today'] ?? 0}',
                icon: Icons.trending_up,
                color: Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _AdminStatCard(
                title: 'Reports',
                value: '${stats['pending_reports'] ?? 0}',
                icon: Icons.flag,
                color: Colors.red,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _UsersTab extends ConsumerWidget {
  final List<Map<String, dynamic>> users;
  const _UsersTab({required this.users});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (users.isEmpty) {
      return const Center(child: Text('No users found'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: users.length,
      itemBuilder: (context, index) {
        final user = users[index];
        final isActive = user['is_active'] ?? true;
        final role = user['role'] ?? 'user';

        return Card(
          child: ListTile(
            leading: CircleAvatar(
              child: Text((user['username'] ?? '?')[0].toUpperCase()),
            ),
            title: Text(user['username'] ?? 'Unknown'),
            subtitle: Text(
              '${user['email'] ?? ''} • $role',
              style: TextStyle(color: isActive ? null : Colors.red),
            ),
            trailing: PopupMenuButton<String>(
              onSelected: (action) => _handleAction(context, ref, user, action),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: isActive ? 'deactivate' : 'activate',
                  child: Text(isActive ? 'Deactivate' : 'Activate'),
                ),
                PopupMenuItem(
                  value: role == 'admin' ? 'demote' : 'promote',
                  child: Text(
                    role == 'admin' ? 'Demote to User' : 'Promote to Admin',
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Text('Delete', style: TextStyle(color: Colors.red)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _handleAction(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> user,
    String action,
  ) {
    final userId = user['id'] ?? user['_id'] ?? '';
    final notifier = ref.read(adminProvider.notifier);

    switch (action) {
      case 'activate':
        notifier.toggleUserStatus(userId, true);
        break;
      case 'deactivate':
        showDialog(
          context: context,
          builder: (ctx) {
            final reasonController = TextEditingController();
            return AlertDialog(
              title: const Text('Deactivate User'),
              content: TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  hintText: 'Reason (optional)',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    notifier.toggleUserStatus(
                      userId,
                      false,
                      reason: reasonController.text,
                    );
                    Navigator.pop(ctx);
                  },
                  child: const Text('Deactivate'),
                ),
              ],
            );
          },
        );
        break;
      case 'promote':
        notifier.updateUserRole(userId, 'admin');
        break;
      case 'demote':
        notifier.updateUserRole(userId, 'user');
        break;
      case 'delete':
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Delete User'),
            content: const Text('This action is permanent. Are you sure?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                onPressed: () {
                  notifier.deleteUser(userId);
                  Navigator.pop(ctx);
                },
                child: const Text('Delete'),
              ),
            ],
          ),
        );
        break;
    }
  }
}

class _ReportsTab extends ConsumerWidget {
  final List<Map<String, dynamic>> reports;
  const _ReportsTab({required this.reports});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (reports.isEmpty) {
      return const Center(child: Text('No reports'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: reports.length,
      itemBuilder: (context, index) {
        final report = reports[index];
        final isResolved = report['resolved'] == true;

        return Card(
          child: ListTile(
            leading: Icon(
              isResolved ? Icons.check_circle : Icons.flag,
              color: isResolved ? Colors.green : Colors.orange,
            ),
            title: Text(report['reason'] ?? 'No reason'),
            subtitle: Text(
              'Reporter: ${report['reporter_username'] ?? 'Unknown'}\n'
              'Reported: ${report['reported_username'] ?? 'Unknown'}',
            ),
            isThreeLine: true,
            trailing: isResolved
                ? const Chip(
                    label: Text('Resolved'),
                    backgroundColor: Colors.green,
                    labelStyle: TextStyle(color: Colors.white),
                  )
                : PopupMenuButton<String>(
                    onSelected: (action) {
                      final reportId = report['id'] ?? report['_id'] ?? '';
                      ref
                          .read(adminProvider.notifier)
                          .resolveReport(reportId, action: action);
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem(value: 'warn', child: Text('Warn User')),
                      PopupMenuItem(
                        value: 'dismiss',
                        child: Text('Dismiss Report'),
                      ),
                      PopupMenuItem(
                        value: 'ban',
                        child: Text(
                          'Ban User',
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    ],
                  ),
          ),
        );
      },
    );
  }
}

class _TrafficTab extends StatelessWidget {
  final Map<String, dynamic> traffic;
  const _TrafficTab({required this.traffic});

  @override
  Widget build(BuildContext context) {
    final daily = (traffic['daily'] as List?) ?? [];

    if (daily.isEmpty) {
      return const Center(child: Text('No traffic data'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Daily Traffic', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        ...daily.map((day) {
          final date = day['date'] ?? '';
          final users = (day['active_users'] ?? 0) as num;
          final posts = (day['new_posts'] ?? 0) as num;

          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  SizedBox(
                    width: 80,
                    child: Text(
                      date.toString().length >= 10
                          ? date.toString().substring(5, 10)
                          : date.toString(),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(
                          Icons.people,
                          size: 16,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        Text('$users'),
                        const SizedBox(width: 16),
                        const Icon(
                          Icons.article,
                          size: 16,
                          color: Colors.green,
                        ),
                        const SizedBox(width: 4),
                        Text('$posts'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _AdminStatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _AdminStatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: AppColors.grey500),
            ),
          ],
        ),
      ),
    );
  }
}
