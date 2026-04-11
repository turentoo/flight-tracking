#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (can be overridden by environment variables)
IMAGE_NAME="${DOCKER_IMAGE:-ghcr.io/turentoo/flight-tracking}"
GIT_REPO="${GIT_REPOSITORY:-https://github.com/turentoo/flight-tracking.git}"

# Parse command line arguments
CUSTOM_TAG=""
DEPLOY=false
REMOTE_BUILD=false
REMOTE_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-}"
SSH_KEY="${SSH_KEY:-}"
HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      CUSTOM_TAG="$2"
      shift 2
      ;;
    --deploy)
      DEPLOY=true
      shift
      ;;
    --remote-build)
      REMOTE_BUILD=true
      shift
      ;;
    --remote-host)
      REMOTE_HOST="$2"
      shift 2
      ;;
    --deploy-path)
      DEPLOY_PATH="$2"
      shift 2
      ;;
    --ssh-key)
      SSH_KEY="$2"
      shift 2
      ;;
    --help)
      HELP=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      HELP=true
      shift
      ;;
  esac
done

# Show help
if [ "$HELP" = true ]; then
  cat <<EOF
Usage: ./deploy.sh [OPTIONS]

Build and deploy Docker image for flight-tracking application.

BUILD MODES:
  Local Build (default):
    - Builds Docker image locally
    - Pushes to GitHub Container Registry (GHCR)
    - Requires Docker installed and GHCR authentication

  Remote Build (--remote-build):
    - SSHs to remote server
    - Clones/pulls git repository
    - Builds Docker image on remote server
    - Deploys directly without GHCR push/pull
    - More efficient, no local Docker or GHCR needed

OPTIONS:
  --tag <tag>            Use custom tag instead of git SHA
  --deploy               After pushing, SSH to server and deploy (requires --remote-host and --deploy-path)
  --remote-build         Build on remote server (requires --remote-host and --deploy-path)
  --remote-host <host>   Remote server hostname/IP (required for --deploy or --remote-build)
  --deploy-path <path>   Deployment path on remote server (required for --deploy or --remote-build)
  --ssh-key <path>       Path to SSH private key (optional, uses ~/.ssh/config if not specified)
  --help                 Show this help message

ENVIRONMENT VARIABLES (optional):
  DEPLOY_HOST            Default remote host (overridden by --remote-host)
  DEPLOY_PATH            Default deployment path (overridden by --deploy-path)
  SSH_KEY                Default SSH key path (overridden by --ssh-key)
  DOCKER_IMAGE           Docker image name (default: ghcr.io/turentoo/flight-tracking)
  GIT_REPOSITORY         Git repository URL (default: https://github.com/turentoo/flight-tracking.git)

EXAMPLES:
  # Local build and push to GHCR
  ./deploy.sh

  # Local build, push, and deploy
  ./deploy.sh --deploy --remote-host your-server --deploy-path /opt/flight-tracking

  # Remote build on server
  ./deploy.sh --remote-build --remote-host your-server --deploy-path /opt/flight-tracking

  # Remote build with SSH key
  ./deploy.sh --remote-build --remote-host your-server --deploy-path /opt/flight-tracking --ssh-key ~/.ssh/id_rsa

  # Using environment variables
  export DEPLOY_HOST=your-server
  export DEPLOY_PATH=/opt/flight-tracking
  ./deploy.sh --remote-build

REQUIREMENTS:
  Local Build:
    - .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
    - Docker installed and logged into GHCR (docker login ghcr.io)

  Deploy/Remote Build:
    - .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
    - --remote-host and --deploy-path (or DEPLOY_HOST and DEPLOY_PATH env vars)
    - SSH access to remote server
    - Git and Docker installed on remote server (for --remote-build)

EOF
  exit 0
fi

echo -e "${BLUE}=== Flight Tracking Deployment ===${NC}\n"

# Validate required parameters for deploy/remote-build
if [ "$DEPLOY" = true ] || [ "$REMOTE_BUILD" = true ]; then
  if [ -z "$REMOTE_HOST" ]; then
    echo -e "${RED}ERROR: --remote-host is required for --deploy or --remote-build${NC}"
    echo -e "${YELLOW}Set via: --remote-host <hostname> or export DEPLOY_HOST=<hostname>${NC}"
    exit 1
  fi
  if [ -z "$DEPLOY_PATH" ]; then
    echo -e "${RED}ERROR: --deploy-path is required for --deploy or --remote-build${NC}"
    echo -e "${YELLOW}Set via: --deploy-path <path> or export DEPLOY_PATH=<path>${NC}"
    exit 1
  fi
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}ERROR: .env file not found!${NC}"
  echo -e "${YELLOW}Create .env file with your Supabase credentials:${NC}"
  echo "  cp .env.example .env"
  echo "  # Edit .env with your credentials"
  exit 1
fi

# Load environment variables
echo -e "${BLUE}Loading environment variables from .env...${NC}"
set -a
source .env
set +a

# Verify required variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}ERROR: Missing required environment variables!${NC}"
  echo "Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"
  exit 1
fi

echo -e "${GREEN}✓ Environment variables loaded${NC}\n"

# Get git commit SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD)
echo -e "${BLUE}Git commit: $GIT_SHA${NC}\n"

# REMOTE BUILD MODE
if [ "$REMOTE_BUILD" = true ]; then
  echo -e "${BLUE}=== Remote Build Mode ===${NC}"
  echo -e "${BLUE}Building on: $REMOTE_HOST${NC}\n"

  # Prepare SSH command
  SSH_CMD="ssh"
  if [ -n "$SSH_KEY" ]; then
    SSH_CMD="ssh -i $SSH_KEY"
  fi

  # Create remote build script
  REMOTE_SCRIPT=$(cat <<'SCRIPT_EOF'
#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BUILD_DIR="/tmp/flight-tracking-build"
DEPLOY_PATH="/opt/flight-tracking"
GIT_REPO="https://github.com/turentoo/flight-tracking.git"
IMAGE_TAG="flight-tracking:local"

echo -e "${BLUE}Preparing build directory...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

echo -e "${BLUE}Cloning repository...${NC}"
git clone "$GIT_REPO" .

echo -e "${BLUE}Creating .env file on remote...${NC}"
cat > .env <<'ENV_EOF'
VITE_SUPABASE_URL=__VITE_SUPABASE_URL__
VITE_SUPABASE_ANON_KEY=__VITE_SUPABASE_ANON_KEY__
VITE_ADSB_FI_API_URL=__VITE_ADSB_FI_API_URL__
VITE_FLIGHTAWARE_API_URL=__VITE_FLIGHTAWARE_API_URL__
VITE_POLLING_INTERVAL=__VITE_POLLING_INTERVAL__
VITE_ACTIVE_POLLING_INTERVAL=__VITE_ACTIVE_POLLING_INTERVAL__
VITE_ALTITUDE_THRESHOLD=__VITE_ALTITUDE_THRESHOLD__
VITE_ACTIVE_HOURS_START=__VITE_ACTIVE_HOURS_START__
VITE_ACTIVE_HOURS_END=__VITE_ACTIVE_HOURS_END__
VITE_DEFAULT_BOUNDARY_LAT_MIN=__VITE_DEFAULT_BOUNDARY_LAT_MIN__
VITE_DEFAULT_BOUNDARY_LAT_MAX=__VITE_DEFAULT_BOUNDARY_LAT_MAX__
VITE_DEFAULT_BOUNDARY_LON_MIN=__VITE_DEFAULT_BOUNDARY_LON_MIN__
VITE_DEFAULT_BOUNDARY_LON_MAX=__VITE_DEFAULT_BOUNDARY_LON_MAX__
ENV_EOF

source .env

echo -e "${BLUE}Building Docker image...${NC}"
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --build-arg VITE_ADSB_FI_API_URL="$VITE_ADSB_FI_API_URL" \
  --build-arg VITE_FLIGHTAWARE_API_URL="$VITE_FLIGHTAWARE_API_URL" \
  --build-arg VITE_POLLING_INTERVAL="$VITE_POLLING_INTERVAL" \
  --build-arg VITE_ACTIVE_POLLING_INTERVAL="$VITE_ACTIVE_POLLING_INTERVAL" \
  --build-arg VITE_ALTITUDE_THRESHOLD="$VITE_ALTITUDE_THRESHOLD" \
  --build-arg VITE_ACTIVE_HOURS_START="$VITE_ACTIVE_HOURS_START" \
  --build-arg VITE_ACTIVE_HOURS_END="$VITE_ACTIVE_HOURS_END" \
  --build-arg VITE_DEFAULT_BOUNDARY_LAT_MIN="$VITE_DEFAULT_BOUNDARY_LAT_MIN" \
  --build-arg VITE_DEFAULT_BOUNDARY_LAT_MAX="$VITE_DEFAULT_BOUNDARY_LAT_MAX" \
  --build-arg VITE_DEFAULT_BOUNDARY_LON_MIN="$VITE_DEFAULT_BOUNDARY_LON_MIN" \
  --build-arg VITE_DEFAULT_BOUNDARY_LON_MAX="$VITE_DEFAULT_BOUNDARY_LON_MAX" \
  -t "$IMAGE_TAG" \
  .

echo -e "${GREEN}✓ Image built successfully${NC}\n"

echo -e "${BLUE}Preparing deployment directory...${NC}"
sudo mkdir -p "$DEPLOY_PATH"
sudo chown $(id -u):$(id -g) "$DEPLOY_PATH"

echo -e "${BLUE}Copying docker-compose.yaml...${NC}"
cp docker-compose.yaml "$DEPLOY_PATH/"

echo -e "${BLUE}Updating docker-compose.yaml to use local image...${NC}"
cd "$DEPLOY_PATH"
sed -i.bak "s|image:.*|image: $IMAGE_TAG|" docker-compose.yaml

echo -e "${BLUE}Deploying container...${NC}"
docker compose up -d

echo -e "${GREEN}✓ Deployment complete${NC}\n"

echo -e "${BLUE}Container status:${NC}"
docker ps --filter name=flight-tracking

echo -e "\n${BLUE}Recent logs:${NC}"
docker logs --tail 20 flight-tracking

echo -e "\n${BLUE}Cleaning up build directory...${NC}"
cd /tmp
rm -rf "$BUILD_DIR"

echo -e "${GREEN}✓ Remote build and deployment complete!${NC}"
SCRIPT_EOF
)

  # Replace placeholders in script with actual values
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_SUPABASE_URL__/$VITE_SUPABASE_URL}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_SUPABASE_ANON_KEY__/$VITE_SUPABASE_ANON_KEY}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_ADSB_FI_API_URL__/${VITE_ADSB_FI_API_URL:-https://opendata.adsb.fi/api}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_FLIGHTAWARE_API_URL__/${VITE_FLIGHTAWARE_API_URL:-https://aeroapi.flightaware.com/aeroapi}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_POLLING_INTERVAL__/${VITE_POLLING_INTERVAL:-30000}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_ACTIVE_POLLING_INTERVAL__/${VITE_ACTIVE_POLLING_INTERVAL:-20000}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_ALTITUDE_THRESHOLD__/${VITE_ALTITUDE_THRESHOLD:-1300}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_ACTIVE_HOURS_START__/${VITE_ACTIVE_HOURS_START:-9}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_ACTIVE_HOURS_END__/${VITE_ACTIVE_HOURS_END:-19}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_DEFAULT_BOUNDARY_LAT_MIN__/${VITE_DEFAULT_BOUNDARY_LAT_MIN:-51.666476}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_DEFAULT_BOUNDARY_LAT_MAX__/${VITE_DEFAULT_BOUNDARY_LAT_MAX:-51.692979}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_DEFAULT_BOUNDARY_LON_MIN__/${VITE_DEFAULT_BOUNDARY_LON_MIN:--0.351682}}"
  REMOTE_SCRIPT="${REMOTE_SCRIPT//__VITE_DEFAULT_BOUNDARY_LON_MAX__/${VITE_DEFAULT_BOUNDARY_LON_MAX:--0.277525}}"

  # Execute remote build
  echo -e "${BLUE}Executing build on $REMOTE_HOST...${NC}\n"
  $SSH_CMD "$REMOTE_HOST" bash <<EOF
$REMOTE_SCRIPT
EOF

  echo -e "\n${GREEN}=== Remote Build Complete ===${NC}"
  echo -e "${BLUE}Access the application at: https://your-domain.example.com${NC}"
  exit 0
fi

# LOCAL BUILD MODE (original behavior)

# Determine tags
if [ -n "$CUSTOM_TAG" ]; then
  TAGS=("$IMAGE_NAME:$CUSTOM_TAG" "$IMAGE_NAME:latest")
  echo -e "${BLUE}Using custom tag: $CUSTOM_TAG${NC}"
else
  TAGS=("$IMAGE_NAME:$GIT_SHA" "$IMAGE_NAME:latest")
  echo -e "${BLUE}Using git SHA tag: $GIT_SHA${NC}"
fi

# Build Docker image
echo -e "\n${BLUE}Building Docker image...${NC}"
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --build-arg VITE_ADSB_FI_API_URL="${VITE_ADSB_FI_API_URL:-https://opendata.adsb.fi/api}" \
  --build-arg VITE_FLIGHTAWARE_API_URL="${VITE_FLIGHTAWARE_API_URL:-https://aeroapi.flightaware.com/aeroapi}" \
  --build-arg VITE_POLLING_INTERVAL="${VITE_POLLING_INTERVAL:-30000}" \
  --build-arg VITE_ACTIVE_POLLING_INTERVAL="${VITE_ACTIVE_POLLING_INTERVAL:-20000}" \
  --build-arg VITE_ALTITUDE_THRESHOLD="${VITE_ALTITUDE_THRESHOLD:-1300}" \
  --build-arg VITE_ACTIVE_HOURS_START="${VITE_ACTIVE_HOURS_START:-9}" \
  --build-arg VITE_ACTIVE_HOURS_END="${VITE_ACTIVE_HOURS_END:-19}" \
  --build-arg VITE_DEFAULT_BOUNDARY_LAT_MIN="${VITE_DEFAULT_BOUNDARY_LAT_MIN:-51.666476}" \
  --build-arg VITE_DEFAULT_BOUNDARY_LAT_MAX="${VITE_DEFAULT_BOUNDARY_LAT_MAX:-51.692979}" \
  --build-arg VITE_DEFAULT_BOUNDARY_LON_MIN="${VITE_DEFAULT_BOUNDARY_LON_MIN:--0.351682}" \
  --build-arg VITE_DEFAULT_BOUNDARY_LON_MAX="${VITE_DEFAULT_BOUNDARY_LON_MAX:--0.277525}" \
  -t "${TAGS[0]}" \
  -t "${TAGS[1]}" \
  .

echo -e "${GREEN}✓ Image built successfully${NC}\n"

# Push to GHCR
echo -e "${BLUE}Pushing images to GitHub Container Registry...${NC}"
for tag in "${TAGS[@]}"; do
  echo -e "${YELLOW}Pushing $tag...${NC}"
  docker push "$tag"
done

echo -e "${GREEN}✓ Images pushed successfully${NC}\n"
echo -e "${GREEN}Images available at:${NC}"
for tag in "${TAGS[@]}"; do
  echo "  - $tag"
done

# Deploy to server if requested
if [ "$DEPLOY" = true ]; then
  echo -e "\n${BLUE}=== Deploying to $DEPLOY_HOST ===${NC}\n"

  echo -e "${BLUE}Pulling latest image on server...${NC}"
  ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH && docker compose pull"

  echo -e "${BLUE}Restarting container...${NC}"
  ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH && docker compose up -d"

  echo -e "${GREEN}✓ Deployment complete${NC}\n"

  # Check status
  echo -e "${BLUE}Container status:${NC}"
  ssh "$DEPLOY_HOST" "docker ps --filter name=flight-tracking"

  echo -e "\n${BLUE}Recent logs:${NC}"
  ssh "$DEPLOY_HOST" "docker logs --tail 20 flight-tracking"
fi

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${BLUE}Access the application at: https://your-domain.example.com${NC}"
