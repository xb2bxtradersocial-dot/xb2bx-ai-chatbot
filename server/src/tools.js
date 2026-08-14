/**
 * Tools — the action layer that turns the assistant from a chatbot into a
 * business tool. Each tool has a SCHEMA (sent to Claude as a client tool) and an EXECUTOR (runs server-side and is wired to the real database
 * via the repositories). Add a tool here, then list its name on the agents in
 * agents.js that should be allowed to use it.
 */
import { searchSuppliers } from './repositories/suppliers.js';
import { searchProducts } from './repositories/products.js';
import { createLead } from './repositories/leads.js';
import { createRfq } from './repositories/rfqs.js';
import { createListing } from './repositories/listings.js';
import { createTicket, createEscalation } from './repositories/tickets.js';
import { checkProhibited } from './repositories/policy.js';

// ---- Tool schemas (JSON Schema), keyed by name ----
export const TOOL_SCHEMAS = {
  search_suppliers: {
    description:
      'Find and rank verified XB2BX suppliers for a sourcing need. Use when a buyer describes what they want to source.',
    parameters: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'What to source, e.g. "eco-friendly packaging"' },
        category: { type: 'string', description: 'Optional product category' },
        country: { type: 'string', description: 'Optional preferred supplier country' },
        min_quantity: { type: 'number', description: 'Optional minimum order quantity' }
      },
      required: ['product']
    }
  },
  search_products: {
    description: 'Search the XB2BX product catalogue for listed items.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the buyer is looking for' },
        category: { type: 'string', description: 'Optional product category' }
      },
      required: ['query']
    }
  },
  create_rfq: {
    description:
      'Create a Request For Quote and route it to matched suppliers. Confirm product and quantity with the buyer first.',
    parameters: {
      type: 'object',
      properties: {
        product: { type: 'string' },
        quantity: { type: 'number' },
        target_country: { type: 'string' },
        delivery_timeline: { type: 'string' },
        contact_email: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['product', 'quantity']
    }
  },
  create_listing: {
    description: 'Draft a product listing for a verified seller (title, description, SEO keywords).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'string' },
        seller_email: { type: 'string' }
      },
      required: ['title', 'category']
    }
  },
  qualify_lead: {
    description:
      'Capture and score a sales/partnership lead. Gather volume, budget, location, and timeline where possible.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        interest: { type: 'string', description: 'What they want, e.g. "textile sourcing", "franchise"' },
        volume: { type: 'string' },
        budget: { type: 'string' },
        location: { type: 'string' },
        timeline: { type: 'string' }
      },
      required: ['interest']
    }
  },
  check_prohibited_item: {
    description: 'Check whether a product is prohibited or restricted on the platform.',
    parameters: {
      type: 'object',
      properties: { item: { type: 'string' } },
      required: ['item']
    }
  },
  create_support_ticket: {
    description:
      'Open a support ticket for the team to follow up. Use for technical issues, complaints, and account help that needs a person.',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        description: { type: 'string' },
        contact_email: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'] }
      },
      required: ['subject', 'description']
    }
  },
  escalate_to_human: {
    description: 'Hand the conversation to a human agent and capture how to reach the user.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        contact_email: { type: 'string' },
        contact_phone: { type: 'string' }
      },
      required: ['reason']
    }
  }
};

// ---- Executors (wired to the real database via repositories) ----
export const EXECUTORS = {
  async search_suppliers({ product, category, country, min_quantity }) {
    const results = await searchSuppliers({ product, category, country, min_quantity, limit: 5 });
    return { query: { product, category, country, min_quantity }, count: results.length, results };
  },

  async search_products({ query, category }) {
    const results = await searchProducts({ query, category, limit: 5 });
    return { query, category, count: results.length, results };
  },

  async create_rfq(input) {
    return createRfq(input);
  },

  async create_listing(input) {
    return createListing(input);
  },

  async qualify_lead(input) {
    return createLead(input);
  },

  async check_prohibited_item({ item }) {
    return checkProhibited(item);
  },

  async create_support_ticket(input) {
    return createTicket(input);
  },

  async escalate_to_human(input) {
    return createEscalation(input);
  }
};

/** Build the Anthropic client-tools array for a given list of tool names. */
export function toolsFor(names = []) {
  return names
    .filter((n) => TOOL_SCHEMAS[n])
    .map((n) => ({
      name: n,
      description: TOOL_SCHEMAS[n].description,
      input_schema: TOOL_SCHEMAS[n].parameters
    }));
}

/** Run a tool the model asked for. Always returns a JSON string for tool_result. */
export async function runTool(name, input) {
  const fn = EXECUTORS[name];
  if (!fn) return JSON.stringify({ error: 'unknown tool: ' + name });

  try {
    const out = await fn(input || {});
    return JSON.stringify(out);
  } catch (err) {
    console.error(`[tool:${name}]`, err?.message || err);
    return JSON.stringify({ error: String(err?.message || err) });
  }
}
