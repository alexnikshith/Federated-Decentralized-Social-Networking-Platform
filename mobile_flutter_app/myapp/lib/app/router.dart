import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/presentation/providers/auth_provider.dart';
import '../features/auth/presentation/screens/screens.dart';
import '../features/feed/presentation/screens/screens.dart';
import '../features/messaging/presentation/screens/screens.dart';
import '../features/federation/presentation/screens/screens.dart';
import '../features/profile/presentation/screens/screens.dart';
import '../features/notifications/presentation/screens/screens.dart';
import '../features/settings/presentation/screens/screens.dart';
import '../features/reports/presentation/screens/reports_screen.dart';
import '../features/admin/presentation/screens/admin_dashboard_screen.dart';
import 'main_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/feed',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isLoggingIn =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register' ||
          state.matchedLocation == '/forgot-password' ||
          state.matchedLocation == '/otp-verification';

      // If not logged in and not on auth pages, redirect to login
      if (!isLoggedIn && !isLoggingIn) {
        return '/login';
      }

      // If logged in and on auth pages, redirect to feed
      if (isLoggedIn && isLoggingIn) {
        return '/feed';
      }

      return null;
    },
    routes: [
      // Auth routes (no shell)
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/otp-verification',
        builder: (context, state) => const OtpVerificationScreen(),
      ),

      // Main app shell with bottom navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/feed',
            builder: (context, state) => const FeedScreen(),
          ),
          GoRoute(
            path: '/explore',
            builder: (context, state) => const FederationScreen(),
          ),
          GoRoute(
            path: '/messages',
            builder: (context, state) => const ConversationsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) {
              final userId = ref.read(currentUserProvider)?.id ?? '';
              return ProfileScreen(userId: userId);
            },
          ),
        ],
      ),

      // Full screen routes outside the shell
      GoRoute(
        path: '/profile/:userId',
        builder: (context, state) {
          final userId = state.pathParameters['userId']!;
          return ProfileScreen(userId: userId);
        },
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      // New chat (no existing conversation yet)
      GoRoute(
        path: '/chat/new',
        builder: (context, state) {
          final receiverId = state.uri.queryParameters['receiverId'] ?? '';
          final name = state.uri.queryParameters['name'] ?? 'Unknown';
          return ChatScreen(
            conversationId: '', // empty = new conversation
            receiverId: receiverId,
            receiverName: Uri.decodeComponent(name),
          );
        },
      ),
      GoRoute(
        path: '/chat/:conversationId',
        builder: (context, state) {
          final conversationId = state.pathParameters['conversationId']!;
          final receiverId = state.uri.queryParameters['receiverId'] ?? '';
          final name = state.uri.queryParameters['name'] ?? 'Unknown';
          return ChatScreen(
            conversationId: conversationId,
            receiverId: receiverId,
            receiverName: Uri.decodeComponent(name),
          );
        },
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/blocked-users',
        builder: (context, state) => const BlockedUsersScreen(),
      ),
      GoRoute(
        path: '/edit-profile',
        builder: (context, state) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/activity-log',
        builder: (context, state) => const ActivityLogScreen(),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const UserSearchScreen(),
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsScreen(),
      ),
      GoRoute(
        path: '/admin',
        redirect: (context, state) {
          final isAdmin = ref.read(isAdminProvider);
          return isAdmin ? null : '/feed';
        },
        builder: (context, state) => const AdminDashboardScreen(),
      ),
    ],
  );
});
