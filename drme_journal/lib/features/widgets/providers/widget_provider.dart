import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../models/widget_config_model.dart';

final widgetConfigProvider =
    AsyncNotifierProvider<WidgetConfigNotifier, List<WidgetConfig>>(
        WidgetConfigNotifier.new);

class WidgetConfigNotifier extends AsyncNotifier<List<WidgetConfig>> {
  static const _key = 'widget_configs';

  @override
  Future<List<WidgetConfig>> build() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_key);
    if (stored == null) return _defaults;

    final list = (jsonDecode(stored) as List)
        .map((e) => WidgetConfig.fromJson(e as Map<String, dynamic>))
        .toList();
    return list;
  }

  Future<void> toggle(String id) async {
    final current = state.valueOrNull ?? [];
    final updated = current.map((w) {
      return w.id == id ? w.copyWith(isEnabled: !w.isEnabled) : w;
    }).toList();
    state = AsyncData(updated);
    await _persist(updated);
  }

  Future<void> _persist(List<WidgetConfig> configs) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(configs.map((c) => c.toJson()).toList()),
    );
  }

  static final _defaults = [
    const WidgetConfig(id: 'numerology', type: WidgetType.numerology),
    const WidgetConfig(id: 'astrology', type: WidgetType.astrology),
    const WidgetConfig(id: 'mood', type: WidgetType.moodTracker),
    const WidgetConfig(id: 'streak', type: WidgetType.journalStreak),
  ];
}
