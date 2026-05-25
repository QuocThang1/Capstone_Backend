const { INTENTS } = require("./constants");
const { createInitialIntelligenceDetectState, addLog } = require("./state");
const { inputClassifierNode } = require("./intentClassifier");
const { dataFetchNode } = require("./dataFetcher");
const { dataNormalizeNode } = require("./normalizer");
const { bottleneckRuleAnalysisNode } = require("./ruleEngine");
const { llmReasoningNode } = require("./llmReasoning");
const { recommendationNode } = require("./recommendation");
const { reportGeneratorNode } = require("./reportGenerator");
const { responseFormatterNode } = require("./responseFormatter");

const needsOnlyFormattedMissingEntityResponse = (state) => (
    state.errors.includes("missing_scope_entity") ||
    state.errors.includes("missing_projectId") ||
    state.errors.includes("forbidden_project_access")
);

const getRouteForIntent = (intent) => {
    switch (intent) {
        case INTENTS.EXPLAIN_BOTTLENECK:
            return [dataFetchNode, dataNormalizeNode, bottleneckRuleAnalysisNode, llmReasoningNode, responseFormatterNode];
        case INTENTS.GENERATE_REPORT:
            return [dataFetchNode, dataNormalizeNode, bottleneckRuleAnalysisNode, llmReasoningNode, recommendationNode, reportGeneratorNode, responseFormatterNode];
        case INTENTS.DASHBOARD_INSIGHT:
            return [dataFetchNode, dataNormalizeNode, bottleneckRuleAnalysisNode, reportGeneratorNode, responseFormatterNode];
        case INTENTS.RECOMMEND_SOLUTION:
        case INTENTS.WORKLOAD_ANALYSIS:
        case INTENTS.SPRINT_HEALTH_ANALYSIS:
        case INTENTS.WORKFLOW_STATUS_ANALYSIS:
        case INTENTS.TASK_STALE_ANALYSIS:
        case INTENTS.DETECT_BOTTLENECK:
        default:
            return [dataFetchNode, dataNormalizeNode, bottleneckRuleAnalysisNode, llmReasoningNode, recommendationNode, responseFormatterNode];
    }
};

const runIntelligenceDetectGraph = async ({ query, context = {}, authUserId }) => {
    const state = createInitialIntelligenceDetectState(query, context);
    state.metadata.authUserId = authUserId;

    await inputClassifierNode(state);
    if (needsOnlyFormattedMissingEntityResponse(state)) {
        await responseFormatterNode(state);
        return state;
    }

    const route = getRouteForIntent(state.intent);
    addLog(state, "graph_route_selected", { nodes: route.map((node) => node.name) });

    for (const node of route) {
        await node(state);
        if (needsOnlyFormattedMissingEntityResponse(state)) {
            await responseFormatterNode(state);
            break;
        }
    }

    return state;
};

module.exports = {
    runIntelligenceDetectGraph,
    getRouteForIntent,
};
