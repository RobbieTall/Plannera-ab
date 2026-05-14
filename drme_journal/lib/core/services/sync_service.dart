import 'dart:convert' show jsonDecode;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../database/local_database.dart';
import '../network/api_client.dart';
import '../network/dio_provider.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.watch(localDatabaseProvider);
  final api = ref.watch(apiClientProvider);
  return SyncService(db, api);
});

final localDatabaseProvider = Provider<LocalDatabase>((ref) {
  final db = LocalDatabase();
  ref.onDispose(db.close);
  return db;
});

class SyncService {
  final LocalDatabase _db;
  final ApiClient _api;

  SyncService(this._db, this._api);

  // connectivity_plus v5+ returns List<ConnectivityResult>.
  // The device is offline only when every result is none.
  Future<bool> _isOffline() async {
    final results = await Connectivity().checkConnectivity();
    return results.every((r) => r == ConnectivityResult.none);
  }

  Future<void> syncPendingEntries() async {
    if (await _isOffline()) return;

    final unsynced = await _db.getUnsyncedEntries();
    for (final entry in unsynced) {
      try {
        final tags = (jsonDecode(entry.tags) as List).cast<String>();
        await _api.createJournalEntry({
          'id': entry.id,
          'title': entry.title,
          'content': entry.content,
          'mood': entry.mood,
          'energy': entry.energy,
          'entryDate': entry.entryDate,
          'tags': tags,
        });
        await _db.markSynced(entry.id);
      } catch (_) {
        // Will retry on next sync
      }
    }
  }

  Future<void> pullRemoteEntries() async {
    if (await _isOffline()) return;

    try {
      final response = await _api.getJournalEntries(limit: 50);
      for (final entry in response.entries) {
        await _db.upsertEntry(LocalJournalEntriesCompanion.insert(
          id: entry.id,
          userId: entry.userId,
          title: Value(entry.title),
          content: entry.content,
          mood: Value(entry.mood),
          energy: Value(entry.energy),
          entryDate: entry.entryDate,
          moonPhase: Value(entry.moonPhase),
          isSynced: const Value(true),
          createdAt: DateTime.parse(entry.createdAt),
          updatedAt: DateTime.parse(entry.updatedAt),
        ));
      }
    } catch (_) {
      // Network error — continue with local data
    }
  }
}
