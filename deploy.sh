#!/bin/bash

echo "======================================"
echo "   PDF Field Extractor - Deploy Helper"
echo "======================================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - PDF Field Extractor"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already initialized"
fi

# Check if remote is set
if ! git remote | grep -q origin; then
    echo ""
    echo "⚠️  No git remote found!"
    echo ""
    echo "Please create a repository on GitHub:"
    echo "1. Go to https://github.com/new"
    echo "2. Create a repository named 'pdf-field-extractor'"
    echo "3. Don't initialize with README"
    echo "4. Run this command with your username:"
    echo ""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/pdf-field-extractor.git"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Git remote configured"

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo ""
    echo "Found uncommitted changes. Committing..."
    git add .
    echo "Enter commit message (or press Enter for default):"
    read -r message
    if [ -z "$message" ]; then
        message="Update PDF Field Extractor"
    fi
    git commit -m "$message"
    echo "✅ Changes committed"
fi

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
git push -u origin main || git push -u origin master

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "======================================"
echo "   NEXT STEPS - Deploy to Render"
echo "======================================"
echo ""
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Use these settings:"
echo "   - Runtime: Docker"
echo "   - Instance Type: Free"
echo "   - Docker Build Context: ."
echo "   - Dockerfile Path: ./Dockerfile"
echo ""
echo "5. Click 'Create Web Service'"
echo ""
echo "Your app will be live in about 5 minutes!"
echo ""
echo "======================================"