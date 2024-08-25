FROM openjdk:22-slim
RUN addgroup --system spring && adduser --system --ingroup spring --home /home/spring spring

WORKDIR /frontend
COPY frontend/ ./
 
WORKDIR /backend
COPY backend/.mvn/ ./.mvn/
COPY backend/mvnw backend/pom.xml ./
COPY backend/src ./src/

RUN ./mvnw generate-resources
RUN cp -r ../frontend/dist/* ./src/main/resources/static/

RUN chown -R spring:spring /backend
RUN chown -R spring:spring /frontend
USER spring:spring
EXPOSE 80

ENTRYPOINT ["./mvnw", "spring-boot:run"]
