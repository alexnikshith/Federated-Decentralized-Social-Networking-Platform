import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/websocket_service.dart';
import '../../../../data/models/models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/messaging_remote_datasource.dart';
import '../../data/repositories/messaging_repository_impl.dart';

// Messaging data source and repository providers
final messagingRemoteDataSourceProvider = Provider<MessagingRemoteDataSource>((
  ref,
) {
  return MessagingRemoteDataSourceImpl(client: ref.read(dioClientProvider));
});

final messagingRepositoryProvider = Provider<MessagingRepository>((ref) {
  return MessagingRepositoryImpl(
    remoteDataSource: ref.read(messagingRemoteDataSourceProvider),
  );
});

// Conversations state
class ConversationsState {
  final List<ConversationModel> conversations;
  final bool isLoading;
  final String? error;
  final int unreadCount;

  const ConversationsState({
    this.conversations = const [],
    this.isLoading = false,
    this.error,
    this.unreadCount = 0,
  });

  ConversationsState copyWith({
    List<ConversationModel>? conversations,
    bool? isLoading,
    String? error,
    int? unreadCount,
  }) {
    return ConversationsState(
      conversations: conversations ?? this.conversations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}

class ConversationsNotifier extends StateNotifier<ConversationsState> {
  final MessagingRepository _repository;
  final WebSocketService _webSocketService;
  StreamSubscription? _wsSubscription;

  ConversationsNotifier({
    required MessagingRepository repository,
    required WebSocketService webSocketService,
  }) : _repository = repository,
       _webSocketService = webSocketService,
       super(const ConversationsState()) {
    _setupWebSocketListener();
  }

  void _setupWebSocketListener() {
    _wsSubscription = _webSocketService.messageStream.listen((wsEvent) {
      final type = wsEvent['type'];
      if (type == 'new_message' || type == 'message') {
        // Backend sends payload directly inside the top-level map
        final payload = wsEvent['payload'] ?? wsEvent['data'] ?? wsEvent;
        final msgData = payload is Map<String, dynamic> && payload.containsKey('message')
            ? payload['message'] as Map<String, dynamic>
            : payload as Map<String, dynamic>;
        _handleIncomingMessage(msgData);
      }
    });
  }

  void _handleIncomingMessage(Map<String, dynamic> payload) {
    final newMessage = MessageModel.fromJson(payload);
    final conversations = [...state.conversations];

    final index = conversations.indexWhere(
      (c) => c.id == newMessage.conversationId,
    );

    if (index != -1) {
      final conversation = conversations[index].copyWith(
        lastMessage: newMessage,
        unreadCount: conversations[index].unreadCount + 1,
      );
      conversations.removeAt(index);
      conversations.insert(0, conversation);
      state = state.copyWith(
        conversations: conversations,
        unreadCount: state.unreadCount + 1,
      );
    } else {
      // New conversation, refresh the list
      fetchConversations();
    }
  }

  Future<void> fetchConversations() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final conversations = await _repository.getConversations();
      final unreadCount = await _repository.getUnreadCount();
      state = state.copyWith(
        conversations: conversations,
        isLoading: false,
        unreadCount: unreadCount,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refreshUnreadCount() async {
    try {
      final count = await _repository.getUnreadCount();
      state = state.copyWith(unreadCount: count);
    } catch (_) {}
  }

  Future<void> deleteConversation(String id) async {
    try {
      await _repository.deleteConversation(id);
      state = state.copyWith(
        conversations: state.conversations.where((c) => c.id != id).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void markConversationAsRead(String conversationId) {
    final index = state.conversations.indexWhere((c) => c.id == conversationId);
    if (index != -1) {
      final conversations = [...state.conversations];
      final unreadDiff = conversations[index].unreadCount;
      conversations[index] = conversations[index].copyWith(unreadCount: 0);
      state = state.copyWith(
        conversations: conversations,
        unreadCount: (state.unreadCount - unreadDiff).clamp(
          0,
          state.unreadCount,
        ),
      );
      _repository.markConversationAsRead(conversationId);
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final conversationsProvider =
    StateNotifierProvider<ConversationsNotifier, ConversationsState>((ref) {
      return ConversationsNotifier(
        repository: ref.read(messagingRepositoryProvider),
        webSocketService: ref.read(webSocketServiceProvider),
      );
    });

// Chat state for a specific conversation
class ChatState {
  final List<MessageModel> messages;
  final bool isLoading;
  final bool isLoadingMore;
  final bool isSending;
  final String? error;
  final int currentPage;
  final bool hasMore;

  const ChatState({
    this.messages = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.isSending = false,
    this.error,
    this.currentPage = 1,
    this.hasMore = true,
  });

  ChatState copyWith({
    List<MessageModel>? messages,
    bool? isLoading,
    bool? isLoadingMore,
    bool? isSending,
    String? error,
    int? currentPage,
    bool? hasMore,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isSending: isSending ?? this.isSending,
      error: error,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  final MessagingRepository _repository;
  final WebSocketService _webSocketService;
  final String conversationId;
  final String receiverId;
  StreamSubscription? _wsSubscription;

  ChatNotifier({
    required MessagingRepository repository,
    required WebSocketService webSocketService,
    required this.conversationId,
    required this.receiverId,
  }) : _repository = repository,
       _webSocketService = webSocketService,
       super(const ChatState()) {
    _setupWebSocketListener();
  }

  void _setupWebSocketListener() {
    _wsSubscription = _webSocketService.messageStream.listen((wsEvent) {
      final type = wsEvent['type'];
      if (type == 'new_message' || type == 'message') {
        final payload = wsEvent['payload'] ?? wsEvent['data'] ?? wsEvent;
        final msgData = payload is Map<String, dynamic> && payload.containsKey('message')
            ? payload['message'] as Map<String, dynamic>
            : payload as Map<String, dynamic>;
        try {
          final newMessage = MessageModel.fromJson(msgData);
          if (newMessage.conversationId == conversationId) {
            state = state.copyWith(messages: [newMessage, ...state.messages]);
          }
        } catch (_) {}
      }
    });
  }

  Future<void> fetchMessages() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final messages = await _repository.getConversationMessages(
        conversationId,
        page: 1,
      );
      state = state.copyWith(
        messages: messages,
        isLoading: false,
        currentPage: 1,
        hasMore: messages.length >= 50,
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
      final messages = await _repository.getConversationMessages(
        conversationId,
        page: nextPage,
      );
      state = state.copyWith(
        messages: [...state.messages, ...messages],
        isLoadingMore: false,
        currentPage: nextPage,
        hasMore: messages.length >= 50,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  Future<String?> sendMessage({
    required String content,
    String? type,
    String? mediaUrl,
    String? fileName,
  }) async {
    state = state.copyWith(isSending: true, error: null);
    try {
      final message = await _repository.sendMessage(
        receiverId: receiverId,
        content: content,
        type: type,
        mediaUrl: mediaUrl,
        fileName: fileName,
      );
      state = state.copyWith(
        messages: [message, ...state.messages],
        isSending: false,
      );
      return message.conversationId; // return the conversationId
    } catch (e) {
      state = state.copyWith(isSending: false, error: e.toString());
      return null;
    }
  }

  Future<void> deleteMessage(String id) async {
    try {
      await _repository.deleteMessage(id);
      state = state.copyWith(
        messages: state.messages.where((m) => m.id != id).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

// Chat provider family for different conversations
final chatProviderFamily =
    StateNotifierProvider.family<
      ChatNotifier,
      ChatState,
      ({String conversationId, String receiverId})
    >((ref, params) {
      return ChatNotifier(
        repository: ref.read(messagingRepositoryProvider),
        webSocketService: ref.read(webSocketServiceProvider),
        conversationId: params.conversationId,
        receiverId: params.receiverId,
      );
    });

// Unread messages count provider
final unreadMessagesCountProvider = Provider<int>((ref) {
  return ref.watch(conversationsProvider).unreadCount;
});
