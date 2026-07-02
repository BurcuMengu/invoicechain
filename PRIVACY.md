# Privacy Notice

InvoiceChain is a **testnet demo** running on the Stellar test network. This
notice explains what the web app records, why, and how to opt out. It is written
to match exactly what the code does.

## What we collect

When analytics keys are configured for a deployment, the app uses two services:

**PostHog** (product analytics + session replay)
- Product analytics events (e.g. feedback submitted, page views)
- Autocapture of UI interactions such as clicks
- Session replay / recordings of page interactions
- Web performance vitals
- Your **public wallet address**, sent via `identify` on wallet connect, so
  interactions can be attributed to a wallet

**Sentry** (error monitoring)
- Error and exception reports, including stack traces and limited technical
  context, so we can debug crashes
- A small sample of performance traces

## What we do NOT collect

- Private keys
- Seed phrases / recovery phrases
- Any personal identity beyond your public wallet address

Signing happens in your own wallet; the app never sees your secrets.

## Why

To understand how the product is used, find and fix bugs, and improve the
experience.

## Where it is hosted

- **PostHog** — EU region
- **Sentry** — EU region

## How to opt out

Use the **"Opt out of analytics"** button in the privacy notice shown on your
first visit. Opting out:

- Sets a flag (`ic_analytics_optout`) in your browser's local storage
- Stops PostHog capturing and stops session recording immediately
- Prevents PostHog / session replay from initializing on future visits in that
  browser

The opt-out is stored **per browser**, so you'll need to opt out again on other
browsers or devices, and clearing site data will reset it. Sentry error
monitoring may remain active, as it only captures errors and exceptions — never
analytics or session recordings.

## Note

Because this is a testnet demo, only test-network (non-real) funds and data are
involved.
