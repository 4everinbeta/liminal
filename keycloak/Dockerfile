FROM quay.io/keycloak/keycloak:25.0.2

# Import realm at startup (works on Railway since it builds from repo).
COPY liminal-realm.json /opt/keycloak/data/import/liminal-realm.json
COPY themes /opt/keycloak/themes

# Railway is memory-constrained; Keycloak is heavy.
# Pre-build an optimized server image during docker build and cap heap at runtime.
ENV KC_HTTP_ENABLED=true \
    KC_PROXY=edge \
    KC_HOSTNAME_STRICT=false \
    JAVA_OPTS_APPEND="-Xms128m -Xmx384m"

RUN /opt/keycloak/bin/kc.sh build

# Railway provides PORT; default to 8080 for local runs.
CMD ["sh", "-c", "/opt/keycloak/bin/kc.sh start --optimized --http-port=${PORT:-8080} --import-realm"]
