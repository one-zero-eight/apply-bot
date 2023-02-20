# https://github.com/denoland/deno_docker
FROM denoland/deno:1.30.3

WORKDIR /app
USER deno

COPY . .
RUN deno cache src/run-lp.ts

CMD [ "run", "--allow-all", "src/run-lp.ts" ]
