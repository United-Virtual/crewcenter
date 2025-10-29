# syntax=docker/dockerfile:1.7-labs

FROM oven/bun:1.3.1

# Add procps
RUN apt-get update \
    && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install packages
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Exclude some folders to not break cache, below files are not needed for the build
COPY --exclude=deploy/** --exclude=scripts/** --exclude=resources/** . .

# Build web app
RUN bunx --bun next build

# Install PM2
RUN bun add -g pm2

# Copy deploy folder with scripts, config and resources
COPY scripts/ /app/scripts/
COPY deploy/ /app/deploy/
COPY resources/ /app/resources/

RUN find /app/deploy -type f -name "*.sh" -exec chmod +x {} \;
EXPOSE 3000

CMD ["pm2-runtime", "./deploy/ecosystem.config.js"]
