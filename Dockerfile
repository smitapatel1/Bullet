FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    apt-get clean

WORKDIR /app

COPY . .

# Backend
WORKDIR /app/backend
RUN pip3 install --no-cache-dir -r requirements.txt

# Frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

WORKDIR /app

RUN chmod +x start.sh

EXPOSE 10000

CMD ["./start.sh"]
