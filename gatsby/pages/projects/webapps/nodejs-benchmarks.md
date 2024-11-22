---
name: NodeJs Benchmarks
technology: Node + JQuery + C3 charts
description: An environment for easily running micro-benchmarks on nodejs
screenshots:
    - node-benchmarks-01.png
    - node-benchmarks-02.png
    - node-benchmarks-03.png
    - node-benchmarks-04.png
---

# NodeJs Benchmarks

## Motivation

I really enjoy programming, and sometimes we find ourselves questioning: which method will be more performant ?
But setting up an environment to measure performance, run the performance tests and visualize the results is a very time consuming task, so we usually gave up.
This project arises to reduce that entry barrier, providing a ready to use environment to create and visualize benchmarks targeted at the node-js platform.
You just write the code for the benchmarks, and the environment will take care of running them, measure them and plot some beautiful graphs to see which method is better visually.

All the results and the source code is available publicly, so anyone can contribute and check the results

## Technologies used

Because the actual target of the project is to make easy creating benchmarks for node, all the technologies are server centric.
The results are saved as JSON files and all the views are statically rendered at compile time.
We use JQuery + C3 charts for the client side generated using EJS templates.
On the node side we sue `benchr`, which is a fantastic library that encapsulates `benchmark.js`
