#!/bin/bash

# Vi-Notes Frontend Setup Script
echo "🚀 Setting up Vi-Notes Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
REACT_APP_API_URL=http://localhost:5000/api
EOL
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure your backend is running on http://localhost:5000"
echo "2. Start the development server:"
echo "   npm start"
echo ""
echo "3. For Electron app (optional):"
echo "   npm run electron-dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "📱 Register a new account or login to get started!"
