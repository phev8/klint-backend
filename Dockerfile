FROM node:lts-alpine3.14
COPY . /files/
RUN ls
WORKDIR /files
RUN npm install
RUN npm install -g ts-node
EXPOSE 4242
CMD ["sh"]

# docker run -p 4242:4242 -it -v /Users/janiselfert/Lokal/external:/external janiselfert/klint-deploy