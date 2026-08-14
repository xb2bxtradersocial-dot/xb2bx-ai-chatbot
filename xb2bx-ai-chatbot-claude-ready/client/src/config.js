/**
 * Widget configuration — white-label everything from here.
 * Brand name, copy, quick replies, colours, and the backend URL.
 */
// Embedded mode = loaded inside the floating-widget iframe (?embed=1).
export const EMBED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';

export const CONFIG = {
  // Backend
  apiUrl: import.meta.env.VITE_API_URL || 'https://xb2bx-ai-chatbot-backend.vercel.app/api/chat',

  // Branding
  brand: 'XB2BX',
  title: 'XB2BX Assistant',
  tagline: 'ASSISTANT • ONLINE',
  privacyLabel: 'PRIVATE',
  footer: 'Powered by XB2BX · AI Trade Assistant available 24/7',

  // Welcome screen
  welcomeTitle: 'Welcome to XB2BX',
  welcomeText:
    'Meet your AI trade assistant. Source verified suppliers, get quotes, and find answers — all in one friendly conversation.',
  startLabel: 'START CONVERSATION',

  // First assistant message after "Start conversation"
  greeting:
    "Hello! 👋 I'm your **XB2BX** trade assistant. Whether you want to source products, find verified suppliers, prepare an RFQ, or just have a quick question — I'm here to help. What can I do for you today?",

  // Suggestion chips shown under the greeting
  quickReplies: [
    { icon: '🔎', label: 'Find verified suppliers', text: 'I want to find verified suppliers for a product.' },
    { icon: '📦', label: 'Search products', text: 'Show me products in the catalogue.' },
    { icon: '💳', label: 'Membership & pricing', text: 'Tell me about XB2BX membership plans and pricing.' },
    { icon: '💬', label: 'Talk to support', text: 'I need help from customer support.' }
  ]
};
