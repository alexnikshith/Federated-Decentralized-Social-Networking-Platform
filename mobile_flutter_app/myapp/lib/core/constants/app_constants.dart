class AppConstants {
  AppConstants._();

  static const String appName = 'Federated Social';
  static const String appVersion = '1.0.0';

  // Storage keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String themeKey = 'theme_mode';
  static const String activeCommunityKey = 'active_community_url';
  static const String sessionsKey = 'sessions';

  // Pagination
  static const int defaultPageSize = 20;
  static const int storiesPageSize = 10;
  static const int messagesPageSize = 50;

  // Timeouts
  static const int connectionTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000;

  // WebSocket
  static const int wsReconnectDelay = 3000; // 3 seconds
  static const int wsPingInterval = 30000; // 30 seconds

  // Media
  static const int maxImageSize = 10 * 1024 * 1024; // 10MB
  static const int maxVideoSize = 50 * 1024 * 1024; // 50MB
  static const List<String> allowedImageTypes = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
  ];
  static const List<String> allowedVideoTypes = ['mp4', 'mov', 'avi', 'webm'];

  // Story
  static const int storyDurationHours = 24;
  static const int storyViewDurationSeconds = 5;

  // Validation
  static const int minPasswordLength = 8;
  static const int maxUsernameLength = 30;
  static const int maxBioLength = 500;
  static const int maxPostLength = 5000;
  static const int maxCommentLength = 2000;
}
