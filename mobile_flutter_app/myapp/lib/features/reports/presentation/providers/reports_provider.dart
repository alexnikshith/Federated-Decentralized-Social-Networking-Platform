import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/reports_remote_datasource.dart';

final reportsDataSourceProvider = Provider<ReportsRemoteDataSource>((ref) {
  return ReportsRemoteDataSource(client: ref.read(dioClientProvider));
});

class ReportsState {
  final Map<String, dynamic> activity;
  final Map<String, dynamic> interactionsReceived;
  final Map<String, dynamic> interactionsMade;
  final bool isLoading;
  final String? error;
  final String selectedTab;

  const ReportsState({
    this.activity = const {},
    this.interactionsReceived = const {},
    this.interactionsMade = const {},
    this.isLoading = false,
    this.error,
    this.selectedTab = 'activity',
  });

  ReportsState copyWith({
    Map<String, dynamic>? activity,
    Map<String, dynamic>? interactionsReceived,
    Map<String, dynamic>? interactionsMade,
    bool? isLoading,
    String? error,
    String? selectedTab,
  }) {
    return ReportsState(
      activity: activity ?? this.activity,
      interactionsReceived: interactionsReceived ?? this.interactionsReceived,
      interactionsMade: interactionsMade ?? this.interactionsMade,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedTab: selectedTab ?? this.selectedTab,
    );
  }
}

class ReportsNotifier extends StateNotifier<ReportsState> {
  final ReportsRemoteDataSource _dataSource;

  ReportsNotifier({required ReportsRemoteDataSource dataSource})
    : _dataSource = dataSource,
      super(const ReportsState());

  Future<void> loadReports({String? startDate, String? endDate}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final now = DateTime.now();
      final start =
          startDate ??
          now.subtract(const Duration(days: 7)).toIso8601String().split('T')[0];
      final end = endDate ?? now.toIso8601String().split('T')[0];

      final results = await Future.wait([
        _dataSource.getActivity(startDate: start, endDate: end),
        _dataSource.getInteractions(startDate: start, endDate: end),
        _dataSource.getInteractionsMade(startDate: start, endDate: end),
      ]);

      state = state.copyWith(
        activity: results[0],
        interactionsReceived: results[1],
        interactionsMade: results[2],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> sendHeartbeat() async {
    try {
      await _dataSource.sendHeartbeat();
    } catch (_) {}
  }

  void setTab(String tab) {
    state = state.copyWith(selectedTab: tab);
  }
}

final reportsProvider = StateNotifierProvider<ReportsNotifier, ReportsState>((
  ref,
) {
  return ReportsNotifier(dataSource: ref.read(reportsDataSourceProvider));
});
