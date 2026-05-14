import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'dart:io';

part 'local_database.g.dart';

class LocalJournalEntries extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get title => text().nullable()();
  TextColumn get content => text()();
  IntColumn get mood => integer().nullable()();
  IntColumn get energy => integer().nullable()();
  TextColumn get tags => text().withDefault(const Constant('[]'))();
  TextColumn get entryDate => text()();
  TextColumn get moonPhase => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class LocalInsights extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get entryId => text().nullable()();
  TextColumn get type => text()();
  TextColumn get title => text()();
  TextColumn get content => text()();
  BoolColumn get isRead => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [LocalJournalEntries, LocalInsights])
class LocalDatabase extends _$LocalDatabase {
  LocalDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  Future<List<LocalJournalEntry>> getEntriesForDate(String date) =>
      (select(localJournalEntries)
            ..where((t) => t.entryDate.equals(date))
            ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
          .get();

  Future<List<LocalJournalEntry>> getUnsyncedEntries({int batchSize = 50}) =>
      (select(localJournalEntries)
            ..where((t) => t.isSynced.equals(false))
            ..limit(batchSize))
          .get();

  Future<void> upsertEntry(LocalJournalEntriesCompanion entry) async {
    await into(localJournalEntries).insertOnConflictUpdate(entry);
  }

  Future<void> markSynced(String id) async {
    await (update(localJournalEntries)..where((t) => t.id.equals(id)))
        .write(const LocalJournalEntriesCompanion(isSynced: Value(true)));
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'drme_journal.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
