import 'dart:async' show unawaited;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/local_database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/services/sync_service.dart';
import '../models/journal_entry_model.dart';

final journalRepositoryProvider = Provider<JournalRepository>((ref) {
  final db = ref.watch(localDatabaseProvider);
  final api = ref.watch(apiClientProvider);
  final sync = ref.watch(syncServiceProvider);
  return JournalRepository(db, api, sync);
});

class JournalRepository {
  final LocalDatabase _db;
  final ApiClient _api;
  final SyncService _sync;
  static const _uuid = Uuid();

  JournalRepository(this._db, this._api, this._sync);

  Future<List<LocalJournalEntry>> getEntriesForDate(String date) =>
      _db.getEntriesForDate(date);

  Future<LocalJournalEntry> createEntry({
    required String userId,
    required String content,
    String? title,
    int? mood,
    int? energy,
    List<String> tags = const [],
    String? entryDate,
  }) async {
    final id = _uuid.v4();
    final date = entryDate ?? DateTime.now().toIso8601String().substring(0, 10);
    final now = DateTime.now();

    final companion = LocalJournalEntriesCompanion.insert(
      id: id,
      userId: userId,
      title: Value(title),
      content: content,
      mood: Value(mood),
      energy: Value(energy),
      tags: Value(tags.toString()),
      entryDate: date,
      isSynced: const Value(false),
      createdAt: now,
      updatedAt: now,
    );

    await _db.upsertEntry(companion);
    unawaited(_sync.syncPendingEntries());

    return (await _db.getEntriesForDate(date))
        .firstWhere((e) => e.id == id);
  }

  Future<void> syncAll() async {
    await _sync.syncPendingEntries();
    await _sync.pullRemoteEntries();
  }
}
