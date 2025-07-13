require('dotenv').config();
const pool = require('./server/src/config/database');

// Simple stream detection for when stats API is not available
async function detectActiveStreams() {
  try {
    console.log('🔍 Checking for active streams...');
    
    // Get all streams that should be monitored
    const streams = await pool.query(`
      SELECT id, title, stream_key, status, created_at 
      FROM live_streams 
      WHERE status IN ('created', 'live')
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${streams.rows.length} streams to monitor:`);
    
    for (const stream of streams.rows) {
      console.log(`- Stream ${stream.id}: "${stream.title}" (${stream.status})`);
      console.log(`  Key: ${stream.stream_key}`);
      console.log(`  Created: ${stream.created_at}`);
      
      // Check if there are any sessions for this stream
      const sessions = await pool.query(`
        SELECT id, status, started_at, ended_at 
        FROM stream_sessions 
        WHERE stream_id = $1 
        ORDER BY started_at DESC 
        LIMIT 1
      `, [stream.id]);
      
      if (sessions.rows.length > 0) {
        const session = sessions.rows[0];
        console.log(`  Latest session: ${session.status} (started: ${session.started_at})`);
      } else {
        console.log(`  No sessions found`);
      }
      console.log('');
    }
    
    return streams.rows;
  } catch (error) {
    console.error('Error detecting streams:', error);
    return [];
  }
}

// Test the detection
detectActiveStreams().then(() => {
  console.log('✅ Stream detection test completed');
  process.exit(0);
});