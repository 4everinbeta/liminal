FROM quay.io/keycloak/keycloak:25.0.2

# Import realm at startup (works on Railway since it builds from repo).
COPY liminal-realm.json /opt/keycloak/data/import/liminal-realm.json

ENV KC_HTTP_ENABLED=true \
    KC_PROXY=edge \
    KC_HOSTNAME_STRICT=false

# Railway provides PORT; default to 8080 for local runs.
CMD ["sh", "-c", "/opt/keycloak/bin/kc.sh start-dev --http-port=${PORT:-8080} --import-realm"]
