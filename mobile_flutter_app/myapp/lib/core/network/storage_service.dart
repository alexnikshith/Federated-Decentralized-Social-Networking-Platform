import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';
import '../../data/models/user_model.dart';

class StorageService {
  final FlutterSecureStorage _secureStorage;
  final SharedPreferences _prefs;

  StorageService({
    required FlutterSecureStorage secureStorage,
    required SharedPreferences prefs,
  }) : _secureStorage = secureStorage,
       _prefs = prefs;

  // Token management
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: AppConstants.tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: AppConstants.tokenKey);
  }

  Future<void> deleteToken() async {
    await _secureStorage.delete(key: AppConstants.tokenKey);
  }

  // User management
  Future<void> saveUser(UserModel user) async {
    await _prefs.setString(AppConstants.userKey, jsonEncode(user.toJson()));
  }

  Future<UserModel?> getUser() async {
    final json = _prefs.getString(AppConstants.userKey);
    if (json == null) return null;
    return UserModel.fromJson(jsonDecode(json));
  }

  Future<void> deleteUser() async {
    await _prefs.remove(AppConstants.userKey);
  }

  // Theme management
  Future<void> saveThemeMode(String mode) async {
    await _prefs.setString(AppConstants.themeKey, mode);
  }

  Future<String?> getThemeMode() async {
    return _prefs.getString(AppConstants.themeKey);
  }

  // Active community URL
  Future<void> saveActiveCommunityUrl(String url) async {
    await _prefs.setString(AppConstants.activeCommunityKey, url);
  }

  Future<String?> getActiveCommunityUrl() async {
    return _prefs.getString(AppConstants.activeCommunityKey);
  }

  // Clear all data
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
    await _prefs.clear();
  }
}
