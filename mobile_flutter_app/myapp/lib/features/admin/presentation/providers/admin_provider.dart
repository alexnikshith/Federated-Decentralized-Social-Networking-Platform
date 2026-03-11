import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/admin_remote_datasource.dart';

final adminDataSourceProvider = Provider<AdminRemoteDataSource>((ref) {
  return AdminRemoteDataSource(client: ref.read(dioClientProvider));
});

class AdminState {
  final Map<String, dynamic> stats;
  final Map<String, dynamic> traffic;
  final List<Map<String, dynamic>> users;
  final List<Map<String, dynamic>> reports;
  final bool isLoading;
  final String? error;

  const AdminState({
    this.stats = const {},
    this.traffic = const {},
    this.users = const [],
    this.reports = const [],
    this.isLoading = false,
    this.error,
  });

  AdminState copyWith({
    Map<String, dynamic>? stats,
    Map<String, dynamic>? traffic,
    List<Map<String, dynamic>>? users,
    List<Map<String, dynamic>>? reports,
    bool? isLoading,
    String? error,
  }) {
    return AdminState(
      stats: stats ?? this.stats,
      traffic: traffic ?? this.traffic,
      users: users ?? this.users,
      reports: reports ?? this.reports,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AdminNotifier extends StateNotifier<AdminState> {
  final AdminRemoteDataSource _dataSource;

  AdminNotifier({required AdminRemoteDataSource dataSource})
    : _dataSource = dataSource,
      super(const AdminState());

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final now = DateTime.now();
      final startDate = now
          .subtract(const Duration(days: 30))
          .toIso8601String()
          .split('T')[0];
      final endDate = now.toIso8601String().split('T')[0];

      final results = await Future.wait([
        _dataSource.getStats(),
        _dataSource.getTraffic(startDate: startDate, endDate: endDate),
        _dataSource.getUsers(limit: 50),
        _dataSource.getReports(limit: 50),
      ]);

      state = state.copyWith(
        stats: results[0] as Map<String, dynamic>,
        traffic: results[1] as Map<String, dynamic>,
        users: results[2] as List<Map<String, dynamic>>,
        reports: results[3] as List<Map<String, dynamic>>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> toggleUserStatus(
    String userId,
    bool active, {
    String? reason,
  }) async {
    try {
      await _dataSource.updateUserStatus(
        userId: userId,
        active: active,
        reason: reason,
      );
      await loadDashboard();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> updateUserRole(String userId, String role) async {
    try {
      await _dataSource.updateUserRole(userId: userId, role: role);
      await loadDashboard();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> deleteUser(String userId) async {
    try {
      await _dataSource.deleteUser(userId);
      await loadDashboard();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> deletePost(String postId) async {
    try {
      await _dataSource.deletePost(postId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> resolveReport(String reportId, {String? action}) async {
    try {
      await _dataSource.resolveReport(reportId, action: action);
      await loadDashboard();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

final adminProvider = StateNotifierProvider<AdminNotifier, AdminState>((ref) {
  return AdminNotifier(dataSource: ref.read(adminDataSourceProvider));
});
