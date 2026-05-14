import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://your-app.vercel.app',
  );

  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  static const int maxLocalEntries = 1000;
  static const int syncBatchSize = 50;

  // Replace with your firebase_options.dart generated values
  static FirebaseOptions get firebaseOptions {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return const FirebaseOptions(
        apiKey: String.fromEnvironment('FIREBASE_IOS_API_KEY'),
        appId: String.fromEnvironment('FIREBASE_IOS_APP_ID'),
        messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
        projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
        storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
        iosBundleId: 'com.drme.journal',
      );
    }
    return const FirebaseOptions(
      apiKey: String.fromEnvironment('FIREBASE_ANDROID_API_KEY'),
      appId: String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
      messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
      projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
      storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
    );
  }
}
