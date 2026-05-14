import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../../journal/providers/journal_provider.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final authStateProvider = StreamProvider<User?>((ref) {
  return FirebaseAuth.instance.authStateChanges();
});

final journalUserProvider = FutureProvider<JournalUser?>((ref) async {
  final authState = ref.watch(authStateProvider);
  final firebaseUser = authState.valueOrNull;
  if (firebaseUser == null) return null;

  final service = ref.read(authServiceProvider);
  return service.getOrCreateJournalUser(firebaseUser);
});
