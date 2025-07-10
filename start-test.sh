#!/bin/bash

echo "🎬 Starting Live Streaming Test"
echo "==============================="

# Check if ports are available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3001 is already in use"
else
    echo "✅ Port 3001 is available"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use"
else
    echo "✅ Port 3000 is available"
fi

echo ""
echo "🚀 Starting backend server..."
echo "📍 Backend will run on: http://localhost:3001"

# Start backend in background
NODE_ENV=development npm start &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"
sleep 3

echo ""
echo "🚀 Starting frontend..."
echo "📍 Frontend will run on: http://localhost:3000"
echo ""
echo "🎯 To test live streaming:"
echo "1. Open: http://localhost:3000"
echo "2. Navigate to: Live Streaming"
echo "3. Click: Create Stream"
echo "4. Test: OBS Setup button"
echo ""
echo "Press Ctrl+C to stop both servers"

# Start frontend
cd client && npm start

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

trap cleanup INT