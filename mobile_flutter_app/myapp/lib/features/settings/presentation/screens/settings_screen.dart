import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          // Profile section
          _SectionHeader(title: 'Profile'),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Edit Profile'),
            subtitle: const Text('Display name, bio, avatar, visibility'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/edit-profile'),
          ),

          const Divider(),

          // Privacy & Security
          _SectionHeader(title: 'Privacy & Security'),
          ListTile(
            leading: const Icon(Icons.security),
            title: const Text('Two-Factor Authentication'),
            subtitle: Text(user?.is2FAEnabled == true ? 'Enabled' : 'Disabled'),
            trailing: Switch(
              value: user?.is2FAEnabled ?? false,
              onChanged: (value) {
                ref.read(authProvider.notifier).toggle2FA(value);
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.lock),
            title: const Text('Change Password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showChangePasswordDialog(context, ref),
          ),
          ListTile(
            leading: const Icon(Icons.block),
            title: const Text('Blocked Users'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/blocked-users'),
          ),

          const Divider(),

          // Analytics
          _SectionHeader(title: 'Analytics'),
          ListTile(
            leading: const Icon(Icons.bar_chart),
            title: const Text('Reports & Analytics'),
            subtitle: const Text('Time usage, interactions, activity'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/reports'),
          ),
          ListTile(
            leading: const Icon(Icons.search),
            title: const Text('Find Users'),
            subtitle: const Text('Search people by name or username'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/search'),
          ),

          const Divider(),

          // Admin (visible only to admin users)
          if (user?.role == 'admin') ...[
            _SectionHeader(title: 'Administration'),
            ListTile(
              leading: const Icon(Icons.admin_panel_settings),
              title: const Text('Admin Dashboard'),
              subtitle: const Text('Users, reports, traffic'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/admin'),
            ),
            const Divider(),
          ],

          // Account management
          _SectionHeader(title: 'Account'),
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('Activity Log'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/activity-log'),
          ),
          ListTile(
            leading: Icon(Icons.pause_circle_outline, color: Colors.orange),
            title: const Text('Deactivate Account'),
            subtitle: const Text('Temporarily disable your account'),
            onTap: () => _showDeactivateDialog(context, ref),
          ),
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: const Text(
              'Delete Account',
              style: TextStyle(color: Colors.red),
            ),
            subtitle: const Text('Permanently delete your account'),
            onTap: () => _showDeleteAccountDialog(context, ref),
          ),

          const Divider(),

          // Logout
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red)),
            onTap: () => _showLogoutDialog(context, ref),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context, WidgetRef ref) {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: newController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: confirmController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm New Password',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (newController.text != confirmController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Passwords do not match')),
                );
                return;
              }
              final success = await ref
                  .read(authProvider.notifier)
                  .changePassword(
                    currentPassword: currentController.text,
                    newPassword: newController.text,
                  );
              if (ctx.mounted) Navigator.pop(ctx);
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Password changed successfully'),
                    backgroundColor: AppColors.success,
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      ref.read(authProvider).error ??
                          'Failed to change password',
                    ),
                    backgroundColor: AppColors.error,
                  ),
                );
              }
            },
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }

  void _showDeactivateDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Deactivate Account'),
        content: const Text(
          'Your account will be temporarily disabled. You can reactivate it by logging in again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            onPressed: () async {
              Navigator.pop(ctx);
              // Call deactivate through profile datasource
              try {
                final dio = ref.read(dioClientProvider);
                await dio.post('/api/profile/me/deactivate');
                ref.read(authProvider.notifier).logout();
                if (!context.mounted) return;
                context.go('/login');
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: const Text('Deactivate'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'This action is permanent and cannot be undone. All your data will be deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final dio = ref.read(dioClientProvider);
                await dio.delete('/api/profile/me');
                ref.read(authProvider.notifier).logout();
                if (!context.mounted) return;
                context.go('/login');
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: const Text('Delete Permanently'),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
              context.go('/login');
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
