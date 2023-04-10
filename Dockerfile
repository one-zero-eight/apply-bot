FROM denoland/deno:alpine-1.32.3

WORKDIR /app
USER deno

COPY ./src ./src
COPY deno.json deno.json
COPY deno.lock deno.lock
RUN deno cache src/run-lp.ts
COPY ./locales ./locales
COPY .env .env

CMD [ "run", "--allow-all", "src/run-lp.ts" ]
