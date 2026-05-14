import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

@freezed
class JournalUser with _$JournalUser {
  const factory JournalUser({
    required String id,
    required String firebaseUid,
    required String email,
    String? displayName,
    String? birthDate,
    @Default('UTC') String timezone,
    int? lifePath,
    int? soulUrge,
    int? expression,
    String? sunSign,
    String? moonSign,
    String? risingSign,
    @Default(true) bool notificationsEnabled,
    required String createdAt,
    required String updatedAt,
  }) = _JournalUser;

  factory JournalUser.fromJson(Map<String, dynamic> json) =>
      _$JournalUserFromJson(json);
}
