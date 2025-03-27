FROM public.ecr.aws/bitnami/node:22

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
