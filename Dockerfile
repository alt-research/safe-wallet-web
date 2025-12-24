FROM node:20-alpine
RUN apk add --no-cache libc6-compat git python3 py3-pip make g++ libusb-dev eudev-dev linux-headers
WORKDIR /app
COPY . .

# Accept GitHub token as build arg for private package access (build-time only)
ARG GITHUB_TOKEN

# Fix arm64 timeouts and add retry logic
RUN yarn config set network-timeout 300000 && \
    yarn config set network-concurrency 1

# install deps with retry
RUN yarn install || \
    (sleep 10 && yarn install) || \
    (sleep 30 && yarn install)

RUN yarn after-install

# Install serve globally during build
RUN yarn global add serve

ENV NODE_ENV=production

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app during Docker build (not at runtime)
RUN yarn build

EXPOSE 8080

ENV PORT=8080
ENV REVERSE_PROXY_UI_PORT=8080

# Just serve the pre-built files using globally installed serve
CMD ["serve", "out", "-p", "8080", "-n"]
