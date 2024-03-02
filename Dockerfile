FROM denoland/deno:alpine-1.41.0
EXPOSE 3101
WORKDIR /app
COPY ./src /app
RUN deno cache main.ts && deno cache handlers/*/*/*/index.ts
CMD [ "run", "--allow-all", "main.ts" ]
