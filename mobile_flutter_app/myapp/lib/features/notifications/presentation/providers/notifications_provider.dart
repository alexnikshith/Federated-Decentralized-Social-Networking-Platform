import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/websocket_service.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'dart:async';

// Notifications data source
class NotificationsRemoteDataSource {
  final DioClient _client;

  NotificationsRemoteDataSource({required DioClient client}) : _client = client;

  Future<List<NotificationModel>> getNotifications({
    int? page,
    int? limit,
  }) async {
    final response = await _client.get(
      ApiConstants.notifications,
      queryParameters: {
        if (page != null) 'page': page,
        if (limit != null) 'limit': limit,
      },
    );
    final data = response.data;
    if (data is List) {
      return data.map((e) => NotificationModel.fromJson(e)).toList();
    }
    if (data['notifications'] != null) {
      return (data['notifications'] as List)
          .map((e) => NotificationModel.fromJson(e))
          .toList();
    }
    return [];
  }

  Future<void> markAsRead(String id) async {
    await _client.put(ApiConstants.notificationRead(id));
  }

  Future<void> markAllAsRead() async {
    await _client.put(ApiConstants.notificationsReadAll);
  }

  Future<int> getUnreadCount() async {
    final response = await _client.get(ApiConstants.notificationsUnreadCount);
    return response.data['count'] ?? response.data['unread_count'] ?? 0;
  }
}

final notificationsDataSourceProvider = Provider<NotificationsRemoteDataSource>(
  (ref) {
    return NotificationsRemoteDataSource(client: ref.read(dioClientProvider));
  },
);

// Notifications state
class NotificationsState {
  final List<NotificationModel> notifications;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final int unreadCount;
  final int currentPage;
  final bool hasMore;

  const NotificationsState({
    this.notifications = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.unreadCount = 0,
    this.currentPage = 1,
    this.hasMore = true,
  });

  NotificationsState copyWith({
    List<NotificationModel>? notifications,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    int? unreadCount,
    int? currentPage,
    bool? hasMore,
  }) {
    return NotificationsState(
      notifications: notifications ?? this.notifications,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error,
      unreadCount: unreadCount ?? this.unreadCount,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final NotificationsRemoteDataSource _dataSource;
  final WebSocketService _webSocketService;
  StreamSubscription? _wsSubscription;

  NotificationsNotifier({
    required NotificationsRemoteDataSource dataSource,
    required WebSocketService webSocketService,
  }) : _dataSource = dataSource,
       _webSocketService = webSocketService,
       super(const NotificationsState()) {
    _setupWebSocketListener();
  }

  void _setupWebSocketListener() {
    _wsSubscription = _webSocketService.messageStream.listen((message) {
      if (message['type'] == 'notification') {
        final notification = NotificationModel.fromJson(message['payload']);
        state = state.copyWith(
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        );
      }
    });
  }

  Future<void> fetchNotifications() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final notifications = await _dataSource.getNotifications(page: 1);
      final unreadCount = await _dataSource.getUnreadCount();
      state = state.copyWith(
        notifications: notifications,
        isLoading: false,
        unreadCount: unreadCount,
        currentPage: 1,
        hasMore: notifications.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.currentPage + 1;
      final notifications = await _dataSource.getNotifications(page: nextPage);
      state = state.copyWith(
        notifications: [...state.notifications, ...notifications],
        isLoadingMore: false,
        currentPage: nextPage,
        hasMore: notifications.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _dataSource.markAsRead(id);
      final index = state.notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        final notifications = [...state.notifications];
        notifications[index] = notifications[index].copyWith(isRead: true);
        state = state.copyWith(
          notifications: notifications,
          unreadCount: (state.unreadCount - 1).clamp(0, state.unreadCount),
        );
      }
    } catch (_) {}
  }

  Future<void> markAllAsRead() async {
    try {
      await _dataSource.markAllAsRead();
      final notifications = state.notifications
          .map((n) => n.copyWith(isRead: true))
          .toList();
      state = state.copyWith(notifications: notifications, unreadCount: 0);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> refreshUnreadCount() async {
    try {
      final count = await _dataSource.getUnreadCount();
      state = state.copyWith(unreadCount: count);
    } catch (_) {}
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
      return NotificationsNotifier(
        dataSource: ref.read(notificationsDataSourceProvider),
        webSocketService: ref.read(webSocketServiceProvider),
      );
    });

// Unread notifications count provider
final unreadNotificationsCountProvider = Provider<int>((ref) {
  return ref.watch(notificationsProvider).unreadCount;
});
