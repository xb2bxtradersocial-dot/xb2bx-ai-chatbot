/**
 * The model layer (Anthropic Claude) — settings-driven, with an intent router,
 * client-side tool use, and streamed chunks for the chat widget.
 * Uses the native Anthropic Messages API via fetch (Node 18+), so no extra SDK is required.
 */
import { CONFIG } from './config.js';
import { AGENTS, DEFAULT_AGENT, agentMenu } from './agents.js';
import { knowledgeFor } from './knowledge.js';
import { COMPLIANCE, STYLE } from './compliance.js';
import { toolsFor, runTool } from './tools.js';
import { getEffectiveConfig } from './settings.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c) => {
      if (typeof c === 'string') return c;
      if (c?.type === 'text') return c.text || '';
      return c?.text || '';
    }).join(' ');
  }
  return '';
}

function toClaudeMessages(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-14)
    .map((m) => ({ role: m.role, content: textOf(m.content) }));
}

function responseText(message) {
  return (message?.content || [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text || '')
    .join('');
}

async function anthropicMessage(apiKey, body) {
  if (!apiKey) throw new Error('Anthropic API key is not configured');
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify(body)
  });

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = null; }
  if (!res.ok) {
    const message = data?.error?.message || raw || `Anthropic HTTP ${res.status}`;
    throw new Error(`Anthropic ${res.status}: ${message}`);
  }
  return data;
}

export async function routeAgent(messages) {
  const keys = Object.keys(AGENTS);
  const eff = await getEffectiveConfig();
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = textOf(lastUser?.content).slice(0, 2000) || 'general question';

  try {
    const resp = await anthropicMessage(eff.apiKey, {
      model: eff.routerModel,
      max_tokens: 16,
      temperature: 0,
      system: `Classify the user's message into exactly ONE XB2BX agent.\n${agentMenu()}\n\nReply with ONLY the agent key. Nothing else.`,
      messages: [{ role: 'user', content: text }]
    });
    const out = responseText(resp).trim().toLowerCase();
    return keys.find((k) => out.includes(k)) || DEFAULT_AGENT;
  } catch (err) {
    console.error('[router] fallback:', err?.message || err);
    return DEFAULT_AGENT;
  }
}

async function systemPrompt(agent, eff) {
  const knowledge = await knowledgeFor(agent.knowledge);
  const parts = [
    knowledge,
    `# YOUR ROLE\n\nYou are the **${agent.label}** for XB2BX.\n\n${agent.instructions}`,
    STYLE,
    COMPLIANCE,
    '# DATA ACCURACY\n\nNever invent XB2BX products, suppliers, prices, memberships, policies, or availability. Use the available tools and knowledge base. If the requested information is not available, say so clearly and offer the next useful step.'
  ];
  if (eff.personaExtra) parts.push(`# EXTRA INSTRUCTIONS\n\n${eff.personaExtra}`);
  if (eff.contact?.email || eff.contact?.phone || eff.contact?.hours) {
    parts.push(
      `# CONTACT DETAILS (share when a human handoff is relevant)\n` +
      [eff.contact.email && `Email: ${eff.contact.email}`, eff.contact.phone && `Phone: ${eff.contact.phone}`, eff.contact.hours && `Hours: ${eff.contact.hours}`]
        .filter(Boolean).join('\n')
    );
  }
  return parts.join('\n\n---\n\n');
}

async function run(messages, agentKey, onToken) {
  const agent = AGENTS[agentKey] || AGENTS[DEFAULT_AGENT];
  const eff = await getEffectiveConfig();
  const system = await systemPrompt(agent, eff);
  const convo = toClaudeMessages(messages);
  const tools = toolsFor(agent.tools);
  const actionsTaken = [];

  for (let hop = 0; hop < CONFIG.maxToolHops; hop++) {
    const resp = await anthropicMessage(eff.apiKey, {
      model: eff.mainModel,
      max_tokens: eff.maxTokens,
      temperature: eff.temperature,
      system,
      messages: convo,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? { type: 'auto' } : undefined
    });

    const toolCalls = (resp.content || []).filter((b) => b?.type === 'tool_use');
    if (toolCalls.length) {
      convo.push({ role: 'assistant', content: resp.content });
      const results = [];
      for (const call of toolCalls) {
        const args = call.input || {};
        actionsTaken.push({ tool: call.name, input: args });
        const result = await runTool(call.name, args);
        results.push({ type: 'tool_result', tool_use_id: call.id, content: result });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }

    const reply = responseText(resp).trim() || "I'm here to help — could you tell me a little more about what you need?";
    if (onToken) {
      for (const chunk of (reply.match(/\S+\s*|\s+/g) || [reply])) onToken(chunk);
    }
    return { reply, agent: agent.label, actions: actionsTaken };
  }

  const reply = "I've gathered what I can. Let me connect you with the XB2BX team to take this further. ✅";
  if (onToken) onToken(reply);
  return { reply, agent: agent.label, actions: actionsTaken };
}

export async function reply(messages, agentKey) { return run(messages, agentKey, null); }
export async function replyStream(messages, agentKey, onToken) { return run(messages, agentKey, onToken); }
