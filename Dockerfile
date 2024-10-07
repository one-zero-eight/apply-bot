# https://github.com/denoland/deno_docker
FROM denoland/deno:1.46.3

WORKDIR /app
USER deno

COPY deno.json deno.lock ./
COPY ./src ./src
COPY ./locales ./locales
RUN deno cache src/run-lp.ts

CMD [ "run", "--allow-all", "src/run-lp.ts" ]
