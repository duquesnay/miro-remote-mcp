#!/bin/bash

# Deploy MCP Miro to Scaleway Serverless Functions (Private)
# Usage: ./deploy-scaleway-functions.sh

set -e

# Configuration
NAMESPACE_NAME="fly-agile-api"
FUNCTION_NAME="mcp-miro-function"
REGION="fr-par"
RUNTIME="node20"
MEMORY_LIMIT="1024"  # MB
TIMEOUT="30s"
MIN_SCALE="0"        # Scale to zero when not used
MAX_SCALE="3"        # Maximum instances

echo "🚀 Deploying MCP Miro to Scaleway Serverless Functions (Private)..."

# Check if scw CLI is installed
if ! command -v scw &> /dev/null; then
    echo "❌ Scaleway CLI not found. Please install it first:"
    echo "   curl -s https://raw.githubusercontent.com/scaleway/scaleway-cli/master/scripts/get.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! scw config get access-key &> /dev/null; then
    echo "❌ Please configure Scaleway CLI first:"
    echo "   scw config set access-key=YOUR_ACCESS_KEY"
    echo "   scw config set secret-key=YOUR_SECRET_KEY"
    echo "   scw config set default-organization-id=YOUR_ORG_ID"
    exit 1
fi

# Check if .env file exists with Miro credentials
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo "   Please create .env file with:"
    echo "   MIRO_CLIENT_ID=your_client_id"
    echo "   MIRO_CLIENT_SECRET=your_client_secret"
    echo "   MIRO_ACCESS_TOKEN=your_access_token"
    echo "   MIRO_REFRESH_TOKEN=your_refresh_token (optional)"
    exit 1
fi

# Load environment variables
echo "📋 Loading environment variables from .env"
export $(cat .env | grep -v '^#' | xargs)

# Validate required environment variables
if [ -z "$MIRO_CLIENT_ID" ] || [ -z "$MIRO_CLIENT_SECRET" ] || [ -z "$MIRO_ACCESS_TOKEN" ]; then
    echo "❌ Missing required environment variables in .env:"
    echo "   MIRO_CLIENT_ID"
    echo "   MIRO_CLIENT_SECRET"
    echo "   MIRO_ACCESS_TOKEN"
    exit 1
fi

# Encode Miro OAuth credentials as base64
echo "🔐 Encoding Miro OAuth credentials..."
MIRO_CLIENT_ID_B64=$(echo -n "$MIRO_CLIENT_ID" | base64)
MIRO_CLIENT_SECRET_B64=$(echo -n "$MIRO_CLIENT_SECRET" | base64)
MIRO_ACCESS_TOKEN_B64=$(echo -n "$MIRO_ACCESS_TOKEN" | base64)

# Encode refresh token if present (optional for long-lived tokens)
if [ -n "$MIRO_REFRESH_TOKEN" ]; then
    MIRO_REFRESH_TOKEN_B64=$(echo -n "$MIRO_REFRESH_TOKEN" | base64)
    echo "   ✅ Refresh token encoded"
else
    MIRO_REFRESH_TOKEN_B64=""
    echo "   ⚠️  No refresh token provided (acceptable for long-lived tokens)"
fi

# Step 1: Use existing fly-agile-api namespace
echo "📦 Using existing namespace '$NAMESPACE_NAME'..."

# Get the existing namespace ID for Functions (different from Containers)
NAMESPACE_ID="122192a9-8e74-4078-8364-f8e29f996cdc"
echo "   Using namespace: $NAMESPACE_ID"

if [ "$NAMESPACE_ID" = "null" ] || [ -z "$NAMESPACE_ID" ]; then
    echo "❌ Failed to get namespace"
    exit 1
fi

echo "✅ Namespace ID: $NAMESPACE_ID"

# Step 2: Package function code
echo "📦 Packaging function code..."
rm -f function.zip

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install --production
fi

# Build TypeScript code
echo "🔨 Building TypeScript code..."
npm run build

if [ ! -f "dist/functions-handler.js" ]; then
    echo "❌ TypeScript build failed - dist/functions-handler.js not found"
    exit 1
fi

# Create the zip package
echo "📦 Creating ZIP package..."
zip -r function.zip package.json dist/ node_modules/ -x "*.git*" "*.DS_Store*" "test*" "*.md"

if [ ! -f "function.zip" ]; then
    echo "❌ Failed to create function.zip"
    exit 1
fi

echo "✅ Function package created: $(ls -lh function.zip | awk '{print $5}')"

# Step 3: Check for existing function
echo "🏗️  Checking for existing function '$FUNCTION_NAME' in namespace '$NAMESPACE_ID'..."
EXISTING_FUNCTION_ID=$(scw function function list \
    namespace-id="$NAMESPACE_ID" \
    region="$REGION" \
    --output=json | jq -r --arg FNAME "$FUNCTION_NAME" '.[] | select(.name == $FNAME) | .id // empty')

# Build environment variables array for Scaleway CLI
ENV_VARS="environment-variables.0.key=MIRO_REDIRECT_URI"
ENV_VARS="$ENV_VARS environment-variables.0.value=http://localhost:3000/callback"

# Build secret environment variables array
SECRET_VARS="secret-environment-variables.0.key=MIRO_CLIENT_ID_B64"
SECRET_VARS="$SECRET_VARS secret-environment-variables.0.value=$MIRO_CLIENT_ID_B64"
SECRET_VARS="$SECRET_VARS secret-environment-variables.1.key=MIRO_CLIENT_SECRET_B64"
SECRET_VARS="$SECRET_VARS secret-environment-variables.1.value=$MIRO_CLIENT_SECRET_B64"
SECRET_VARS="$SECRET_VARS secret-environment-variables.2.key=MIRO_ACCESS_TOKEN_B64"
SECRET_VARS="$SECRET_VARS secret-environment-variables.2.value=$MIRO_ACCESS_TOKEN_B64"

# Add refresh token if present
if [ -n "$MIRO_REFRESH_TOKEN_B64" ]; then
    SECRET_VARS="$SECRET_VARS secret-environment-variables.3.key=MIRO_REFRESH_TOKEN_B64"
    SECRET_VARS="$SECRET_VARS secret-environment-variables.3.value=$MIRO_REFRESH_TOKEN_B64"
fi

if [ -n "$EXISTING_FUNCTION_ID" ]; then
    echo "Found existing function ID: $EXISTING_FUNCTION_ID. Updating it..."

    # Update the function (without zip-file - that's done in deploy step)
    scw function function update \
        function-id="$EXISTING_FUNCTION_ID" \
        handler="dist/functions-handler.handler" \
        runtime="$RUNTIME" \
        memory-limit="$MEMORY_LIMIT" \
        timeout="$TIMEOUT" \
        min-scale="$MIN_SCALE" \
        max-scale="$MAX_SCALE" \
        privacy="private" \
        $ENV_VARS \
        $SECRET_VARS \
        region="$REGION"

    if [ $? -ne 0 ]; then
        echo "❌ Failed to update function"
        exit 1
    fi
    FUNCTION_ID="$EXISTING_FUNCTION_ID"
    echo "✅ Function configuration updated."
else
    echo "Function '$FUNCTION_NAME' not found. Creating new function..."

    # Create the function
    FUNCTION_ID=$(scw function function create \
        namespace-id="$NAMESPACE_ID" \
        name="$FUNCTION_NAME" \
        zip-file="function.zip" \
        handler="dist/functions-handler.handler" \
        runtime="$RUNTIME" \
        memory-limit="$MEMORY_LIMIT" \
        timeout="$TIMEOUT" \
        min-scale="$MIN_SCALE" \
        max-scale="$MAX_SCALE" \
        privacy="private" \
        $ENV_VARS \
        $SECRET_VARS \
        region="$REGION" \
        --output=json | jq -r '.id')

    if [ "$FUNCTION_ID" = "null" ] || [ -z "$FUNCTION_ID" ]; then
        echo "❌ Failed to create function"
        exit 1
    fi
    echo "✅ Function created with ID: $FUNCTION_ID"
fi

# Step 4: Upload and deploy the function with new code
echo "🚀 Uploading TypeScript function code..."

# Get file size for upload
FILE_SIZE=$(stat -f%z function.zip 2>/dev/null || stat -c%s function.zip)

# Get upload URL
UPLOAD_INFO=$(scw function function get-upload-url \
    function-id="$FUNCTION_ID" \
    content-length="$FILE_SIZE" \
    region="$REGION" \
    --output=json)

UPLOAD_URL=$(echo "$UPLOAD_INFO" | jq -r '.url')

if [ "$UPLOAD_URL" = "null" ] || [ -z "$UPLOAD_URL" ]; then
    echo "❌ Failed to get upload URL"
    exit 1
fi

# Upload the function code
echo "📤 Uploading function code..."
curl -X PUT -T function.zip "$UPLOAD_URL"

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload function code"
    exit 1
fi

echo "🚀 Deploying function..."
scw function function deploy \
    function-id="$FUNCTION_ID" \
    region="$REGION"

# Step 5: Create authentication token for private access
echo "🔐 Creating authentication token for private access..."

# Create token and capture its full JSON output
TOKEN_CREATE_OUTPUT=$(scw function token create \
    function-id="$FUNCTION_ID" \
    description="API access token" \
    region="$REGION" \
    --output=json)

# Check if token creation was successful and output is not empty
if [ -z "$TOKEN_CREATE_OUTPUT" ] || [ "$(echo "$TOKEN_CREATE_OUTPUT" | jq -r '.id // empty')" = "" ]; then
    echo "❌ Failed to create token or received empty output."
    echo "   Raw output: $TOKEN_CREATE_OUTPUT"
    exit 1
fi

# Extract ID and Token value from the creation output
TOKEN_ID=$(echo "$TOKEN_CREATE_OUTPUT" | jq -r '.id')
TOKEN_VALUE=$(echo "$TOKEN_CREATE_OUTPUT" | jq -r '.token')

# Check if the token value is still '<hidden>' or empty, which would indicate an issue
if [ "$TOKEN_VALUE" = "<hidden>" ] || [ "$TOKEN_VALUE" = "null" ] || [ -z "$TOKEN_VALUE" ]; then
    echo "❌ Token value is still hidden or empty after creation."
    echo "   Token ID: $TOKEN_ID"
    echo "   Raw creation output: $TOKEN_CREATE_OUTPUT"
    echo "   This might indicate an issue with Scaleway CLI or permissions."
    exit 1
fi

echo "✅ Authentication token created"

# Step 6: Get function URL
echo "🌐 Getting function information..."
FUNCTION_INFO=$(scw function function get \
    function-id="$FUNCTION_ID" \
    region="$REGION" \
    --output=json)

FUNCTION_URL=$(echo "$FUNCTION_INFO" | jq -r '.domain_name')
FUNCTION_STATUS=$(echo "$FUNCTION_INFO" | jq -r '.status')

echo "✅ Deployment completed!"
echo ""
echo "📋 Function Information:"
echo "   Namespace ID: $NAMESPACE_ID"
echo "   Function ID: $FUNCTION_ID"
echo "   URL: https://$FUNCTION_URL"
echo "   Status: $FUNCTION_STATUS"
echo "   Privacy: Private (requires authentication token)"
echo ""
echo "🔐 Authentication:"
echo "   Token ID: $TOKEN_ID"
echo "   Token: $TOKEN_VALUE"
echo ""
echo "💾 Saving token to .scaleway-token file..."
echo "$TOKEN_VALUE" > .scaleway-token
echo "   Token saved to .scaleway-token"
echo ""
echo "🧪 Test your deployment:"
echo "   # Health check:"
echo "   curl -H 'X-Auth-Token: $TOKEN_VALUE' \\"
echo "     https://$FUNCTION_URL/health"
echo ""
echo "   # List available tools:"
echo "   curl -H 'X-Auth-Token: $TOKEN_VALUE' \\"
echo "     https://$FUNCTION_URL/tools"
echo ""
echo "   # Call list_boards tool:"
echo "   curl -H 'X-Auth-Token: $TOKEN_VALUE' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -X POST https://$FUNCTION_URL/tools/call \\"
echo "     -d '{\"name\": \"list_boards\", \"arguments\": {}}'"
echo ""
echo "💡 Next steps:"
echo "   1. Test the endpoints with your authentication token"
echo "   2. Configure your MCP clients to use the private URL with token"
echo "   3. Monitor usage in Scaleway console"
echo ""
echo "📄 Save this information for your records:"
cat > deployment-info.json << EOF
{
  "namespace_id": "$NAMESPACE_ID",
  "function_id": "$FUNCTION_ID",
  "token_id": "$TOKEN_ID",
  "url": "https://$FUNCTION_URL",
  "token": "$TOKEN_VALUE",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "   Deployment info saved to deployment-info.json"

# Cleanup
rm -f function.zip
echo "🧹 Cleaned up temporary files"
