import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final activityLogProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final client = ref.read(dioClientProvider);
  final response = await client.get(ApiConstants.profileMeActivity);
  final raw = response.data;

  List<dynamic> entries = const [];
  if (raw is List) {
    entries = raw;
  } else if (raw is Map<String, dynamic>) {
    final data = raw['data'];
    if (data is List) {
      entries = data;
    } else if (data is Map<String, dynamic> && data['activities'] is List) {
      entries = data['activities'] as List<dynamic>;
    } else if (raw['activities'] is List) {
      entries = raw['activities'] as List<dynamic>;
    }
  }

  return entries
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
});

class ActivityLogScreen extends ConsumerWidget {
  const ActivityLogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(activityLogProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Activity Log')),
      body: activitiesAsync.when(
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
                  'Failed to load activity log\n$error',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => ref.refresh(activityLogProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (activities) {
          if (activities.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No activity yet. Your actions will appear here.'),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(activityLogProvider),
            child: ListView.separated(
              itemCount: activities.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final activity = activities[index];
                final type =
                    (activity['type'] ?? activity['action'] ?? 'Activity')
                        .toString();
                final detail =
                    (activity['details'] ?? activity['description'] ?? '')
                        .toString();
                final target =
                    (activity['target'] ?? activity['target_id'] ?? '')
                        .toString();
                final rawTime =
                    activity['created_at'] ??
                    activity['timestamp'] ??
                    activity['time'];
                final timestamp = rawTime is String
                    ? DateTime.tryParse(rawTime)
                    : null;

                return ListTile(
                  leading: CircleAvatar(
                    child: Icon(_iconForType(type), size: 18),
                  ),
                  title: Text(_titleFromType(type)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (detail.isNotEmpty) Text(detail),
                      if (target.isNotEmpty) Text('Target: $target'),
                      Text(
                        timestamp != null
                            ? DateFormat(
                                'MMM d, y - h:mm a',
                              ).format(timestamp.toLocal())
                            : 'Unknown time',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                  isThreeLine: true,
                );
              },
            ),
          );
        },
      ),
    );
  }

  IconData _iconForType(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('login')) return Icons.login;
    if (normalized.contains('logout')) return Icons.logout;
    if (normalized.contains('follow')) return Icons.person_add;
    if (normalized.contains('post')) return Icons.article;
    if (normalized.contains('comment')) return Icons.comment;
    if (normalized.contains('like')) return Icons.favorite;
    if (normalized.contains('message')) return Icons.chat;
    if (normalized.contains('profile')) return Icons.person;
    return Icons.history;
  }

  String _titleFromType(String type) {
    if (type.isEmpty) return 'Activity';
    final cleaned = type.replaceAll('_', ' ').trim();
    return cleaned
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map((word) => word[0].toUpperCase() + word.substring(1).toLowerCase())
        .join(' ');
  }
}
