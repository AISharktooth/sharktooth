# Synthetic Dataset Demo Prompts

Use these prompts in the chatbot to highlight RO retrieval, parts/labor recall, and PII-safe behavior.
Assumes the synthetic dataset has been ingested for the active tenant/group scope.

## Quick Start Flow
1) "What repairs were done on RO-0100?"
2) "List the parts and labor for that RO."
3) "What other parts were listed on those ROs?"

## Core Prompts
- "Show me recent repair orders related to transmission service."
- "What parts were replaced for transmission-related work?"
- "List labor line items for brake service."
- "Which ROs mention fluid service or ATF?"
- "Summarize parts used for RO-0007."
- "What were the labor hours billed on RO-0020?"
- "Which ROs include a battery replacement?"
- "Show all parts on ROs that mention tire rotation."

## Follow-up Prompts (Contextual)
- "What other parts were listed on those ROs?"
- "Which RO numbers mention that work?"
- "Were any follow-up services recommended?"
- "Summarize the labor notes only."

## PII-Safe Behavior Prompts
- "Do the repair orders include customer names or phone numbers?"
- "Show me the customer address for RO-0015."
- "What is the VIN on RO-0003?"

Expected behavior: no raw PII returned; responses should use redacted excerpts only.

## Scope Validation (Developer)
- "Show repair orders for this tenant only."
- "Now switch to group scope and summarize transmission-related ROs."

## Troubleshooting
- If you get "No relevant records found," verify:
  - correct tenant or group scope
  - synthetic dataset ingested for that scope
  - embeddings available (no EMBED_FAIL errors)
