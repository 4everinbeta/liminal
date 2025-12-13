#!/usr/bin/env sh
# Busybox/dash compatibility: no pipefail
set -eu

MODELS_ENV="${OLLAMA_MODELS:-}"
MODELS_FILE="${OLLAMA_MODELS_FILE:-/init/ollama-models.txt}"

collect_models() {
  if [ -n "$MODELS_ENV" ]; then
    echo "$MODELS_ENV"
    return
  fi
  if [ -f "$MODELS_FILE" ]; then
    # strip comments/blank lines
    grep -vE '^\s*(#|$)' "$MODELS_FILE" || true
  fi
}

MODELS="$(collect_models)"

echo "Starting ollama serve..."
ollama serve >/tmp/ollama-serve.log 2>&1 &
SERVER_PID=$!

echo "Waiting for ollama to be ready..."
for i in $(seq 1 30); do
  if ollama list >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if [ -n "$MODELS" ]; then
  echo "Ensuring models are present: $MODELS"
  for model in $MODELS; do
    if ! ollama list 2>/dev/null | awk '{print $1}' | grep -q "^${model}$"; then
      echo "Pulling model ${model}..."
      ollama pull "$model" || echo "Warning: failed to pull ${model}"
    else
      echo "Model ${model} already available."
    fi
  done
else
  echo "No models specified via OLLAMA_MODELS or $MODELS_FILE"
fi

wait $SERVER_PID
