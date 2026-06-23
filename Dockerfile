FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv build-essential && \
    apt-get clean

WORKDIR /app

COPY . .

# ---------- Backend ----------
WORKDIR /app/backend

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# ---------- Frontend ----------
WORKDIR /app/frontend

RUN npm install
RUN npm run build

WORKDIR /app

RUN chmod +x start.sh

EXPOSE 10000

CMD ["./start.sh"]
