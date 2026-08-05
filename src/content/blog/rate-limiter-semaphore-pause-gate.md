---
title: A rate limiter was not enough to stop us hammering an upstream API
description: Why a token bucket in front of every outbound call still got us 429s, and how a concurrency semaphore plus a shared pause-gate turned out to be the other two thirds of what "rate limit" actually means.
date: 2026-08-05
tags:
  - systems
  - concurrency
  - http
  - reliability
---

We had a batch job that talked to an upstream ERP API. Tens of thousands of
requests per run, a documented quota, and an obvious first move. This is the
story of how that obvious first move was about a third of the answer, told as
the sequence of questions we actually asked ourselves.

## We have a documented quota. Just rate limit, right?

That was the plan. The gateway in front of the ERP documented a quota of about
49,000 requests per minute. That's roughly 800 requests per second, which felt
generous — more than we intended to use. So we put a fixed-window limiter in
front of every outbound HTTP call:

```
withRateLimit(limit = 49_000, window = 1 minute, () => http.get(url))
```

Every call takes a token, the window refills, and if we ever get near the
ceiling the limiter holds requests back. We shipped it and considered the
problem solved.

## Problem solved?

No. We started getting throttled at throughput nowhere near 800 requests per
second.

The gateway quota was real, it just wasn't the constraint that bound us. Behind
the gateway sat an actual OData service, deployed per environment, with its own
per-environment limits. Those limits undercut the gateway quota by roughly 40x.
When we stopped reading and started measuring, sustained throughput sat at
around 20 requests per second. Not 800.

The lesson is worth stating plainly, because I don't think it's obvious until
it bites you: **the number in the documentation is the ceiling of the outermost
layer, not of the thing you are actually talking to.** A request passes through
a gateway, a service, a database connection pool, and each of those has its own
opinion about how much you get. The one that stops you is the smallest, and the
smallest is usually the one nobody documented. Measure it.

So we dropped the limiter to a number derived from measurement instead of docs.

## Now problem solved?

Still no. And this is the part I found genuinely surprising, because it's not a
tuning mistake — it's a category mistake.

A rate limiter controls **the rate at which requests are started**. It says
nothing whatsoever about how many are in flight at once.

Watch what that means with real numbers. Suppose each request takes 5 seconds to
complete and the limiter allows 20 starts per second:

```
t=1s   started 20   completed 0    in flight 20
t=2s   started 40   completed 0    in flight 40
t=3s   started 60   completed 0    in flight 60
t=4s   started 80   completed 0    in flight 80
t=5s   started 100  completed 0    in flight 100
t=6s   started 120  completed 20   in flight 100
```

The limiter is doing its job perfectly. We never exceed 20 starts per second. We
also have 100 simultaneously open connections against the upstream, and if
latency degrades — which it does, precisely when you're loading a service —
that number keeps climbing. Slower responses mean more overlap means more
concurrent connections means slower responses.

And the upstream service enforced, separately, a maximum of about 100 concurrent
requests. A completely different limit from the throughput quota, checked by a
completely different mechanism. We were passing the rate check and failing the
concurrency check.

## Aren't rate and concurrency basically the same thing?

They're orthogonal, and it's worth having the vocabulary for it. A token bucket
**meters arrivals**. A semaphore **bounds occupancy**. One is about the door,
the other is about the room.

Little's law is the neat way to put it:

```
concurrency = arrival rate × latency
```

Fix only the arrival rate and you've left concurrency free to grow with latency,
which is the one variable you don't control. Twenty requests per second at 200ms
is four concurrent. Twenty per second at 5 seconds is a hundred. Same limiter,
same configuration, 25x the occupancy — determined entirely by how the upstream
happens to be feeling.

So we added a semaphore capping in-flight requests:

```
withPermit(semaphore, () =>
  withRateLimit(() => http.get(url))
)
```

One detail matters more than it looks: **the permit is held until the response
completes, not until the request is sent.** A permit released at send time
measures nothing — it just becomes a slower rate limiter. Occupancy means the
request is still open, so the permit's lifetime has to be the request's
lifetime, release in a finalizer, released on failure and timeout too.

## And now? Surely now.

Now we got fewer 429s. We still got some — bursts, other clients sharing the
environment, a slow window. So the next question was what to do when the
upstream does tell us to stop.

The default answer is retry with backoff, and the default answer is a trap. A
naive retry makes a burst **strictly worse**: the load that produced the 429 is
now the load that produced the 429 plus a retry of every request in it. You've
taken the exact traffic shape the server just rejected and multiplied it.
Exponential backoff and jitter help with the shape, but they don't address the
real problem, which is this:

**A per-fiber backoff is useless when the quota is per-environment.** One worker
politely sleeping for two seconds while 99 other workers keep hammering changes
nothing. The upstream doesn't see 100 clients, it sees one environment's worth
of load. Backing off individually is each worker solving a problem none of them
has alone.

So the backoff has to be **shared**.

## What does a shared backoff look like?

We added a pause-gate: a single mutable "closed until" deadline that lives
outside any one request.

```
gate = { closedUntil: 0 }

onTooManyRequests(response):
  retryAfter = parseRetryAfter(response) ?? defaultPause
  gate.closedUntil = max(gate.closedUntil, now() + retryAfter)   // only moves forward

waitAtGate():
  while now() < gate.closedUntil:
    sleep(gate.closedUntil - now())    // re-read on wake, don't assume
```

Every request waits at that gate before doing anything else — new requests and
retries alike. One 429 from any worker throttles the entire fleet, which is
exactly what a shared quota demands. The deadline comes from the server's
`Retry-After` header when it sends one, because the server knows more about its
own recovery than our guess does.

Two small details in there earn their keep:

**The deadline only ever moves forward.** It's a `max` of the old and new
values, never an assignment. Otherwise a late-arriving 429 carrying a short
`Retry-After` could *shorten* a longer pause someone else already set — a stale
response quietly cancelling the fleet-wide brake.

**A sleeper that wakes must re-check the gate**, not assume it's open. The
deadline may have moved out while it slept. That's why the wait is a loop with
a fresh read, not a single sleep to a captured timestamp. Getting this wrong
gives you a gate that mostly works and leaks a trickle of requests during
exactly the windows it was supposed to close.

## So the gate is the real fix, and the semaphore was optional?

This is the twist that made all three pieces click for me.

Think about what happens the moment the gate reopens. Every worker parked behind
it — potentially hundreds — is released *at the same instant*. Whatever backlog
accumulated during the pause becomes a single synchronized spike, aimed at a
service that just told us it was overloaded.

That's a thundering herd straight back into the 429 that caused the pause. The
gate, alone, turns a burst into a rhythm of bursts.

The semaphore is what makes reopening survivable. Only N workers can proceed at
once; the rest wait for permits. The flood becomes a trickle. The gate stops the
bleeding, the semaphore controls how you come back.

Each piece covers a failure the other two can't see.

## What's the final ordering, and why that order?

```
waitAtGate()            // 1. is the fleet paused right now?
  → acquirePermit()     // 2. is there room in flight?
    → takeRateToken()   // 3. is there budget this window?
      → execute()       // 4. go
```

- **Gate first**, because it's the cheapest possible "no". If the fleet is
  paused there's no point holding a concurrency permit or burning a rate token
  while you sleep — you'd be occupying a slot that does nothing but wait.
- **Permit second**, because it's the constraint that blocks longest. Waiting
  for a permit *without* holding a rate token means the token you eventually
  take is spent immediately, not stale.
- **Token third**, right before execution, so the rate limiter meters actual
  departures rather than intentions.
- **Execute last**, holding the permit until the response completes, and pushing
  the gate forward if the response is a 429.

Order matters here in a way that's easy to miss: swap gate and permit and a
paused fleet holds every permit it has while doing nothing. Swap permit and
token and your rate limiter measures a queue instead of traffic.

## The general lesson

"Rate limit" sounds like one control. It's at least three:

1. **Arrival rate** — how fast you start requests. A token bucket.
2. **Occupancy** — how many are open at once. A semaphore. Grows with latency
   even when arrival rate is perfectly constant.
3. **A shared reaction to being told to stop** — one deadline, fleet-wide,
   driven by the server. Not per-worker, because the quota isn't per-worker.

An upstream service will happily enforce all three independently, with different
limits, different error responses, and documentation for at most one of them.
Your client, meanwhile, implements the first one and calls it done.

We did. It took three surprises to stop.
