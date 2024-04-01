FROM denoland/deno:alpine-1.42.1
EXPOSE 3101
WORKDIR /app
COPY ./src /app
RUN deno cache main.ts
CMD [ "run", "--allow-all", "main.ts" ]
