-- Test multiple stream creation with the same app (gurupurnima)
-- This simulates what the fixed backend code would create

-- Clear any existing test data
DELETE FROM live_streams WHERE title LIKE '%Test Stream%';

-- Create 3 streams using the same gurupurnima app but with unique source_stream values
INSERT INTO live_streams (
  user_id, title, description, stream_key, rtmp_url, source_app, source_stream, 
  app_id, app_key_id, status, destinations, quality_settings
) VALUES 
-- Stream 1: Morning Yoga
(1, 'Morning Yoga Test Stream', 'Daily morning yoga session', 'live', 
 'rtmp://37.27.201.26:1935/gurupurnima', 'gurupurnima', 'morningyogatest',
 'f1a19f23-630f-4520-a65c-92f15289db41', '66d41382-d9b6-4328-876f-e6f95d6aaf37',
 'inactive', '[]', '{"resolution":"1920x1080","bitrate":4000,"framerate":30,"audio_bitrate":128}'),

-- Stream 2: Evening Meditation
(1, 'Evening Meditation Test Stream', 'Peaceful evening meditation', 'live',
 'rtmp://37.27.201.26:1935/gurupurnima', 'gurupurnima', 'eveningmeditationt',
 'f1a19f23-630f-4520-a65c-92f15289db41', '66d41382-d9b6-4328-876f-e6f95d6aaf37',
 'inactive', '[]', '{"resolution":"1920x1080","bitrate":4000,"framerate":30,"audio_bitrate":128}'),

-- Stream 3: Special Workshop
(1, 'Workshop Test Stream', 'Special spiritual workshop', 'live',
 'rtmp://37.27.201.26:1935/gurupurnima', 'gurupurnima', 'workshoptest',
 'f1a19f23-630f-4520-a65c-92f15289db41', '66d41382-d9b6-4328-876f-e6f95d6aaf37',
 'inactive', '[]', '{"resolution":"1920x1080","bitrate":4000,"framerate":30,"audio_bitrate":128}');

-- Verify the results
SELECT 
  ls.title,
  ls.stream_key,
  ls.rtmp_url,
  ls.source_app,
  ls.source_stream,
  sa.app_name,
  'Same RTMP endpoint, unique source_stream' AS note
FROM live_streams ls
JOIN stream_apps sa ON ls.app_id = sa.id
WHERE ls.title LIKE '%Test Stream%'
ORDER BY ls.created_at;