# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/migrate ./cmd/migrate
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/maintenance ./cmd/maintenance

# Runtime stage
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata ffmpeg

WORKDIR /app

COPY --from=builder /bin/server /app/server
COPY --from=builder /bin/migrate /app/migrate
COPY --from=builder /bin/maintenance /app/maintenance
COPY migrations/ /app/migrations/

EXPOSE 8080

ENTRYPOINT ["/app/server"]
