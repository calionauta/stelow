---
name: stelow-product-offer
description: >
  [stelow] Develop and evaluate a tangible offer: launch promotions, trust,
  bonuses, promoter types, channels and the Pioneer Program. Use when the user
  asks: how do I present my offer, who promotes it, which channels should I use,
  how do I advertise for free, how do I recruit early adopters or pioneers, how
  do I structure a beta program, or when discovery reaches stage 4 (develop and
  evaluate the offer) and needs to test value risk before asking for commitment.
metadata:
  frequency: monthly
  category: product
  execution:
    mode: reference
    recipe: null
    capabilities: []
    write_policy: none
    permission_profile: inherit
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
---

# The Offer: Develop and Evaluate

**Objective**: leave the field of ideas and create a tangible offer. Test the **value
risk**: do people show genuine interest when presented with the proposed solution?

This is where the solution stops being a concept and becomes something a person can
respond to. Interest is the only thing measured here; payment is stage 5.

**Tips**:
1. Stage 4 and stage 5 are often run together — see `stelow-product-launch-validation`.
2. Use AI to generate ad ideas for online placement.

## What to do

- Develop launch promotions, build trust, and develop bonuses — the mechanics live in
  `stelow-product-promotions` and `stelow-product-trust-building`.
- Experiment with different promoters, starting with yourself.
- Experiment with a combination of channels and marketing messages.
- Structure the search for pioneers (early adopters) with a **Pioneer Program**.

## Pioneer Program — co-creation instead of transaction

Formalize the search for early adopters who want to help build the solution:

- **Central offer**: extended, free access to the solution (e.g. a full annual plan).
- **Clear counterparty**: explicit commitment from the pioneer to provide feedback (e.g.
  one feedback call every X months).

💡 The value offered — complete and free access — attracts people who feel the pain
intensely. Whether the commitment in this exchange was real is verified in stage 5.

## Types of promoters

**1. Yourself.**

**2. Customers** — customers who refer your business.

**3. Agencies** — agencies that run the prospecting.

**4. Affiliates** — partners who talk to their own audience about your business:
- Anyone qualified to promote your solution, receiving a percentage of the sale.
- **Social media influencers** (Instagram, TikTok) — if you are new to the market,
  contact small influencers (3–10k followers). Analyse real statistics, content types
  and comments. Offer one of: your solution free plus a discount coupon for the
  audience; a percentage of sales they generate; or a fixed monthly payment to promote
  X times per week/month.
- Online affiliate platforms: Hotmart, Kiwify, etc.

**5. Employees** — people whose role is prospecting.

## Ways to advertise

### Warm approach (people you know)
- Individual direct message
- Direct message to a small group
- A small personalized video showing a quick analysis of something relevant to them

### Cold approach (people you do not know)
- Individual direct message
- Direct message to a small group
- A small personalized video showing a quick analysis of something relevant to them
- 🕵️ Monitor competitors' negative comments: where there is a complaint, there is a
  potential customer. Join conversations (social media, Reddit, forums) where users
  express frustration with an existing solution and present yours as an alternative.
  ⚠️ Use only against large corporations or well-funded startups.

### Free content
- Your own publication: site, blog, podcast, WhatsApp Stories, YouTube, Instagram,
  Facebook, TikTok, Substack, Medium.
- **Micro-solutions and free tools**: build a free mini-solution in a similar context and
  link to the paid one. Offer immense, self-contained value that attracts the target
  audience — e.g. a Chrome extension, an AI content generator, a niche resource
  directory, an online calculator.
- Content for sites or channels of a niche brand.
- 🎙 Guest on podcasts/videocasts: smaller ones usually have more guest slots. During
  the conversation, where pertinent, demonstrate the solution live.
- **Existing community**: publish content in existing communities without violating the
  rules, delivering contextual value. The point is not to talk about your solution but
  to deliver value. (Reddit, Facebook groups, Discord and Slack groups, etc.)

### Paid advertising
- Third-party audience: newsletters, podcasts and videocasts from content creators.
- Online directories: sites that list brands and links in a specific niche.
- References from other brands and solutions: find sites, networks and solutions in a
  similar context and negotiate a mention.
- Digital platforms: Google Ads (Google and YouTube), Meta Ads (Facebook and Instagram),
  TikTok Ads, LinkedIn Ads, Twitter Ads, Pinterest Ads, Reddit Ads, Mercado Livre Ads,
  OLX Ads.
- Offline platforms: print (newspapers, magazines, leaflets, posters, direct mail),
  outdoor media (billboards, bus doors, urban furniture, airports, metro, digital
  panels), radio and TV, events and experiences.
- 🏆 Sponsor hackathons and small niche events: an accessible sponsorship (~$500)
  guarantees visibility. Ideally negotiate for your tool to be used by participants
  during the competition.

### Media formats
Phone calls · direct messages on social media · letters or postcards · SMS · WhatsApp or
Telegram messages · audio on WhatsApp or Telegram · posts in forums and communities ·
social media posts · door-to-door canvassing · direct mail campaigns.

## What risk this mitigates

Value risk — whether people are interested at all.

## What to observe (signals)

Interest: curiosity to know more, clicks on ads, email responses, and so on.

**Experiment with solutions that generate high interest.** Example yardstick: did at
least 60% of the last people contacted show interest? Before giving up, confirm you are
reaching the appropriate audience.

## Completeness contract

The host validates these minima — never submit fewer:

- The offer stated in one unambiguous sentence a stranger could repeat.
- At least one promoter type and one channel chosen, with the reason.
- The interest signal and its threshold defined before the offer runs.

criteria:
  - id: offer-stated
    kind: presence
    text: "The offer is one clear sentence, not a list of features"
  - id: channel-chosen
    kind: presence
    text: "At least one promoter type and one channel are named with a rationale"
  - id: signal-threshold
    kind: semantic
    text: "The interest signal has a numeric threshold set before the test ran"

## When to Use & Test Cases

Should activate: "how do I present this offer?", "who should promote it?", "where do I
find beta users / pioneers?", "which free channels can I use?".

Should NOT activate: "how much do I charge" (pricing), "how do I run a pre-sale"
(launch-validation), "who is my audience" (audience-market).

## Examples

### Example: offering a narrative-therapy course

**Input:** "I have the course outlined. How do I present it and who promotes it?"

**Steps:**
1. One sentence: "a 6-week cohort where therapists practise narrative maps on their own
   cases with weekly feedback".
2. Promoter: yourself first, then small therapy influencers (3-10k) on Instagram.
3. Channel: warm approach to 10 known therapists, plus free content in two existing
   therapist communities.
4. Signal: at least 6 of 10 warm contacts ask a follow-up question = interest.

**Output:** offer sentence, promoter, channels, interest threshold.

### Example: no interest at all

**Input:** "Nobody replied to my cold messages."

**Steps:**
1. Before concluding the offer is wrong, verify the audience: cold outreach to a
   mismatched list produces silence regardless of offer quality.
2. Switch to warm contacts or a community where the pain is discussed.
3. Only then re-test the offer.

**Output:** audience check first, then a re-run with a new channel.

## Edge Cases

### Offer is clear to you and confusing to everyone else
- Unambiguous beats brilliant. If a stranger cannot repeat it, rewrite it before
  spending on promotion.

### Affiliate or influencer asks for money up front
- Small influencers accepting a flat fee are a paid channel, not a partner. Compare
  their cost against the same money spent on ads before agreeing.

### The platform forbids self-promotion
- Deliver value only, no link. Communities that ban promotion convert a single spam post
  into a permanent ban.

### High interest, zero follow-through
- That is the normal transition into stage 5 — interest is cheap. Move to
  `stelow-product-launch-validation` and ask for a real commitment.

---

## Attribution

Based on the e-book **"Guia para criar produtos com aprendizado em ciclos curtos"**
by **calionauta** — [Substack](https://calionauta.substack.com/p/roteiro-pratico-para-validar-ideias).

<!-- stelow:scope3:begin -->
## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.

## Hand-off (workflow mode)

```
stage          : shape
description    : Shape stage. Define run knobs, hill chart, rabbit holes.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <the stage scripts/stelow next reports — run `scripts/stelow next`>
gate           : none
rework-on      : shape
```

Workflow mode: emit the above Hand-off block verbatim, then stop. Fill
`next-candidate` from `scripts/stelow next`: it is the workflow's own
answer, already accounting for this run's intent route and review mode.
The router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **shape** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Shape stage. Define run knobs, hill chart, rabbit holes.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

<!-- stelow:scope3:end -->
