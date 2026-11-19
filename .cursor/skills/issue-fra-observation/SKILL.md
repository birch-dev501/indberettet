---
name: issue-fra-observation
description: "Use when a short observation or an outside issue should become a precise issue: Problem / Forventet / Done-tjek, checked against VISION.md"
---

# Issue fra observation

Turn one observation into one issue. [VISION.md](../../../VISION.md) decides whether it belongs.

## 1. Reproduce

Reproduce the observation when that is cheap. Write only what you saw. Never invent a URL, a number, a click path, or a screenshot.

## 2. Duplicates

Search open issues for the same problem. Link a duplicate instead of filing another.

## 3. Write the issue in Danish

Title: concrete, under 80 characters.

```
## Problem
- What happens, and where.

## Forventet
- What a buildable fix does.
- Fill obvious gaps that belong to the same fix: keyboard, mobile, and screen reader.
- Do not add a new feature.

## Done-tjek
- [ ] Three to six checks a person can verify.
- [ ] One of them is a /verify-indberettet check.
```

## 4. Vision

State whether the issue fits VISION.md, and name the principle. If it does not fit, adapt it, reject it, or say that VISION.md itself would have to change.

## 5. Label

Use one existing label: `fejl`, `forbedring`, `data`, or `drift`.

## 6. Scope

One problem per issue. No personal names, emails, or other identifiers. The issue is public: no personal health information.
