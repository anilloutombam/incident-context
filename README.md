# Incident Context

Evidence-grounded production incident investigation using structured operational context.

Incident Context connects services, deployments, configuration changes, historical incidents, and runbooks using Sanity structured content and Sanity Context MCP.

Instead of treating incident investigation as document search, it models the relationships between operational events and lets an agent investigate those relationships while keeping **evidence separate from inference**.

> 🚧 Currently being built for the DEV.to Sanity Challenge 2026.

## The Problem

During a production incident, useful context is often scattered across deployments, configuration changes, runbooks, service dependencies, and previous incidents.

Finding similar text isn't enough.

Engineers need to answer questions like:

- What changed before this incident?
- Which services and dependencies are involved?
- Have we seen these symptoms before?
- How was a similar incident resolved?
- Which runbook applies to the currently deployed version?
- What is confirmed evidence, and what is only a possible relationship?

## How It Works

```text
Services ──────┐
Deployments ───┤
Changes ───────┤
Incidents ─────┼──> Sanity
Runbooks ──────┘       │
                       ▼
               Knowledge Base
                       │
                       ▼
               Sanity Context MCP
                       │
                       ▼
                Incident Agent
```

The agent uses structured relationships between operational records rather than relying only on text similarity.

## Core Model

```text
Service    → depends on → Service
Deployment → belongs to → Service
Change     → modifies   → Service
Incident   → affects    → Service
Runbook    → applies to → Service
```

## Evidence First

Incident Context distinguishes between:

- **Fact** — directly supported by stored operational data
- **Historical Evidence** — confirmed findings from previous incidents
- **Possible Relationship** — an agent-generated investigation hypothesis
- **Confirmed Root Cause** — established by incident evidence

The agent should never turn correlation into confirmed causation.

## Initial Demo

The first scenario investigates `INC-208`, a checkout latency incident.

Example questions:

```text
What changed before INC-208?

Have we seen these symptoms before?

Which services are involved?

Which runbook applies?

What evidence suggests retry behavior may be relevant?
```

The agent will connect the current incident with deployments, configuration changes, service dependencies, historical incidents, and applicable runbooks.

## Planned Stack

- TypeScript
- Next.js
- Sanity
- Sanity Knowledge Base
- Sanity Context MCP

## Status

Early development.

The first milestone is establishing the structured Sanity content model and the `INC-208` investigation dataset before building the agent and user interface.

## License

MIT
