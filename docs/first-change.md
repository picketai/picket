---
icon: lucide/graduation-cap
---

# Your first change

In this tutorial we will set up a tiny project, make a small change in the fast lane, and add a feature in the order lane. At the end, the project holds commits that Picket made for us, each one after our reply.

!!! note "Before you start"

    You need what [Get started](index.md#installation) lists: Claude Code signed in, Node.js 22 or later, and git. The tutorial uses your Claude plan like any other session, and the feature in step 5 starts three agents.

## 1. Create the project

Make a folder with a git repository in it:

``` sh
mkdir bookshop
cd bookshop
git init
mkdir src test
```

Add three files: the package, one function, and one test for it.

``` json title="package.json"
{
  "name": "bookshop",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "test": "node --test" }
}
```

``` js title="src/price.mjs"
export function total(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

``` js title="test/price.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { total } from "../src/price.mjs";

test("adds price times quantity for every item", () => {
  assert.equal(total([{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }]), 25);
});
```

Run the test, then commit:

``` sh
npm test
git add .
git commit -m "chore: start the bookshop"
```

The test output ends with these two lines. Picket runs this same command later, so it has to pass now.

``` text
ℹ pass 1
ℹ fail 0
```

## 2. Set up Picket

``` sh
npx @picketai/picket@alpha init
git add .
git commit -m "chore: set up Picket"
```

`init` reports each step it took. If the `plugin` step says `failed`, run the command it prints, then carry on.

## 3. Start a session

``` sh
claude
```

Ask for the status:

``` text
/picket:inspecting
```

It says there are no work items yet. If the command is unknown, the plugin is not enabled: run `/plugin` and enable `picket@picketai`.

## 4. Make a small change

Type the request as you would say it to a colleague:

``` text
Rename the function total to orderTotal.
```

Picket puts this in the fast lane, because it touches two files and there is nothing to design. Claude makes the change, runs the test, and stops with one block. Yours will differ in its details; it has this shape:

``` text
## Expedited: 20261122-rename-total-to-ordertotal

total is now orderTotal, in the module and in its test.

Files: src/price.mjs, test/price.test.mjs
Tests: passed
Lint: none detected
Verified: <how Claude ran the renamed function>
Comments: none
Commit: refactor(price): rename total to orderTotal   (staged; your answer commits it)

[c] commit   [x] discard: <why>
```

Notice two things. The `Commit` line says the change is staged, so nothing is in git history yet. The last line holds your possible replies. Reply:

``` text
c
```

Now look at the history from inside the session. A line that starts with `!` runs a shell command:

``` text
! git log --oneline -3
```

The newest commit carries the message from the block. That was a whole change in the fast lane: one request, one stop, one commit.

## 5. Add a feature

Ask for something bigger:

``` text
Add a discount module: a function that takes the order total and a coupon code and returns the reduced total, with tests.
```

This time Picket picks the order lane, and more happens before it stops:

1. An architect writes a short plan into the work item's folder.
2. A developer implements the first phase of that plan and checks it.
3. Picket stops and shows a gate packet.

The packet has this shape:

``` text
▶ phase 1/2 done · 20261122-add-a-discount-module
  discount(total, code) returns the reduced total for a known coupon.

  tests     passed (4/4)
  lint      none detected
  verified  <how the developer ran the new function>
  files     src/discount.mjs, test/discount.test.mjs
  decisions · an unknown coupon leaves the total unchanged
  commit    feat(discount): reduce the total by a coupon

[a] approve   [r] run through 2   [x] reject: <why>
```

Notice `phase 1/2`: the plan has two phases here, and yours may have one, two or three. Notice the `decisions` line too: it is where the developer tells us about a choice it made. Approve the phase:

``` text
a
```

The phase is committed and the next one starts. Reply `a` at each packet that follows.

After the last phase, a fresh reviewer reads the whole change against our request, and Picket prints the closing block:

``` text
## Order closed: 20261122-add-a-discount-module
Phases: 2 · commits 3f2a9c1d..8be4a07e · review: APPROVED
```

If the review asks for changes instead, [Review and testing](review-and-testing.md) says what happens next.

## 6. Look at what it left

``` text
! git log --oneline
```

The history holds the rename and one commit for each phase of the feature, each with the message we saw before we approved it.

The plan is still there too. Open the `order.md` file in the newest folder under `work/`: it holds the decisions the architect made, with the reason for each, and the phases with the checks that proved them done.

## Where to go next

- [The daily loop](how-to.md): the same flow in short, for your real project.
- [The four lanes](lanes/index.md): what each lane is for, including the two we did not use.
- [Gates and replies](gates.md): every reply, including how to reject a phase.
- [Adopt in an existing codebase](adopting.md): bring Picket into a project that already has history.
