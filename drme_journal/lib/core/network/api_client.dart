import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../../features/auth/models/user_model.dart';
import '../../features/journal/models/journal_entry_model.dart';

part 'api_client.g.dart';

@RestApi()
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  @GET('/api/journal-users')
  Future<JournalUser> getUser();

  @POST('/api/journal-users')
  Future<JournalUser> createUser(@Body() Map<String, dynamic> body);

  @PATCH('/api/journal-users')
  Future<JournalUser> updateUser(@Body() Map<String, dynamic> body);

  @GET('/api/journal')
  Future<JournalEntriesResponse> getJournalEntries({
    @Query('from') String? from,
    @Query('to') String? to,
    @Query('limit') int? limit,
    @Query('offset') int? offset,
  });

  @POST('/api/journal')
  Future<JournalEntry> createJournalEntry(@Body() Map<String, dynamic> body);

  @PATCH('/api/journal/{id}')
  Future<JournalEntry> updateJournalEntry(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @DELETE('/api/journal/{id}')
  Future<void> deleteJournalEntry(@Path('id') String id);

  @GET('/api/numerology')
  Future<Map<String, dynamic>> getNumerology({
    @Query('date') String? date,
  });

  @GET('/api/astrology')
  Future<Map<String, dynamic>> getAstrology({
    @Query('date') String? date,
  });

  @GET('/api/insights')
  Future<Map<String, dynamic>> getInsights({
    @Query('limit') int? limit,
    @Query('offset') int? offset,
    @Query('unread') bool? unreadOnly,
  });

  @POST('/api/insights/generate')
  Future<Map<String, dynamic>> generateInsight(@Body() Map<String, dynamic> body);

  @GET('/api/patterns')
  Future<Map<String, dynamic>> getPatterns();

  @POST('/api/patterns')
  Future<Map<String, dynamic>> analyzePatterns();

  @GET('/api/health')
  Future<Map<String, dynamic>> healthCheck();
}
