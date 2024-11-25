FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install webhdfs 
RUN npm install axios
RUN npm install csv-parser
RUN npm install multer
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
