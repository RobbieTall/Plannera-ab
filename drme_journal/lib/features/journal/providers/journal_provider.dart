import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/local_database.dart';
import '../repositories/journal_repository.dart';

final selectedDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

final journalEntriesProvider =
    FutureProvider.family<List<LocalJournalEntry>, String>((ref, date) async {
  final repo = ref.watch(journalRepositoryProvider);
  return repo.getEntriesForDate(date);
});

final todayEntriesProvider = FutureProvider<List<LocalJournalEntry>>((ref) {
  final date = ref.watch(selectedDateProvider);
  final dateStr = date.toIso8601String().substring(0, 10);
  return ref.watch(journalEntriesProvider(dateStr).future);
});
