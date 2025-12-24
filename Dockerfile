FROM node:20-alpine
RUN apk add --no-cache libc6-compat git python3 py3-pip make g++ libusb-dev eudev-dev linux-headers
WORKDIR /app
COPY . .

# Fix arm64 timeouts and add retry logic for public npm packages
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

# Set Next.js public environment variables for build
# These get baked into the static export and cannot be changed at runtime
ENV NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=/cgw
ENV NEXT_PUBLIC_IS_PRODUCTION=true
ENV NEXT_PUBLIC_SAFE_VERSION=1.4.1
ENV NEXT_PUBLIC_WC_PROJECT_ID=dce8b76eeca269d6a63782777c1972d9

# Build the Next.js app during Docker build (not at runtime)
RUN yarn build

EXPOSE 8080

ENV PORT=8080
ENV REVERSE_PROXY_UI_PORT=8080

# Just serve the pre-built files using globally installed serve
CMD ["serve", "out", "-p", "8080", "-n"]
