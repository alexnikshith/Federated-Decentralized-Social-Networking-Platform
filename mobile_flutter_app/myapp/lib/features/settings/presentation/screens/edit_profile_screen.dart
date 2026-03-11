import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../profile/presentation/providers/profile_provider.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _bioController = TextEditingController();
  final _picker = ImagePicker();

  String _profileVisibility = 'public';
  bool _isDiscoverable = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    if (user != null) {
      _displayNameController.text = user.displayName;
      _bioController.text = user.bio ?? '';
      _profileVisibility = user.profileVisibility;
      _isDiscoverable = user.isDiscoverable;
    }
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Center(
                    child: Stack(
                      children: [
                        CircleAvatar(
                          radius: 46,
                          backgroundImage: user.avatarUrl != null
                              ? NetworkImage(user.avatarUrl!)
                              : null,
                          child: user.avatarUrl == null
                              ? Text(
                                  user.displayName.isNotEmpty
                                      ? user.displayName[0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(fontSize: 30),
                                )
                              : null,
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: AppColors.primary,
                            child: IconButton(
                              padding: EdgeInsets.zero,
                              iconSize: 16,
                              color: Colors.white,
                              icon: const Icon(Icons.edit),
                              onPressed: _isSaving
                                  ? null
                                  : _pickAndUploadAvatar,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _displayNameController,
                    decoration: const InputDecoration(
                      labelText: 'Display Name',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Display name is required';
                      }
                      if (value.trim().length < 2) {
                        return 'Display name is too short';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _bioController,
                    maxLines: 4,
                    maxLength: 280,
                    decoration: const InputDecoration(
                      labelText: 'Bio',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _profileVisibility,
                    decoration: const InputDecoration(
                      labelText: 'Profile Visibility',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'public', child: Text('Public')),
                      DropdownMenuItem(
                        value: 'followers',
                        child: Text('Followers Only'),
                      ),
                      DropdownMenuItem(
                        value: 'private',
                        child: Text('Private'),
                      ),
                    ],
                    onChanged: _isSaving
                        ? null
                        : (value) {
                            if (value != null) {
                              setState(() => _profileVisibility = value);
                            }
                          },
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    value: _isDiscoverable,
                    onChanged: _isSaving
                        ? null
                        : (value) => setState(() => _isDiscoverable = value),
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Discoverable in search'),
                    subtitle: const Text('Allow others to find your profile'),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: _isSaving ? null : _saveProfile,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save),
                    label: Text(_isSaving ? 'Saving...' : 'Save Changes'),
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _pickAndUploadAvatar() async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (file == null) return;

    setState(() => _isSaving = true);
    try {
      final dataSource = ref.read(profileRemoteDataSourceProvider);
      final avatarUrl = await dataSource.uploadAvatar(file.path);
      final updatedUser = await dataSource.updateProfile(avatarUrl: avatarUrl);
      ref.read(authProvider.notifier).updateUser(updatedUser);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Avatar updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to upload avatar: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final dataSource = ref.read(profileRemoteDataSourceProvider);
      final updatedUser = await dataSource.updateProfile(
        displayName: _displayNameController.text.trim(),
        bio: _bioController.text.trim(),
        profileVisibility: _profileVisibility,
        isDiscoverable: _isDiscoverable,
      );
      ref.read(authProvider.notifier).updateUser(updatedUser);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }
}
