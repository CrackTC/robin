FROM denoland/deno:ubuntu
EXPOSE 3101
RUN apt-get update && apt-get install -y python3 pip
COPY ./src/requirements.txt /app/requirements.txt
WORKDIR /app
RUN python3 -m pip install -r ./requirements.txt
COPY ./fonts /app/fonts
COPY ./src /app
RUN deno cache main.ts
CMD [ "run", "--allow-all", "main.ts" ]
