import 'package:freezed_annotation/freezed_annotation.dart';

part 'journal_entry_model.freezed.dart';
part 'journal_entry_model.g.dart';

@freezed
class JournalEntry with _$JournalEntry {
  const factory JournalEntry({
    required String id,
    required String userId,
    String? title,
    required String content,
    int? mood,
    int? energy,
    @Default([]) List<String> tags,
    required String entryDate,
    int? numerologyDay,
    String? moonPhase,
    String? syncedAt,
    required String createdAt,
    required String updatedAt,
  }) = _JournalEntry;

  factory JournalEntry.fromJson(Map<String, dynamic> json) =>
      _$JournalEntryFromJson(json);
}

@freezed
class JournalEntriesResponse with _$JournalEntriesResponse {
  const factory JournalEntriesResponse({
    required List<JournalEntry> entries,
    required int total,
  }) = _JournalEntriesResponse;

  factory JournalEntriesResponse.fromJson(Map<String, dynamic> json) =>
      _$JournalEntriesResponseFromJson(json);
}
