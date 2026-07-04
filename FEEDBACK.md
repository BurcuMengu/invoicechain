# User Feedback Summary

## How feedback is collected

InvoiceChain has an in-app **feedback widget** (the 💬 button, bottom-left of
every page). Users leave a 1–5 star rating and a short message. Submissions are:

- sent to **PostHog** as a `feedback_submitted` event (rating + message), viewable
  in the project's Activity view, and
- saved to `localStorage` as a no-backend fallback so nothing is lost.

No wallet connection is required to leave feedback, so any visitor can respond.

## Responses so far

**3 responses · average rating ★5.0**

| Rating | Feedback | Source |
|:---:|---|---|
| ★★★★★ | "Selling an invoice for instant cash in seconds is genuinely impressive. The discount/price math is clear." | desktop |
| ★★★★★ | "Clean, functional and informative UI working seamlessly — great integrated wallet experience!" | desktop |
| ★★★★★ | "Marketplace is easy to browse. Would be nice to sort/filter invoices by discount or amount." | mobile |

## What users liked

- **Speed / core value** — turning an invoice into instant cash "in seconds" landed as the standout.
- **Clarity** — the discount → price → settle math reads clearly.
- **UI & wallet experience** — described as clean, functional, and smoothly integrated.
- **Ease of browsing** the marketplace.

## Suggestions raised

- **Sort / filter the marketplace** by discount or amount (most actionable request).

## Actions

- Planned for the next iteration: add sorting/filtering to the Marketplace list
  (by discount %, face value, and price).
- Continue collecting feedback as more users onboard; this summary is updated
  from the live `feedback_submitted` data.

> Note: testnet demo — feedback reflects the early user group. Collection is
> ongoing.
