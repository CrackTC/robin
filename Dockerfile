FROM denoland/deno:ubuntu
EXPOSE 3101
COPY . /app
WORKDIR /app
RUN deno cache main.ts
RUN apt-get update && apt-get install -y python3 pip
RUN python3 -m pip install -r ./requirements.txt
CMD [ "run", "--allow-all", "main.ts" ]
