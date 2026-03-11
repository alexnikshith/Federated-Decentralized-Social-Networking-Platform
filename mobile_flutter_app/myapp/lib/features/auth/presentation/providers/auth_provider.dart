import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/storage_service.dart';
import '../../../../core/network/websocket_service.dart';
import '../../../../data/models/models.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';

// Core services
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError(
    'SharedPreferences must be initialized in main.dart',
  );
});

final flutterSecureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService(
    secureStorage: ref.read(flutterSecureStorageProvider),
    prefs: ref.read(sharedPreferencesProvider),
  );
});

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(storageService: ref.read(storageServiceProvider));
});

final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  return WebSocketService();
});

// Auth providers
final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSourceImpl(client: ref.read(dioClientProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    remoteDataSource: ref.read(authRemoteDataSourceProvider),
    storageService: ref.read(storageServiceProvider),
  );
});

// Auth state
class AuthState {
  final UserModel? user;
  final bool isLoading;
  final bool isAuthenticated;
  final String? error;
  final bool requires2FA;
  final String? pendingEmail;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
    this.requires2FA = false,
    this.pendingEmail,
  });

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    bool? isAuthenticated,
    String? error,
    bool? requires2FA,
    String? pendingEmail,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error,
      requires2FA: requires2FA ?? this.requires2FA,
      pendingEmail: pendingEmail ?? this.pendingEmail,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;
  final WebSocketService _webSocketService;
  final StorageService _storageService;

  AuthNotifier({
    required AuthRepository repository,
    required WebSocketService webSocketService,
    required StorageService storageService,
  }) : _repository = repository,
       _webSocketService = webSocketService,
       _storageService = storageService,
       super(const AuthState());

  Future<void> initialize() async {
    state = state.copyWith(isLoading: true);
    try {
      final isLoggedIn = await _repository.isLoggedIn();
      if (isLoggedIn) {
        final user = await _repository.getCachedUser();
        if (user != null) {
          state = state.copyWith(
            user: user,
            isAuthenticated: true,
            isLoading: false,
          );
          // Connect WebSocket
          final token = await _storageService.getToken();
          if (token != null) {
            _webSocketService.connect(token);
          }
          // Refresh user data from server
          _refreshUser();
        } else {
          await _clearLocalSession();
          state = const AuthState(isLoading: false);
        }
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      if (_isAuthError(e)) {
        await _clearLocalSession();
        state = const AuthState(isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: e.toString());
      }
    }
  }

  Future<void> _refreshUser() async {
    try {
      final user = await _repository.getCurrentUser();
      state = state.copyWith(user: user);
    } catch (e) {
      if (_isAuthError(e)) {
        await _clearLocalSession();
        state = const AuthState(isLoading: false);
      }
    }
  }

  bool _isAuthError(Object error) {
    final text = error.toString().toLowerCase();
    return text.contains('unauthorized') ||
        text.contains('invalid or expired token') ||
        text.contains('invalid token') ||
        text.contains('expired token');
  }

  Future<void> _clearLocalSession() async {
    _webSocketService.disconnect();
    await _storageService.deleteToken();
    await _storageService.deleteUser();
  }

  Future<bool> signup({
    required String username,
    required String email,
    required String password,
    required String displayName,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.signup(
        username: username,
        email: email,
        password: password,
        displayName: displayName,
      );
      // Auto-login after successful signup
      final loginSuccess = await login(email: email, password: password);
      return loginSuccess;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, error: null, requires2FA: false);
    try {
      final response = await _repository.login(
        email: email,
        password: password,
      );
      if (response.requires2FA) {
        state = state.copyWith(
          isLoading: false,
          requires2FA: true,
          pendingEmail: email,
        );
        return true;
      } else if (response.authResponse != null) {
        state = state.copyWith(
          user: response.authResponse!.user,
          isAuthenticated: true,
          isLoading: false,
        );
        _webSocketService.connect(response.authResponse!.token);
        return true;
      }
      state = state.copyWith(isLoading: false, error: 'Login failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> verifyOtp(String code) async {
    if (state.pendingEmail == null) return false;
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _repository.verifyOtp(
        email: state.pendingEmail!,
        code: code,
      );
      state = state.copyWith(
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        requires2FA: false,
        pendingEmail: null,
      );
      _webSocketService.connect(response.token);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.logout();
      _webSocketService.disconnect();
      state = const AuthState();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> forgotPassword(String email) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.forgotPassword(email);
      state = state.copyWith(isLoading: false, pendingEmail: email);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> verifyResetCode(String code) async {
    if (state.pendingEmail == null) return false;
    state = state.copyWith(isLoading: true, error: null);
    try {
      final valid = await _repository.verifyResetCode(
        email: state.pendingEmail!,
        code: code,
      );
      state = state.copyWith(isLoading: false);
      return valid;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> resetPassword({
    required String code,
    required String newPassword,
  }) async {
    if (state.pendingEmail == null) return false;
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.resetPassword(
        email: state.pendingEmail!,
        code: code,
        newPassword: newPassword,
      );
      state = state.copyWith(isLoading: false, pendingEmail: null);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> toggle2FA(bool enable) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repository.toggle2FA(enable);
      state = state.copyWith(user: user, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  void updateUser(UserModel user) {
    state = state.copyWith(user: user);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    repository: ref.read(authRepositoryProvider),
    webSocketService: ref.read(webSocketServiceProvider),
    storageService: ref.read(storageServiceProvider),
  );
});

// Convenience providers
final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authProvider).user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final isAdminProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).user?.isAdmin ?? false;
});
