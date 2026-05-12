---
title: "Five tabs at a time: a load testing story"
description: A debugging story about load testing AI agents on Browserbase, and what happens when many isolated BrowserContexts share a single browser process.
date: 2026-05-12
tags:
  - testing
  - browsers
  - playwright
  - ai-agents
---

I've been building AI agents that drive a browser to exercise a web app end-to-end — login, navigate, click around, assert things appear. Standard stuff, except instead of a human, an LLM is making the decisions. The browsers run on Browserbase, which is great because I don't have to spin up Chromium on my laptop and watch my fans take off.

A note on the architecture before I get into the story: I deliberately ran many isolated `BrowserContext`s inside a single browser instance, rather than spinning up a separate browser per agent. Two reasons. First, contexts are dramatically cheaper than full browsers — separate cookies and storage, shared process. Second, Browserbase caps how many concurrent browser sessions you can have, and I wanted to test with more agents than that cap allows. Contexts felt like the right tool: isolation where I needed it (auth, storage), sharing where I didn't. On paper, this is exactly what contexts are for.

The first version worked beautifully. One agent, one context, one happy little run. I added a second agent, then a third. Everything green. I felt clever.

Then I decided to run a *real* test. Fifty agents in parallel, all hitting the same app, all logging in, all doing their thing. This is what load testing is supposed to look like, right?

Almost nothing finished. Most agents timed out on login. The few that got past login then timed out waiting for `DOMContentLoaded`. The handful that got past *that* timed out waiting for the data element to appear on the page. By the end of the run, maybe one or two agents had completed successfully. The rest were corpses.

My first instinct was the obvious one: I'm overloading my server. So I went to look at the Azure metrics. CPU was bursty but fine. Memory was at 40%. Average response time was 1.5 seconds. While the test was burning down in flames, I opened the app in my own browser and clicked around. Snappy. No drama.

That was the moment I started getting suspicious. If the server were really the bottleneck, my browsing would feel it too. Something else was going on.

I scaled the test down. Fifty → twenty. Still failing. Twenty → ten. Still failing, just a bit less catastrophically. Ten → five. Everything worked.

Five tabs working — and everything above five falling apart — was the clue I needed. The number itself isn't magic; what matters is that there's a number at all. Below it, fine. Above it, collapse. That shape of failure pointed me away from the server (which scales smoothly with load, or at least degrades smoothly) and toward something with a hard saturation point. And the only thing in my setup with a hard saturation point that I had *chosen* to share was the browser.

I wasn't running fifty browsers. I was running one browser with fifty tabs.

A `BrowserContext` gives you a clean isolated session — separate cookies, separate storage, separate auth. That's real isolation, and it's why I picked it. But contexts share the underlying browser process, which means they compete for the same finite pool of resources: CPU, memory, network. That's exactly what makes them cheap. When five contexts log in at once, there's plenty of headroom — the browser parses responses, runs JS, updates DOM, and feeds Playwright commands without breaking a sweat. When fifty contexts log in at once, that same browser instance is trying to do fifty tabs' worth of work simultaneously, and it can't. Things back up internally, the 90-second timeout fires, and from my Azure side it looks like nothing happened. Because for many of those agents, nothing did. Their requests never actually made it out.

The fix was almost embarrassingly small. I grouped my contexts in batches of five. Every time I hit five tabs in a browser, I spin up a fresh Browserbase session and start filling that one. Fifty agents now means ten browsers with five tabs each, instead of one browser with fifty tabs. The next test run went green.

The lesson I'm taking from this isn't really about Playwright or Browserbase specifically. It's that **moving the browser to the cloud doesn't move the browser's internal limits to the cloud**. Browserbase gives me a beefier machine than my laptop and saves me from running Chromium locally, but inside that cloud machine there's still a single Chrome process that has to do all the work for all my tabs. The bottleneck wasn't my machine, it wasn't the cloud machine, it wasn't my server. It was the browser, doing what one browser can do.

I was right that contexts are cheaper than browsers. I was wrong to assume "cheaper" meant "free". They share a process, and a process has a saturation point. Five tabs at a time. That's the rule now.
