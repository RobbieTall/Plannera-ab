import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../auth/providers/auth_provider.dart';
import '../../journal/providers/journal_provider.dart';
import '../widgets/dashboard_widgets.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(journalUserProvider);
    final todayEntries = ref.watch(todayEntriesProvider);
    final now = DateTime.now();

    return Scaffold(
      appBar: AppBar(
        title: Text(DateFormat('EEEE, MMMM d').format(now)),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => _showProfileMenu(context, ref),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(todayEntriesProvider);
          ref.invalidate(journalUserProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            user.when(
              data: (u) => u != null
                  ? WelcomeBanner(userName: u.displayName ?? u.email)
                  : const SizedBox.shrink(),
              loading: () => const ShimmerBanner(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            const NumerologyCard(),
            const SizedBox(height: 16),
            const AstrologyCard(),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Today's Entries",
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton.icon(
                  onPressed: () => context.go('/journal/new'),
                  icon: const Icon(Icons.add),
                  label: const Text('New Entry'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            todayEntries.when(
              data: (entries) => entries.isEmpty
                  ? const EmptyEntriesCard()
                  : Column(
                      children: entries
                          .map((e) => EntryListCard(entry: e))
                          .toList(),
                    ),
              loading: () => const ShimmerBanner(),
              error: (e, _) => ErrorCard(message: e.toString()),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/journal/new'),
        child: const Icon(Icons.edit_outlined),
      ),
    );
  }

  void _showProfileMenu(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sign Out'),
              onTap: () async {
                await ref.read(authServiceProvider).signOut();
                if (context.mounted) {
                  Navigator.pop(context);
                  context.go('/auth/login');
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
