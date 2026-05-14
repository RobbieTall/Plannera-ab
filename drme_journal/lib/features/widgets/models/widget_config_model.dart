import 'package:freezed_annotation/freezed_annotation.dart';

part 'widget_config_model.freezed.dart';
part 'widget_config_model.g.dart';

enum WidgetType { numerology, astrology, moodTracker, journalStreak }

@freezed
class WidgetConfig with _$WidgetConfig {
  const factory WidgetConfig({
    required String id,
    required WidgetType type,
    @Default(true) bool isEnabled,
    @Default({}) Map<String, dynamic> settings,
  }) = _WidgetConfig;

  factory WidgetConfig.fromJson(Map<String, dynamic> json) =>
      _$WidgetConfigFromJson(json);
}
