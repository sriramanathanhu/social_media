#!/bin/bash

echo "🎬 Quick Nimble Streamer Setup for macOS"
echo "========================================"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Installing Homebrew first..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Nimble Streamer
echo "📦 Installing Nimble Streamer..."
brew tap softvelum/nimble
brew install nimble-streamer

# Create nimble directory and config
echo "📁 Setting up Nimble configuration..."
mkdir -p nimble
touch nimble/rules.conf

# Set up environment variables
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📄 Created .env file from template"
fi

# Update .env with Nimble settings
echo "🔧 Configuring Nimble settings in .env..."
if ! grep -q "NIMBLE_HOST" .env; then
    echo "" >> .env
    echo "# Nimble Streamer Configuration" >> .env
    echo "NIMBLE_HOST=localhost" >> .env
    echo "NIMBLE_PORT=1935" >> .env
    echo "NIMBLE_STATS_PORT=8082" >> .env
    echo "NIMBLE_CONFIG_PATH=$(pwd)/nimble/rules.conf" >> .env
fi

echo "✅ Nimble Streamer setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start Nimble: brew services start nimble-streamer"
echo "2. Start your app: npm run dev (in server directory)"
echo "3. Open browser: http://localhost:3000"
echo "4. Go to Live Streaming section"
echo ""
echo "📋 For detailed setup, see: NIMBLE_SETUP.md"