FROM public.ecr.aws/bitnami/node:18-debian-10

ENV PORT=8080
EXPOSE 8080

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .

CMD [ "node", "index.js" ]
