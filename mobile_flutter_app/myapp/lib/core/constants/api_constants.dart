class ApiConstants {
  ApiConstants._();

  // API host is configurable so mobile builds do not depend on stale LAN IPs.
  // Example:
  // flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
  static const String _apiBaseUrlFromEnv = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.12.226.41:8080',
  );

  static const String _wsUrlFromEnv = String.fromEnvironment(
    'WS_URL',
    defaultValue: '',
  );

  static final String baseUrl = _normalizeBaseUrl(_apiBaseUrlFromEnv);
  static final String wsUrl = _wsUrlFromEnv.isNotEmpty
      ? _normalizeWsUrl(_wsUrlFromEnv)
      : _deriveWsUrl(baseUrl);

  static String _normalizeBaseUrl(String value) {
    return value.endsWith('/') ? value.substring(0, value.length - 1) : value;
  }

  static String _normalizeWsUrl(String value) {
    final normalized = _normalizeBaseUrl(value);
    return normalized.endsWith('/ws') ? normalized : '$normalized/ws';
  }

  static String _deriveWsUrl(String httpUrl) {
    final uri = Uri.parse(httpUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    final host = uri.host;
    final hasPort = uri.hasPort;
    final portSegment = hasPort ? ':${uri.port}' : '';
    return '$scheme://$host$portSegment/ws';
  }

  // Auth endpoints
  static const String signup = '/api/auth/signup';
  static const String login = '/api/auth/login';
  static const String verifyOtp = '/api/auth/verify-otp';
  static const String checkEmail = '/api/auth/check-email';
  static const String checkUsername = '/api/auth/check-username';
  static const String forgotPassword = '/api/auth/forgot-password';
  static const String verifyResetCode = '/api/auth/verify-reset-code';
  static const String resetPassword = '/api/auth/reset-password';
  static const String uploadAvatar = '/api/auth/upload-avatar';
  static const String logout = '/api/auth/logout';
  static const String changePassword = '/api/auth/change-password';
  static const String toggle2fa = '/api/auth/2fa';
  static const String me = '/api/auth/me';

  // Profile endpoints
  static const String profileMe = '/api/profile/me';
  static const String profileMeDeactivate = '/api/profile/me/deactivate';
  static const String profileMeCommunities = '/api/profile/me/communities';
  static const String profileMeActivity = '/api/profile/me/activity';
  static String profileById(String id) => '/api/profile/$id';

  // Posts endpoints
  static const String posts = '/api/posts';
  static const String feed = '/api/feed';
  static const String savedPosts = '/api/posts/saved';
  static String postById(String id) => '/api/posts/$id';
  static String postLike(String id) => '/api/posts/$id/like';
  static String postComments(String id) => '/api/posts/$id/comments';
  static String postLikers(String id) => '/api/posts/$id/likers';
  static String postSave(String id) => '/api/posts/$id/save';
  static String postReport(String id) => '/api/posts/$id/report';
  static String postInteract(String id) => '/api/posts/$id/interact';
  static String userPosts(String id) => '/api/users/$id/posts';
  static String userLikes(String id) => '/api/users/$id/likes';
  static String userComments(String id) => '/api/users/$id/comments';

  // Comments endpoints
  static String deleteComment(String id) => '/api/comments/$id';

  // Stories endpoints
  static const String stories = '/api/stories';
  static const String storiesViewed = '/api/stories/viewed';
  static String storyById(String id) => '/api/stories/$id';
  static String storyView(String id) => '/api/stories/$id/view';
  static String storyLike(String id) => '/api/stories/$id/like';
  static String storyLikes(String id) => '/api/stories/$id/likes';

  // Follow endpoints
  static const String follow = '/api/follow';
  static String followUser(String id) => '/api/users/$id/follow';
  static String unfollowUser(String id) => '/api/users/$id/unfollow';
  static String userFollowers(String id) => '/api/users/$id/followers';
  static String userFollowing(String id) => '/api/users/$id/following';

  // Notifications endpoints
  static const String notifications = '/api/notifications';
  static const String notificationsReadAll = '/api/notifications/read-all';
  static String notificationRead(String id) => '/api/notifications/$id/read';
  static const String notificationsUnreadCount =
      '/api/notifications/unread/count';
  static const String notificationsRemote = '/api/notifications/remote';

  // Search endpoints
  static const String searchUsers = '/api/users/search';

  // Messaging endpoints
  static const String messages = '/api/messages';
  static const String conversations = '/api/messages/conversations';
  static String conversationById(String id) =>
      '/api/messages/conversations/$id';
  static String conversationRead(String id) =>
      '/api/messages/conversations/$id/read';
  static String messageDelete(String id) => '/api/messages/$id';
  static const String messagesUpload = '/api/messages/upload';
  static const String messagesUnreadCount = '/api/messages/unread-count';
  static String mediaDownload(String id) => '/api/messages/media/$id';

  // Federation endpoints
  static const String instanceInfo = '/.well-known/instance-info';
  static const String federationInbox = '/federation/inbox';
  static const String federationInstances = '/api/federation/instances';
  static const String federationResolveUser = '/api/federation/users/resolve';
  static const String federationFollowUser = '/api/federation/users/follow';
  static const String federationUnfollowUser = '/api/federation/users/unfollow';
  static const String webfinger = '/.well-known/webfinger';
  static const String activityPubFollow = '/api/activitypub/follow';
  static const String activityPubResolve = '/api/activitypub/resolve';

  // Block endpoints
  static String blockUser(String id) => '/api/users/$id/block';
  static const String blockedUsers = '/api/users/blocked';

  // Reports endpoints
  static const String reportsHeartbeat = '/api/reports/heartbeat';
  static const String reportsActivity = '/api/reports/activity';
  static const String reportsInteractions = '/api/reports/interactions';
  static const String reportsInteractionsMade =
      '/api/reports/interactions-made';
  static const String userReport = '/api/reports/user';
  static const String adminReportsList = '/api/reports/admin/list';

  // Admin endpoints
  static const String adminStats = '/api/admin/stats';
  static const String adminTraffic = '/api/admin/traffic';
  static const String adminUsers = '/api/admin/users';
  static const String adminUsersStatus = '/api/admin/users/status';
  static const String adminUsersRole = '/api/admin/users/role';
  static const String adminPosts = '/api/admin/posts';
  static const String adminReports = '/api/admin/reports';
  static const String adminReportsResolve = '/api/admin/reports/resolve';
}
