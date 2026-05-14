import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import '../../../core/database/local_database.dart';
import '../../../core/network/dio_provider.dart';

// Providers for dashboard data
final numerologyProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getNumerology();
});

final astrologyProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getAstrology();
});

class WelcomeBanner extends StatelessWidget {
  final String userName;

  const WelcomeBanner({super.key, required this.userName});

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$greeting, $userName ✨',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'How are you feeling today?',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class NumerologyCard extends ConsumerWidget {
  const NumerologyCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final numerology = ref.watch(numerologyProvider);

    return numerology.when(
      data: (data) => _buildCard(context, data),
      loading: () => const ShimmerBanner(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildCard(BuildContext context, Map<String, dynamic> data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('🔢', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Text(
                  'Numerology',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _NumberChip(
                  label: 'Life Path',
                  value: '${data['lifePath'] ?? '?'}',
                ),
                const SizedBox(width: 8),
                _NumberChip(
                  label: 'Personal Day',
                  value: '${data['personalDay'] ?? '?'}',
                ),
              ],
            ),
            if (data['personalDayMeaning'] != null) ...[
              const SizedBox(height: 8),
              Text(
                data['personalDayMeaning'] as String,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _NumberChip extends StatelessWidget {
  final String label;
  final String value;

  const _NumberChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold)),
          Text(label, style: Theme.of(context).textTheme.labelSmall),
        ],
      ),
    );
  }
}

class AstrologyCard extends ConsumerWidget {
  const AstrologyCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final astrology = ref.watch(astrologyProvider);

    return astrology.when(
      data: (data) => _buildCard(context, data),
      loading: () => const ShimmerBanner(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildCard(BuildContext context, Map<String, dynamic> data) {
    final moonPhase = data['moonPhase'] as Map<String, dynamic>?;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  moonPhase?['emoji'] as String? ?? '🌙',
                  style: const TextStyle(fontSize: 20),
                ),
                const SizedBox(width: 8),
                Text(
                  'Astrology',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (data['sunSign'] != null)
              Text('Sun Sign: ${data['sunSign']}',
                  style: Theme.of(context).textTheme.bodyMedium),
            if (moonPhase != null)
              Text('Moon: ${moonPhase['phase']}',
                  style: Theme.of(context).textTheme.bodyMedium),
            if (data['dailyGuidance'] != null) ...[
              const SizedBox(height: 8),
              Text(
                data['dailyGuidance'] as String,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EntryListCard extends StatelessWidget {
  final LocalJournalEntry entry;

  const EntryListCard({super.key, required this.entry});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(
          entry.title ?? 'Untitled',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          entry.content,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: entry.mood != null
            ? Text('${entry.mood}/10',
                style: Theme.of(context).textTheme.bodySmall)
            : null,
      ),
    );
  }
}

class EmptyEntriesCard extends StatelessWidget {
  const EmptyEntriesCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text('📓', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 8),
            Text(
              'No entries yet today',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Start journaling to get cosmic insights',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class ShimmerBanner extends StatelessWidget {
  const ShimmerBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Theme.of(context).colorScheme.surfaceVariant,
      highlightColor: Theme.of(context).colorScheme.surface,
      child: Container(
        height: 80,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

class ErrorCard extends StatelessWidget {
  final String message;

  const ErrorCard({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          message,
          style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
        ),
      ),
    );
  }
}
