import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/reports_provider.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _period = 'week';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    Future.microtask(() => _loadData());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadData() {
    final now = DateTime.now();
    final start = _period == 'week'
        ? now.subtract(const Duration(days: 7))
        : now.subtract(const Duration(days: 30));
    ref
        .read(reportsProvider.notifier)
        .loadReports(
          startDate: start.toIso8601String().split('T')[0],
          endDate: now.toIso8601String().split('T')[0],
        );
  }

  @override
  Widget build(BuildContext context) {
    final reportsState = ref.watch(reportsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Time Usage'),
            Tab(text: 'Received'),
            Tab(text: 'Made'),
          ],
        ),
        actions: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'week', label: Text('Week')),
              ButtonSegment(value: 'month', label: Text('Month')),
            ],
            selected: {_period},
            onSelectionChanged: (value) {
              setState(() => _period = value.first);
              _loadData();
            },
            style: ButtonStyle(
              visualDensity: VisualDensity.compact,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: reportsState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : reportsState.error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48),
                  const SizedBox(height: 16),
                  Text(reportsState.error!),
                  TextButton(onPressed: _loadData, child: const Text('Retry')),
                ],
              ),
            )
          : TabBarView(
              controller: _tabController,
              children: [
                _TimeUsageTab(data: reportsState.activity),
                _InteractionsTab(
                  data: reportsState.interactionsReceived,
                  title: 'Interactions Received',
                ),
                _InteractionsTab(
                  data: reportsState.interactionsMade,
                  title: 'Your Activity',
                ),
              ],
            ),
    );
  }
}

class _TimeUsageTab extends StatelessWidget {
  final Map<String, dynamic> data;
  const _TimeUsageTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final totalMinutes = (data['total_minutes'] ?? 0) as num;
    final dailyAvg = (data['daily_average_minutes'] ?? 0) as num;
    final sessions = (data['total_sessions'] ?? 0) as num;
    final dailyData = (data['daily'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _StatCard(
          title: 'Total Time',
          value: '${totalMinutes.toInt()} min',
          icon: Icons.timer,
          color: AppColors.primary,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Daily Average',
                value: '${dailyAvg.toInt()} min',
                icon: Icons.calendar_today,
                color: Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                title: 'Sessions',
                value: '$sessions',
                icon: Icons.login,
                color: Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text('Daily Breakdown', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        if (dailyData.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Text('No activity data yet'),
            ),
          )
        else
          ...dailyData.map((day) {
            final date = day['date'] ?? '';
            final minutes = (day['minutes'] ?? 0) as num;
            final maxMinutes = dailyData.fold<num>(
              1,
              (max, d) => (d['minutes'] as num? ?? 0) > max
                  ? (d['minutes'] as num)
                  : max,
            );
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 80,
                    child: Text(
                      date.toString().length >= 10
                          ? date.toString().substring(5, 10)
                          : date.toString(),
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  Expanded(
                    child: LinearProgressIndicator(
                      value: minutes / maxMinutes,
                      minHeight: 20,
                      borderRadius: BorderRadius.circular(4),
                      backgroundColor: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 50,
                    child: Text(
                      '${minutes.toInt()}m',
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}

class _InteractionsTab extends StatelessWidget {
  final Map<String, dynamic> data;
  final String title;
  const _InteractionsTab({required this.data, required this.title});

  @override
  Widget build(BuildContext context) {
    final likes = (data['likes'] ?? 0) as num;
    final comments = (data['comments'] ?? 0) as num;
    final follows = (data['follows'] ?? 0) as num;
    final posts = (data['posts'] ?? 0) as num;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Likes',
                value: '$likes',
                icon: Icons.favorite,
                color: Colors.red,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                title: 'Comments',
                value: '$comments',
                icon: Icons.comment,
                color: Colors.blue,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Follows',
                value: '$follows',
                icon: Icons.person_add,
                color: Colors.purple,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                title: 'Posts',
                value: '$posts',
                icon: Icons.article,
                color: Colors.teal,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
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
