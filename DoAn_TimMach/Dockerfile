FROM node:20-bookworm AS frontend-build

WORKDIR /workspace/DoAn_TimMach/Fontend

COPY DoAn_TimMach/Fontend/package.json DoAn_TimMach/Fontend/package-lock.json ./
RUN npm ci

COPY DoAn_TimMach/Fontend/ ./
ENV VITE_API_URL=
RUN npm run build


FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    API_HOST=0.0.0.0 \
    API_PORT=7860 \
    DB_MODE=sqlite \
    USE_WAITRESS=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY DoAn_TimMach/ ./DoAn_TimMach/
COPY --from=frontend-build /workspace/DoAn_TimMach/Fontend/build ./DoAn_TimMach/Fontend/build

WORKDIR /app/DoAn_TimMach

EXPOSE 7860

CMD ["python", "api.py"]