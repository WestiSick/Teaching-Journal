FROM golang:1.24 as builder

WORKDIR /app

COPY . .

ARG SERVICE=dashboard

RUN if [ "$SERVICE" = "dashboard" ]; then \
        cd ./app/dashboard/cmd/server && CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o /app/server; \
    elif [ "$SERVICE" = "schedule" ]; then \
        cd ./app/schedule/cmd/server && CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o /app/server; \
    elif [ "$SERVICE" = "tests" ]; then \
            cd ./app/tests/cmd/server && CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o /app/server; \
    elif [ "$SERVICE" = "tickets" ]; then \
        cd ./app/tickets/cmd/server && CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o /app/server; \
    else \
        echo "Unknown service: $SERVICE"; \
        exit 1; \
    fi

FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/server /app/server

# Ensure template directory exists and copy Excel template(s)
RUN mkdir -p /app/dashboard/tmp_excel
COPY app/dashboard/tmp_excel/WorkLoad_Titul.xlsx /app/dashboard/tmp_excel/WorkLoad_Titul.xlsx
# Duplicate with lowercase filename for robust lookup
COPY app/dashboard/tmp_excel/WorkLoad_Titul.xlsx /app/dashboard/tmp_excel/workload_titul.xlsx

RUN mkdir -p /app/attachments

RUN chmod +x /app/server

ENTRYPOINT ["/app/server"]
