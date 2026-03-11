extension StringExtensions on String {
  String get capitalize {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  String get capitalizeWords {
    if (isEmpty) return this;
    return split(' ').map((word) => word.capitalize).join(' ');
  }

  bool get isValidEmail {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return emailRegex.hasMatch(this);
  }

  bool get isValidUrl {
    final urlRegex = RegExp(
      r'^(http|https):\/\/([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&()*+,;=]*)?$',
    );
    return urlRegex.hasMatch(this);
  }

  String truncate(int maxLength, {String suffix = '...'}) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength - suffix.length)}$suffix';
  }

  String? get nullIfEmpty => isEmpty ? null : this;

  List<String> extractMentions() {
    final mentionRegex = RegExp(r'@(\w+)');
    return mentionRegex
        .allMatches(this)
        .map((match) => match.group(1)!)
        .toList();
  }

  List<String> extractHashtags() {
    final hashtagRegex = RegExp(r'#(\w+)');
    return hashtagRegex
        .allMatches(this)
        .map((match) => match.group(1)!)
        .toList();
  }

  // Parse federated handle like @user@instance.com
  (String username, String? instance) parseFederatedHandle() {
    if (!startsWith('@')) return (this, null);
    final parts = substring(1).split('@');
    if (parts.length == 1) return (parts[0], null);
    return (parts[0], parts[1]);
  }
}
