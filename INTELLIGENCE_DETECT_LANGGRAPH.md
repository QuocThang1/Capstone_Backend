# Intelligence Detect LangGraph Layer

## Current Architecture Summary

- Backend: Express 5, Mongoose, JWT auth middleware, DAO/service/controller/route layering.
- Frontend: React 19 + Vite, Tailwind-style classes, axios wrapper in `src/utils/axios.customize.js`.
- Database models used by Intelligence Detect:
  - `Project`: members, `boardColumns`, `activeWorkflowId`.
  - `Issue`: status, assignee, priority, sprint, due date, story points, timestamps.
  - `Sprint`: start/end date and status.
  - `Workflow`: transitions.
  - `History`: issue field changes. Status age uses latest `History.field === "Status"` and falls back to `Issue.updatedAt` because the schema has no `statusChangedAt`.

## File Placement

The AI workflow layer is isolated under:

- `src/langgraph/intelligence_detect/state.js`
- `src/langgraph/intelligence_detect/intentClassifier.js`
- `src/langgraph/intelligence_detect/dataFetcher.js`
- `src/langgraph/intelligence_detect/normalizer.js`
- `src/langgraph/intelligence_detect/ruleEngine.js`
- `src/langgraph/intelligence_detect/llmReasoning.js`
- `src/langgraph/intelligence_detect/recommendation.js`
- `src/langgraph/intelligence_detect/reportGenerator.js`
- `src/langgraph/intelligence_detect/responseFormatter.js`
- `src/langgraph/intelligence_detect/graph.js`

Integration points:

- Service: `src/services/intelligenceDetectAgentService.js`
- Controller: `src/controllers/intelligenceDetectController.js`
- Routes: `src/routes/intelligenceDetectRoutes.js`
- Mounted at: `/v1/api/intelligence_detect` and `/api/intelligence_detect`

## Environment

LLM is optional. Rule-based detection works without any LLM key.

```env
INTELLIGENCE_DETECT_LLM_API_KEY=
INTELLIGENCE_DETECT_LLM_BASE_URL=https://api.openai.com/v1
INTELLIGENCE_DETECT_LLM_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` and `OPENAI_MODEL` are also accepted as fallback env names.

## API

```http
POST /v1/api/intelligence_detect/analyze
POST /v1/api/intelligence_detect/detect
POST /v1/api/intelligence_detect/report
POST /api/intelligence_detect/analyze
POST /api/intelligence_detect/detect
POST /api/intelligence_detect/report
```

Example:

```json
{
  "query": "Sprint này có bottleneck không?",
  "projectId": "PROJECT_ID",
  "sprintId": "SPRINT_ID",
  "timeRange": {
    "from": "2026-05-01",
    "to": "2026-05-31"
  }
}
```

Response shape:

```json
{
  "EC": 0,
  "EM": "Bottleneck analysis completed",
  "data": {
    "intent": "detect_bottleneck",
    "summary": "Detected 2 bottleneck signal(s).",
    "bottlenecks": [],
    "recommendations": [],
    "report": null,
    "chartsData": {},
    "metadata": {}
  }
}
```

## Supported Rules

- `TASK_STUCK`: task stayed in current status longer than `daysInStatus`.
- `STATUS_OVERLOAD`: status task count exceeds `maxTasksPerStatus`.
- `TASK_OVERDUE`: due date passed and task is not done.
- `TASK_STALE`: task has not been updated longer than `staleDays`.
- `ASSIGNEE_OVERLOAD`: assignee has too many active tasks.
- `SPRINT_RISK`: sprint is near end date with too many remaining active tasks.
- `HIGH_PRIORITY_BLOCKED`: high/highest priority task is stuck or overdue.

Default thresholds live in `src/langgraph/intelligence_detect/constants.js`.
