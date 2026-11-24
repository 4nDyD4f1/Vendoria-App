# --- build ---
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN sh mvnw -q -B dependency:go-offline
COPY src src
RUN sh mvnw -q -B -DskipTests package && mv target/backend-*.jar /app.jar

# --- run ---
FROM eclipse-temurin:25-jre
RUN useradd --system --create-home --uid 10001 vendoria \
 && mkdir -p /data/kyc && chown -R vendoria /data
USER vendoria
WORKDIR /home/vendoria
COPY --from=build /app.jar app.jar
EXPOSE 8080
# JAVA_OPTS diatur di docker-compose.yml (batas heap untuk VPS 2 GB)
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
