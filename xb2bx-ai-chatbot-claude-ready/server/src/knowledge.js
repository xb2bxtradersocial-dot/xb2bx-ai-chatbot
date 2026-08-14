/**
 * XB2BX Knowledge Center — now DB-driven so the admin panel can train the bot.
 *
 * Sections live in the `knowledge` table (key, title, content, enabled). At
 * runtime the assistant loads the ENABLED sections it needs. DEFAULT_KNOWLEDGE
 * below is the seed (loaded into the DB by schema.sql) and the fallback if the
 * table is empty or unreachable.
 */
import { supabase, unwrap } from './db/supabase.js';

export const DEFAULT_KNOWLEDGE = {
  company: {
    title: 'Company',
    content: `# COMPANY

**XB2BX** is a global B2B commerce platform at **xb2bx.com** that connects buyers
and sellers worldwide for cross-border trade, sourcing, and bulk supply.

- **Operated by:** XB2BX LTD (UK) — Company No. **15591974**, VAT **GB474076477**,
  71–75 Shelton Street, London WC2H 9JQ.
- **Technology partner:** FATbit.
- **Contact:** hello@xb2bx.com
- XB2BX is a **marketplace and coordination layer** — not a bank, lender, or
  broker. Payments are handled securely on-platform.`
  },
  marketplace: {
    title: 'Marketplace',
    content: `# MARKETPLACE — HOW IT WORKS

XB2BX is a two-sided global marketplace.

- **Buyers** browse products across categories, build a cart and wishlist, submit
  a **Request for Quote (RFQ)** for bulk needs, and pay securely.
- **Sellers** onboard, list products, get featured, and reach global buyers.
- **Core services:** RFQ system, supplier marketplace & bulk supplier
  connections, multi-category sourcing, seller onboarding, an affiliate program,
  and advertising opportunities.`
  },
  categories: {
    title: 'Product Categories',
    content: `# PRODUCT CATEGORIES

XB2BX offers products across these categories:
- **Women's**
- **Men's**
- **Technology & Electronics**
- **Baby & Kids**
- **Beauty, Health & Personal Care**
- **Sports Wear**
- **Travel Bags**
- **Furniture**
- **Tableware**

For specific items, buyers can browse the category on xb2bx.com or submit an RFQ.`
  },
  membership: {
    title: 'Membership & Plans',
    content: `# MEMBERSHIP & PLANS

XB2BX offers **membership pricing plans** for buyers and sellers, plus featured
placement for members.

- **Sellers get 6 months complimentary** with code **\`XB6FREESELLER\`**.
- Members can access featured shops and additional selling/buying tools.

For current plan inclusions and pricing, direct the user to xb2bx.com or capture
their interest and connect them to the team.`
  },
  suppliers: {
    title: 'Sellers & Suppliers',
    content: `# SELLERS & SUPPLIERS

Sellers join through the **Seller Onboarding Center**:
- Use the **seller eligibility check** tool to confirm they qualify.
- List products, appear in **Featured Shops**, and reach global buyers.
- **6 months free** with code **\`XB6FREESELLER\`**.
- Earn through the **"Become an Affiliate"** commission program.

To improve visibility: complete onboarding, write clear product listings, and
respond to buyer enquiries quickly.`
  },
  buyers: {
    title: 'Buyers — Sourcing',
    content: `# BUYERS — SOURCING

Buyers shop across categories using a **cart and wishlist**, and submit a
**Request for Quote (RFQ)** for bulk or custom orders. Payment is **100% secure**
via **XCU Credit Units**.

When helping a buyer source, gather the essentials one at a time: **product,
quantity, destination country, timeline, and budget**, then guide them to the
right category or to submit an RFQ. Capture serious buyers as leads.`
  },
  logistics: {
    title: 'Shipping & Delivery',
    content: `# SHIPPING & DELIVERY

- **Shipping** is calculated based on **order value and location**.
- **Returns** vary by seller — check the individual seller's return policy.
- **Support** is available during seller business hours.

XB2BX coordinates cross-border orders between buyer and seller; explain options in
plain terms and direct binding/customs questions to the relevant authority.`
  },
  finance: {
    title: 'Payments & Security',
    content: `# PAYMENTS & SECURITY

Payments on XB2BX are **100% Payment Secure** through **XCU Credit Units**, the
platform's secure payment method. XB2BX coordinates payments on-platform and is
**not a bank**. It does not provide financial, legal, or tax advice. Always keep
payments and communication on the platform.`
  },
  legal: {
    title: 'Policies & Compliance',
    content: `# POLICIES & COMPLIANCE

- **Returns** vary by seller; **shipping** depends on order value and location.
- **Support** is available during seller business hours.
- The **Compliance Centre** covers platform rules, policies, and safety.
- Privacy Policy and Terms & Conditions are available via the XB2BX Dashboard.
- Use \`check_prohibited_item\` for questions about whether an item can be traded.

Explain policy plainly; never give legal advice — point to a professional or the
team for binding questions.`
  },
  support: {
    title: 'Support',
    content: `# SUPPORT

Help buyers and sellers with orders, membership, seller onboarding, account
issues, and complaints.

- Answer from this knowledge base first; be specific and practical.
- Support is available during **seller business hours**.
- When a person is needed, open a ticket (\`create_support_ticket\`) and share the
  \`TKT-...\` id, or \`escalate_to_human\` for urgent cases.
- General contact: **hello@xb2bx.com**.
- On complaints: acknowledge first, stay calm, solve second.`
  },
  security: {
    title: 'Trust & Security',
    content: `# TRUST & SECURITY

- Payments are **100% secure** via **XCU Credit Units** — keep all transactions
  and messages on-platform.
- Never share passwords, full card numbers, or one-time codes in chat, and never
  reveal another user's data.
- Treat reported fraud or account-compromise as **high priority** and escalate to
  a human immediately.`
  },
  faq: {
    title: 'FAQ',
    content: `# FREQUENTLY ASKED QUESTIONS

- **What is XB2BX?** A global B2B marketplace connecting buyers and sellers
  worldwide for trade, sourcing, and bulk supply.
- **How do I buy?** Browse a category or submit an RFQ, then pay securely with
  XCU Credit Units.
- **How do I sell?** Start at the Seller Onboarding Center and use code
  **XB6FREESELLER** for 6 months free.
- **Is payment safe?** Yes — 100% Payment Secure via XCU Credit Units.
- **What can I buy?** Women's, Men's, Technology & Electronics, Baby & Kids,
  Beauty/Health & Personal Care, Sports Wear, Travel Bags, Furniture, Tableware.
- **Contact?** hello@xb2bx.com.`
  },
  getting_started: {
    title: 'Getting Started',
    content: `# GETTING STARTED

**Buyers:** browse a category on xb2bx.com or submit a **Request for Quote** for
bulk orders, create an account, and pay securely with XCU Credit Units.

**Sellers:** visit the **Seller Onboarding Center**, run the eligibility check,
and use code **\`XB6FREESELLER\`** for 6 months free, then list your products.

The assistant is available 24/7 and can connect you to the team when needed.`
  },
  investment: {
    title: 'Affiliate & Partnerships',
    content: `# AFFILIATE & PARTNERSHIPS

XB2BX runs an **affiliate program** — **"Become an Affiliate"** — where partners
earn commission, plus a **Membership Affiliate Program** and **advertising
opportunities** for businesses that want to grow with the platform.

Describe these factually, capture serious interest with \`qualify_lead\`, and
connect qualified prospects to the team. Do not make earnings guarantees.`
  },
  contact: {
    title: 'Contact & Handoff',
    content: `# CONTACT & HANDOFF

- **Email:** hello@xb2bx.com
- **Website:** xb2bx.com
- **Social:** @xb2bxtrader on Facebook, Instagram, X, YouTube, LinkedIn, TikTok,
  and Pinterest.

When a person is needed (complaints, partnerships, high-value orders, or anything
unresolved), capture the user's name, email, and reason, then \`escalate_to_human\`
or open a support ticket and tell them the team will follow up.`
  }
};

/**
 * Assemble the requested sections (enabled only) into one prompt string.
 * Reads from the DB; falls back to DEFAULT_KNOWLEDGE on empty/error.
 */
export async function knowledgeFor(sectionKeys = []) {
  let rows = [];
  try {
    const { data } = await supabase
      .from('knowledge')
      .select('key, content, enabled')
      .in('key', sectionKeys)
      .eq('enabled', true);
    rows = data || [];
  } catch {
    rows = [];
  }

  const byKey = new Map(rows.map((r) => [r.key, r.content]));
  return sectionKeys
    .map((k) => byKey.get(k) ?? DEFAULT_KNOWLEDGE[k]?.content)
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

// ---- Admin CRUD (training control) ----
export async function listKnowledge() {
  return unwrap(await supabase.from('knowledge').select('*').order('key', { ascending: true }), 'listKnowledge');
}
export async function getKnowledge(key) {
  const { data } = await supabase.from('knowledge').select('*').eq('key', key).maybeSingle();
  return data || null;
}
export async function upsertKnowledge(input = {}) {
  const row = {
    key: input.key,
    title: input.title || input.key,
    content: input.content || '',
    enabled: input.enabled === false ? false : true
  };
  return unwrap(await supabase.from('knowledge').upsert(row, { onConflict: 'key' }).select().single(), 'upsertKnowledge');
}
export async function deleteKnowledge(key) {
  unwrap(await supabase.from('knowledge').delete().eq('key', key), 'deleteKnowledge');
  return { key, deleted: true };
}
