# SmartCharge - Technical Design & Refactoring Details

> Last updated: 2026-03-05
> Detailed implementation guidance for each roadmap phase
> Read ROADMAP.md first for the high-level plan
> Phases 1-5 are complete -- see code and CHANGELOG.md for implementation details

---

## 1. Chatbot / RAG Improvements (ROADMAP Phase 7) [OWNER: EXT]

> This section contains design notes for the external contributor.
> The chat system is well-isolated (leaf node in dependency graph).
> Changes here do NOT affect other modules.

### Current Architecture (as built)

```
POST /v1/chat (NO auth middleware)
  -> chat.Handler.Chat()
    -> chat.Service.Chat(ctx, message, stationId, date, hour, isGreen)
      -> queries.ListStations()  [raw DB, no scoring]
      -> buildStationContext()   [top 10 stations into prompt]
      -> provider.Complete()     [OllamaProvider, hard-coded]
      -> parseAction()           [extract [ACTION]...[/ACTION] from LLM output]
      -> createReservationFromAction() [userID=0 BUG]
    -> Return ChatResponse{Role, Content, Recommendations, Action}
```

### Priority Fixes

1. **Auth bug (CRITICAL):** Add auth middleware to chat route in `main.go`. Extract userID in handler, pass to service. Fix `createReservationFromAction` to use real userID.

2. **Provider DI:** Change `NewService` signature:
   ```go
   // FROM:
   func NewService(queries, reservationSvc, cfg) *Service
   // TO:
   func NewService(queries, reservationSvc, provider ai.Provider) *Service
   ```
   Let `main.go` decide which provider to instantiate.

3. **Use scoring engine:** Replace `s.queries.ListStations()` with `s.recommendService.Recommend()` so the LLM gets pre-scored stations with explanations.

4. **Remove backend auto-reservation:** Instead of calling `reservation.Service.Create()` from the chat service, return the action intent in the response. Let the frontend show a confirmation dialog and call the reservation endpoint directly.

### Conversation Memory Design

```sql
CREATE TABLE chat_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id         SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

### RAG Design (Future)

1. Add `pgvector` extension
2. Create `knowledge_embeddings` table (content, source, embedding vector(1536))
3. At query time: embed user message -> cosine similarity -> inject top-k into prompt
4. Sources: station descriptions, FAQ, energy saving tips

---

## 2. Recommendation System Notes [OWNER: EXT]

> The recommendation system was built by an external contributor.
> This section documents the current state and remaining work.
> Phase 2 fixed the core bugs (hardcoded date, default coords, dead code).

### Current State (as of 2026-03-05, post Phase 2)

**What exists:**
- `internal/recommend/service.go` -- `Scorer` interface, `Service` orchestrator, haversine distance calc, `sortAndLimit()`, `joinParts()`
- `internal/recommend/rl.go` -- `RLScorer` with Q-learning, epsilon-greedy exploration
- `GET /v1/stations/recommend` endpoint wired in `station/handler.go`
- Frontend `GlobalAIWidget.tsx` and driver `page.tsx` call recommend endpoint with real user coords

**What works:**
- Composite scoring: load (40%) + distance (20%) + green (25%) + price (15%)
- Station ranking by score
- Dynamic date handling (time.Now() + day query param)
- Real user geolocation via browser API
- Frontend display in GlobalAIWidget, Wallet page, and Driver page AI Smart Pick

**What doesn't work:**
- RL learning: Q-table always empty, `UpdateQValue()` never called

### Remaining Work for EXT

- Wire `UpdateQValue()` call into `reservation.Complete()` (need rlScorer reference in reservation service or an event system)
- Consider persisting Q-table to DB (currently in-memory, lost on restart)
- Implement `CalculateReward()` based on actual charging outcomes
- Consider adding campaign bonus back to scoring formula (currently price is used instead)
