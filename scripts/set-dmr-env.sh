#!/usr/bin/env bash
set -euo pipefail

# Generate a Docker Compose env file with local DMR/Ollama defaults.
# These values are intended to be used via: docker compose --env-file .env.dev up

cat > .env.dev <<'EOF'
LLM_PROVIDER=local
# When backend runs in Docker and the LLM runs on the host, use host.docker.internal
LLM_BASE_URL=http://llm:11434/v1/chat/completions
LLM_MODEL=ai/llama3.2:3B-Q4_0
LLM_API_KEY=docker
AZURE_OPENAI_API_VERSION=
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

echo "Wrote .env.dev with DMR defaults. Use it via:"
echo "  docker compose --env-file .env.dev up --build"
