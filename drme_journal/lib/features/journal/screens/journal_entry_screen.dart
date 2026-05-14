import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/journal_provider.dart';
import '../repositories/journal_repository.dart';
import '../../auth/providers/auth_provider.dart';

class JournalEntryScreen extends ConsumerStatefulWidget {
  final String? entryId;

  const JournalEntryScreen({super.key, this.entryId});

  @override
  ConsumerState<JournalEntryScreen> createState() => _JournalEntryScreenState();
}

class _JournalEntryScreenState extends ConsumerState<JournalEntryScreen> {
  final _contentController = TextEditingController();
  final _titleController = TextEditingController();
  int? _mood;
  int? _energy;
  bool _saving = false;

  bool get isEditing => widget.entryId != null;

  @override
  void dispose() {
    _contentController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something first')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final user = ref.read(journalUserProvider).valueOrNull;
      if (user == null) throw Exception('Not authenticated');

      final repo = ref.read(journalRepositoryProvider);
      await repo.createEntry(
        userId: user.id,
        content: content,
        title: _titleController.text.trim().isNotEmpty
            ? _titleController.text.trim()
            : null,
        mood: _mood,
        energy: _energy,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Entry saved')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving entry: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Entry' : 'New Entry'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              hintText: 'Title (optional)',
              border: InputBorder.none,
            ),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const Divider(),
          const SizedBox(height: 8),
          TextField(
            controller: _contentController,
            maxLines: null,
            minLines: 10,
            decoration: const InputDecoration(
              hintText: 'What\'s on your mind today?',
              border: InputBorder.none,
            ),
          ),
          const SizedBox(height: 24),
          _MoodSelector(
            label: 'Mood',
            value: _mood,
            onChanged: (v) => setState(() => _mood = v),
          ),
          const SizedBox(height: 16),
          _MoodSelector(
            label: 'Energy',
            value: _energy,
            onChanged: (v) => setState(() => _energy = v),
          ),
        ],
      ),
    );
  }
}

class _MoodSelector extends StatelessWidget {
  final String label;
  final int? value;
  final ValueChanged<int?> onChanged;

  const _MoodSelector({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(10, (i) {
            final rating = i + 1;
            return GestureDetector(
              onTap: () => onChanged(value == rating ? null : rating),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: value == rating
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.surfaceVariant,
                child: Text(
                  '$rating',
                  style: TextStyle(
                    color: value == rating
                        ? Theme.of(context).colorScheme.onPrimary
                        : null,
                    fontSize: 12,
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
