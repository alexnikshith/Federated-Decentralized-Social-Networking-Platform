import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import '../constants/api_constants.dart';
import '../constants/app_constants.dart';

enum WebSocketConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

class WebSocketService {
  WebSocketChannel? _channel;
  String? _token;
  WebSocketConnectionState _connectionState =
      WebSocketConnectionState.disconnected;
  Timer? _reconnectTimer;
  Timer? _pingTimer;

  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController =
      StreamController<WebSocketConnectionState>.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<WebSocketConnectionState> get connectionStateStream =>
      _connectionStateController.stream;
  WebSocketConnectionState get connectionState => _connectionState;

  void connect(String token) {
    _token = token;
    _connect();
  }

  Future<void> _connect() async {
    if (_connectionState == WebSocketConnectionState.connecting) return;

    _updateConnectionState(WebSocketConnectionState.connecting);

    try {
      final uri = Uri.parse('${ApiConstants.wsUrl}?token=$_token');
      final socket = await WebSocket.connect(uri.toString());
      _channel = IOWebSocketChannel(socket);

      _channel!.stream.listen(_onMessage, onError: _onError, onDone: _onDone);

      _updateConnectionState(WebSocketConnectionState.connected);
      _startPingTimer();
    } catch (e) {
      _onError(e);
    }
  }

  void _onMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;
      _messageController.add(data);
    } catch (e) {
      // Ignore invalid messages
    }
  }

  void _onError(dynamic error) {
    _updateConnectionState(WebSocketConnectionState.disconnected);
    _scheduleReconnect();
  }

  void _onDone() {
    _updateConnectionState(WebSocketConnectionState.disconnected);
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (_token == null) return;

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(
      const Duration(milliseconds: AppConstants.wsReconnectDelay),
      () {
        _updateConnectionState(WebSocketConnectionState.reconnecting);
        unawaited(_connect());
      },
    );
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(
      const Duration(milliseconds: AppConstants.wsPingInterval),
      (_) {
        if (_connectionState == WebSocketConnectionState.connected) {
          send({'type': 'ping'});
        }
      },
    );
  }

  void _updateConnectionState(WebSocketConnectionState state) {
    _connectionState = state;
    _connectionStateController.add(state);
  }

  void send(Map<String, dynamic> message) {
    if (_channel != null &&
        _connectionState == WebSocketConnectionState.connected) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void disconnect() {
    _token = null;
    _reconnectTimer?.cancel();
    _pingTimer?.cancel();
    _channel?.sink.close();
    _updateConnectionState(WebSocketConnectionState.disconnected);
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionStateController.close();
  }
}
