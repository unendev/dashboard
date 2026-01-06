# Stage 1: Install dependencies (deps)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Stage 2: Build the application (builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure Prisma Client is generated before building Next.js
# This command is taken from your package.json "build" script
    ARG POSTGRES_PRISMA_URL
    ARG POSTGRES_URL_NON_POOLINGRUN npm run build
RUN npm run build && ls -la

# Stage 3: Run the application (runner)
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the builder stage
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts

# Copy node_modules from the deps stage, but only production dependencies
# This assumes `npm ci` in deps stage installed all, and `next build` handles production only
# For a more robust approach, you might run `npm ci --only=production` here if needed,
# but Next.js usually bundles what's needed.
COPY --from=deps /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000

# Expose the port Next.js runs on
EXPOSE 3000

# Run as the non-root user
USER nextjs

# Command to start the application
CMD ["npm", "start"]
