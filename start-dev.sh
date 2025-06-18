#!/bin/bash

echo "🚀 Starting Boligplattform Development Servers..."

# Check if both directories exist
if [ ! -d "apps/web" ]; then
    echo "❌ apps/web directory not found"
    exit 1
fi

if [ ! -d "apps/api/finn-scraper" ]; then
    echo "❌ apps/api/finn-scraper directory not found"
    exit 1
fi

# Function to cleanup processes
cleanup() {
    echo "🛑 Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Start API server
echo "🔧 Starting API server..."
cd apps/api/finn-scraper
npm start &
API_PID=$!
cd - > /dev/null

# Wait a moment for API to start
sleep 2

# Start web server
echo "🌐 Starting web server..."
cd apps/web
npm run dev &
WEB_PID=$!
cd - > /dev/null

echo "✅ Both servers started successfully!"
echo ""
echo "📱 Web app: http://localhost:5173"
echo "🔧 API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait 