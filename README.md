# Ozzy — one-zero-eight bot

<p align="center">
  <strong>Official Telegram bot of the one-zero-eight team</strong><br>
  Helps people learn about the team and submit an application to join it.
</p>

## 🔧 Tech Stack

[![Deno][Deno]][Deno-url]
[![Docker][Docker]][Docker-url]
[![Docker Compose][Docker Compose]][Docker Compose-url]
[![Redis][Redis]][Redis-url]
[![grammY][grammY]][grammY-url]

[![Notion][Notion]][Notion-url]
[![Fluent][Fluent]][Fluent-url]
[![MIT License][License]][License-url]

## About the bot

Ozzy is the Telegram bot of the [one-zero-eight](https://t.me/one_zero_eight) team. It introduces users to the team, lets them choose their language, and guides candidates through the application process.

The bot collects general information about each candidate, lets them choose the departments they are interested in, and asks department-specific questions:

- **Tech** — software and hardware project development;
- **Design** — visual design, interfaces, and media design;
- **Management** — processes, communication, and project management.

After the application is confirmed, it is sent to the team's Telegram chat. When the Notion integration is enabled, the application is also saved to the candidates database.

## Using the bot

1. Send `/start` to the bot.
2. Choose a language: Russian or English.
3. Read about one-zero-eight and press the join button.
4. Fill in the application and choose the departments you are interested in.
5. Review your answers and submit the application.

The following commands are available while filling in an application:

| Command | Description |
| --- | --- |
| `/apply` | Start or continue an application |
| `/pause` | Pause the application |
| `/undo` or `/back` | Return to the previous question |
| `/keep` | Keep the saved answer |
| `/cancel`, `/stop`, `/exit` | Exit the application while keeping the answers |
| `/help` | Show the help message |
| `/profile` | Show the profile of an active team member |

An unfinished application and the selected language are stored in Redis, so they can be continued after the bot is restarted.

## Requirements

For local development, you will need:

| Tool | Installation |
| --- | --- |
| Deno 2.x | [Official Deno installation guide](https://docs.deno.com/runtime/getting_started/installation/) |
| Docker | [Docker Desktop for macOS](https://docs.docker.com/desktop/setup/install/mac-install/), [Windows](https://docs.docker.com/desktop/setup/install/windows-install/), or [Docker Engine for Linux](https://docs.docker.com/engine/install/) |
| Docker Compose | Included with Docker Desktop; on Linux, install the [Docker Compose plugin](https://docs.docker.com/compose/install/linux/) |

Check that the tools are installed:

```bash
deno --version
docker --version
docker compose version
```

### Installing Deno manually

Linux/macOS:

```bash
curl -fsSL https://deno.land/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://deno.land/install.ps1 | iex
```

Restart your terminal after installation and check `deno --version`.

## Local development

### 1. Clone the repository

```bash
git clone https://github.com/projacktor/apply-bot.git
cd apply-bot
```

### 2. Install dependencies

The project does not use `npm install`: Deno downloads dependencies from the import map and caches them locally.

```bash
deno cache --allow-import src/run-lp.ts
```

### 3. Configure `.env`

Create a `.env` file in the project root:

```dotenv
# Required
TELEGRAM_BOT_TOKEN=123456789:replace_with_bot_token
APPLICATIONS_CHAT_TELEGRAM_ID=-1001234567890
REDIS_HOSTNAME=redis
REDIS_PORT=6379

# Optional: Notion integration is enabled only when all three values are set
NOTION_INTEGRATION_TOKEN=
NOTION_MEMBERS_DB_ID=
NOTION_CANDIDATES_DB_ID=

# Required only for webhook mode
WEBHOOK_SECRET_PATH=
```

Where to get the values:

- `TELEGRAM_BOT_TOKEN` — create a bot through [@BotFather](https://t.me/BotFather);
- `APPLICATIONS_CHAT_TELEGRAM_ID` — the ID of the Telegram chat where applications will be sent; supergroup IDs usually start with `-100`;
- `REDIS_HOSTNAME` depends on how the bot is launched:
  - `redis` — when the bot runs inside Compose;
  - `127.0.0.1` — when the bot runs manually on the host and Redis runs in Docker.

Do not commit `.env` or publish your Telegram bot token.

### 4. Run everything with Docker

In this mode, both the bot and Redis run inside the Compose network. Make sure `REDIS_HOSTNAME=redis` is set in `.env`.

```bash
docker compose up --build -d
```

Check the container status:

```bash
docker compose ps
docker compose logs -f bot
```

Stop the containers:

```bash
docker compose down
```

### 5. Run the bot manually

Start Redis only:

```bash
docker compose up -d redis
docker compose exec redis redis-cli ping
```

Expected output:

```text
PONG
```

For a manual bot launch, set the following values in `.env`:

```dotenv
REDIS_HOSTNAME=127.0.0.1
REDIS_PORT=6379
```

Then start the bot using long polling:

```bash
deno run --allow-all src/run-lp.ts
```

### Webhook mode

Webhook mode requires a public HTTPS address and a configured `WEBHOOK_SECRET_PATH`:

```bash
deno run --allow-all src/run-wh.ts
```

In production, the webhook is usually run behind a reverse proxy that accepts HTTPS requests and forwards them to the Deno HTTP server.

## Clearing Redis and application data

### Delete all Redis data

```bash
docker compose exec redis redis-cli FLUSHALL
```

This deletes all Redis sessions, including applications, selected languages, and conversation state.

### Recreate the Redis storage completely

Stopping Compose does not delete the data because Redis uses the `./redis_data:/data` bind mount.

```bash
docker compose down
rm -rf ./redis_data
docker compose up -d redis
```

> In PowerShell, use `Remove-Item -Recurse -Force .\redis_data` instead of `rm -rf`.
> Removing `redis_data` permanently deletes the local Redis data.

## Quality checks

Run the main project checks with:

```bash
deno fmt --check
deno lint
deno check --allow-import src/run-lp.ts
deno check --allow-import src/run-wh.ts
deno test -A
```

GitHub Actions runs formatting, linting, type checking, and tests on pushes and pull requests targeting `main` or `preview`.

## Project structure

```text
apply-bot/
├── src/
│   ├── bot.ts                         # bot setup and middleware
│   ├── config.ts                      # environment variables
│   ├── handlers/                      # commands and conversation flows
│   ├── forms/questions/               # application question types
│   ├── plugins/i18n.ts                # localization
│   ├── plugins/o12t.ts                # members, candidates, and Notion
│   ├── notion/                        # Notion client and types
│   └── utils/                         # helper functions
├── locales/en.ftl                    # English locale
├── locales/ru.ftl                    # Russian locale
├── compose.yaml                      # bot and Redis services
├── Dockerfile                         # bot image
├── redis/redis.conf                   # Redis configuration
└── deno.json                          # imports, tasks, and formatting
```

## Notion integration

The integration is disabled if at least one of these variables is missing:

```dotenv
NOTION_INTEGRATION_TOKEN=
NOTION_MEMBERS_DB_ID=
NOTION_CANDIDATES_DB_ID=
```

Without Notion, the bot continues to work and sends applications to the Telegram chat specified by `APPLICATIONS_CHAT_TELEGRAM_ID`.

## License

This project is distributed under the [MIT License](./LICENSE).

## Useful links

- [one-zero-eight on Telegram](https://t.me/one_zero_eight)
- [one-zero-eight presentation](https://t.me/one_zero_eight/10)
- [Deno documentation](https://docs.deno.com/runtime/)
- [Docker documentation](https://docs.docker.com/)
- [Redis documentation](https://redis.io/docs/)
- [grammY documentation](https://grammy.dev/)

[Deno]: https://img.shields.io/badge/Deno-2.4.4-41BDF5?logo=deno&logoColor=white
[Deno-url]: https://deno.com/
[Docker]: https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Docker Compose]: https://img.shields.io/badge/Docker%20Compose-2496ED?logo=docker&logoColor=white
[Docker Compose-url]: https://docs.docker.com/compose/
[Redis]: https://img.shields.io/badge/Redis-7.0.9-DC382D?logo=redis&logoColor=white
[Redis-url]: https://redis.io/
[grammY]: https://img.shields.io/badge/grammY-Telegram%20Bot-2CA5E0?logo=telegram&logoColor=white
[grammY-url]: https://grammy.dev/
[Notion]: https://img.shields.io/badge/Notion-API-000000?logo=notion&logoColor=white
[Notion-url]: https://developers.notion.com/
[Fluent]: https://img.shields.io/badge/Fluent-i18n-FF7139?logo=mozilla&logoColor=white
[Fluent-url]: https://projectfluent.org/
[License]: https://img.shields.io/badge/license-MIT-22C55E?logo=opensourceinitiative&logoColor=white
[License-url]: ./LICENSE
