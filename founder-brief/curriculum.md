# Technical Architecture Curriculum

One topic per day, in order. Day number = days elapsed since **2026-07-20** (day 0),
modulo the total topic count — so the curriculum restarts automatically when it
completes, by which point topics deserve a second pass with fresh eyes anyway.

Each daily lesson must cover, for its topic:
1. **The concept** — what it is, precisely, in 2–3 sentences.
2. **Layman's terms** — an analogy from everyday life that actually holds up.
3. **Trade-offs** — what you gain, what you pay, and the signal that tells you to use it (or avoid it).
4. **Self-test** — one sharp question the reader should be able to answer after the lesson.

Where topics build on earlier ones, the lesson should say so explicitly
("this builds on caching from day 4...").

## Phase 1 — Foundations of scale (days 0–13)

0. Client–server architecture & the request/response lifecycle
1. Horizontal vs. vertical scaling
2. Load balancing (round-robin, least-connections, consistent hashing)
3. DNS and how traffic actually finds your servers
4. Caching fundamentals (cache-aside, write-through, TTLs, invalidation)
5. CDNs and edge delivery
6. Stateless vs. stateful services (and why statelessness enables scale)
7. Database indexing — what an index really is and what it costs
8. SQL vs. NoSQL — the real decision criteria, not the hype
9. Database replication (leader/follower, read replicas, replication lag)
10. Database sharding & partitioning strategies
11. Connection pooling and why databases fall over before app servers do
12. The N+1 query problem and ORM pitfalls
13. Vertical slice review: how a request flows through a scaled web app end-to-end

## Phase 2 — Distributed systems core (days 14–27)

14. The CAP theorem — what it actually says and what it doesn't
15. Consistency models: strong, eventual, causal, read-your-writes
16. Idempotency — the most underrated API design property
17. Message queues (RabbitMQ/SQS): decoupling producers from consumers
18. Pub/sub vs. point-to-point messaging
19. Event-driven architecture — events as facts, not commands
20. Kafka and the distributed log abstraction
21. Exactly-once vs. at-least-once delivery (and why exactly-once is mostly a lie)
22. Distributed transactions, two-phase commit, and why everyone avoids them
23. The Saga pattern — long-running workflows without distributed transactions
24. Consensus: Raft/Paxos in plain terms, and when you need them
25. Leader election and split-brain problems
26. Clocks in distributed systems: NTP, logical clocks, vector clocks
27. Vertical slice review: designing an order-processing pipeline with queues and sagas

## Phase 3 — Services, APIs, and boundaries (days 28–41)

28. Monolith vs. microservices — the honest trade-off, and the modular monolith middle path
29. Domain-driven design: bounded contexts as the unit of service decomposition
30. REST API design: resources, verbs, versioning, pagination
31. GraphQL vs. REST — who should own the shape of the response
32. gRPC and binary protocols — when HTTP/JSON isn't enough
33. API gateways and backend-for-frontend (BFF)
34. Service discovery and service meshes
35. Circuit breakers, retries, backoff, and jitter — surviving your dependencies
36. Rate limiting and load shedding — surviving your users
37. Webhooks vs. polling vs. streaming for third-party integration
38. Authentication: sessions, JWTs, OAuth2/OIDC in plain terms
39. Authorization: RBAC, ABAC, and multi-tenant permission models
40. Multi-tenancy architectures: shared schema vs. schema-per-tenant vs. instance-per-tenant
41. Vertical slice review: designing a B2B SaaS API from scratch

## Phase 4 — Data, storage, and processing (days 42–55)

42. ACID vs. BASE — what a transaction guarantee is really buying you
43. Write-ahead logs and how databases survive crashes
44. LSM trees vs. B-trees — why write-heavy and read-heavy stores differ
45. Object storage (S3) and why it changed system design
46. Data lakes, warehouses, and lakehouses — where analytics data lives
47. ETL vs. ELT and the modern data stack
48. Batch vs. stream processing (Spark vs. Flink mental models)
49. Change data capture (CDC) — the database as an event source
50. Search infrastructure: inverted indexes and Elasticsearch
51. Time-series data and why it breaks normal databases
52. Full-text search vs. semantic search
53. Data modeling: normalization vs. denormalization as a scaling decision
54. Backups, point-in-time recovery, and RPO/RTO
55. Vertical slice review: designing the data platform for a growing SaaS

## Phase 5 — Reliability, operations, and delivery (days 56–69)

56. SLIs, SLOs, SLAs, and error budgets
57. Observability: logs vs. metrics vs. traces
58. Distributed tracing — following one request across 12 services
59. Health checks, liveness vs. readiness, and graceful degradation
60. Deployment strategies: blue-green, canary, rolling, feature flags
61. Infrastructure as code — why servers became cattle, not pets
62. Containers and Docker in plain terms
63. Kubernetes — what problem it solves and what it costs you
64. Serverless and FaaS — the economics and the cold-start tax
65. CI/CD pipelines and trunk-based development
66. Chaos engineering and designing for failure
67. Incident response, postmortems, and blameless culture
68. Capacity planning and performance testing
69. Vertical slice review: the operational maturity ladder for a startup

## Phase 6 — AI/ML systems architecture (days 70–83)

70. The anatomy of an LLM application: prompt, context, model, output
71. Embeddings — turning meaning into geometry
72. Vector databases and approximate nearest-neighbor search
73. RAG (retrieval-augmented generation): architecture and failure modes
74. Chunking strategies and why retrieval quality decides RAG quality
75. Fine-tuning vs. RAG vs. prompting — the build-vs-buy of model behavior
76. LLM inference infrastructure: GPUs, batching, KV caches, and why tokens cost what they cost
77. Model routing and cascades — cheap models first, expensive models when needed
78. Agent architectures: tool use, planning loops, and guardrails
79. Evals — how you actually know your AI feature works
80. LLM observability: tracing prompts, costs, and quality in production
81. AI security: prompt injection, data leakage, and the new attack surface
82. Structured outputs, function calling, and making LLMs reliable components
83. Vertical slice review: architecting an AI-native SaaS product end-to-end

## Phase 7 — Architecture judgment for founders (days 84–89)

84. Build vs. buy — a decision framework, with the AI-era twist
85. Technical debt as a financial instrument: when to borrow, when to repay
86. Conway's Law — your org chart ships your architecture
87. Choosing boring technology — innovation tokens and where to spend them
88. Scaling premature vs. scaling late — reading the signals
89. How to run an architecture review as a non-implementing founder: the questions that expose weak designs
