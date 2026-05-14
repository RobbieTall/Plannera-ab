import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/models/user_model.dart';
import '../../../core/network/dio_provider.dart';

class AuthService {
  final _auth = FirebaseAuth.instance;

  Future<UserCredential> signInWithEmail(String email, String password) =>
      _auth.signInWithEmailAndPassword(email: email, password: password);

  Future<UserCredential> signUpWithEmail(String email, String password) =>
      _auth.createUserWithEmailAndPassword(email: email, password: password);

  Future<void> signOut() => _auth.signOut();

  Future<void> sendPasswordReset(String email) =>
      _auth.sendPasswordResetEmail(email: email);

  Future<JournalUser> getOrCreateJournalUser(User firebaseUser) async {
    // This will be called from a provider — it needs access to the API client
    // handled via the network layer
    throw UnimplementedError('Use getOrCreateJournalUserFromRef');
  }
}

// Extension used with Ref for API access
extension AuthServiceRef on AuthService {
  Future<JournalUser> getOrCreateJournalUserFromRef(
    User firebaseUser,
    Ref ref,
  ) async {
    final api = ref.read(apiClientProvider);
    try {
      return await api.getUser();
    } catch (_) {
      return api.createUser({
        'displayName': firebaseUser.displayName,
        'email': firebaseUser.email,
      });
    }
  }
}
