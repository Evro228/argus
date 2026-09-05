FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create unprivileged service user and ensure directory ownership
RUN useradd -m -u 1000 argususer && chown -R argususer /app

COPY . .
RUN chown -R argususer:argususer /app

USER argususer

EXPOSE 8800

CMD ["uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8800"]
