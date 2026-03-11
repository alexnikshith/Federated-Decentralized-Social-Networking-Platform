class AppException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  AppException({required this.message, this.statusCode, this.data});

  @override
  String toString() => message;
}

class ServerException extends AppException {
  ServerException({required super.message, super.statusCode, super.data});
}

class NetworkException extends AppException {
  NetworkException({super.message = 'No internet connection'});
}

class CacheException extends AppException {
  CacheException({super.message = 'Cache error'});
}

class AuthException extends AppException {
  AuthException({required super.message, super.statusCode});
}

class ValidationException extends AppException {
  ValidationException({required super.message});
}

class UnauthorizedException extends AppException {
  UnauthorizedException({super.message = 'Unauthorized'});
}

class ForbiddenException extends AppException {
  ForbiddenException({super.message = 'Access denied'});
}

class NotFoundException extends AppException {
  NotFoundException({super.message = 'Not found'});
}
