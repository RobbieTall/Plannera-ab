import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/providers/auth_provider.dart';
import '../../../core/network/dio_provider.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  final _nameController = TextEditingController();
  DateTime? _birthDate;
  String _timezone = 'UTC';
  bool _saving = false;

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _complete() async {
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.updateUser({
        'displayName': _nameController.text.trim(),
        'birthDate': _birthDate?.toIso8601String().substring(0, 10),
        'timezone': _timezone,
      });
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            LinearProgressIndicator(value: (_currentPage + 1) / 3),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _WelcomePage(onNext: _nextPage),
                  _ProfilePage(
                    nameController: _nameController,
                    birthDate: _birthDate,
                    onBirthDateChanged: (d) => setState(() => _birthDate = d),
                    onNext: _nextPage,
                  ),
                  _PermissionsPage(
                    onComplete: _saving ? null : _complete,
                    saving: _saving,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _nextPage() {
    _pageController.nextPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    setState(() => _currentPage++);
  }
}

class _WelcomePage extends StatelessWidget {
  final VoidCallback onNext;

  const _WelcomePage({required this.onNext});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('✨', style: TextStyle(fontSize: 64)),
          const SizedBox(height: 24),
          Text(
            'Welcome to DRME Journal',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Your personal space for reflection, guided by numerology and astrology.',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          FilledButton(onPressed: onNext, child: const Text("Let's Begin")),
        ],
      ),
    );
  }
}

class _ProfilePage extends StatelessWidget {
  final TextEditingController nameController;
  final DateTime? birthDate;
  final ValueChanged<DateTime> onBirthDateChanged;
  final VoidCallback onNext;

  const _ProfilePage({
    required this.nameController,
    required this.birthDate,
    required this.onBirthDateChanged,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Tell Us About You',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: nameController,
            decoration: const InputDecoration(
              labelText: 'Your Name',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Theme.of(context).colorScheme.outline),
            ),
            leading: const Icon(Icons.cake_outlined),
            title: Text(
              birthDate != null
                  ? '${birthDate!.year}-${birthDate!.month.toString().padLeft(2, '0')}-${birthDate!.day.toString().padLeft(2, '0')}'
                  : 'Select Birth Date',
            ),
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime(1990),
                firstDate: DateTime(1900),
                lastDate: DateTime.now(),
              );
              if (picked != null) onBirthDateChanged(picked);
            },
          ),
          const SizedBox(height: 32),
          FilledButton(onPressed: onNext, child: const Text('Continue')),
        ],
      ),
    );
  }
}

class _PermissionsPage extends StatelessWidget {
  final VoidCallback? onComplete;
  final bool saving;

  const _PermissionsPage({required this.onComplete, required this.saving});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('🔔', style: TextStyle(fontSize: 48), textAlign: TextAlign.center),
          const SizedBox(height: 24),
          Text(
            'Enable Notifications',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Get daily reminders to journal and receive your cosmic insights.',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          FilledButton(
            onPressed: onComplete,
            child: saving
                ? const CircularProgressIndicator.adaptive()
                : const Text("I'm Ready"),
          ),
        ],
      ),
    );
  }
}
