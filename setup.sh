#!/bin/bash

# Quick Start Script for Echo5 Leads Platform
# This script helps set up and run both backend and frontend

echo "🚀 Echo5 Leads Platform Setup"
echo "================================"
echo ""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check if MongoDB URI is set
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "⚠️  Backend .env file not found"
    echo "📝 Creating from example..."
    cp backend/.env.example backend/.env
    echo "✏️  Please edit backend/.env with your MongoDB credentials"
    echo ""
    read -p "Press Enter when you've configured backend/.env..."
fi

# Check if frontend env is set
if [ ! -f "frontend/.env.local" ]; then
    echo ""
    echo "⚠️  Frontend .env.local file not found"
    echo "📝 Creating from example..."
    cp frontend/.env.local.example frontend/.env.local
    echo "✏️  Please edit frontend/.env.local with your API key"
    echo "   (You can get the API key by running: cd backend && npm run seed)"
    echo ""
    read -p "Press Enter when you've configured frontend/.env.local..."
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --silent
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "==========="
echo ""
echo "1. Create a tenant and API key (first time only):"
echo "   cd backend && npm run seed"
echo ""
echo "2. Start the backend server:"
echo "   cd backend && npm run dev"
echo "   (Runs on http://localhost:3001)"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend && npm run dev"
echo "   (Runs on http://localhost:3000)"
echo ""
echo "4. Open your browser to http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   - Backend: backend/README.md"
echo "   - Frontend: frontend/README.md"
echo "   - Deployment: DEPLOYMENT_GUIDE.md"
echo ""
