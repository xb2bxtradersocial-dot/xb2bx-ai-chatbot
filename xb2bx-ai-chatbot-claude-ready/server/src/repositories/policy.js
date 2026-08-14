/**
 * Policy checks — prohibited / restricted item screening.
 *
 * Real, deterministic logic (not a stub). Keep these lists aligned with the
 * client's actual Prohibited Items policy; move them to a DB table later if the
 * client wants to manage them from the admin panel.
 */

// Items that may NOT be traded on the platform at all.
const PROHIBITED = [
  'weapon', 'firearm', 'gun', 'ammunition', 'explosive', 'narcotic', 'cocaine',
  'heroin', 'illegal drug', 'counterfeit', 'fake brand', 'replica', 'ivory',
  'endangered', 'human organ', 'child', 'stolen'
];

// Items allowed only under conditions / extra verification.
const RESTRICTED = [
  'alcohol', 'tobacco', 'cigarette', 'vape', 'nicotine', 'cbd', 'cannabis',
  'pharmaceutical', 'medicine', 'medical device', 'supplement', 'chemical',
  'pesticide', 'battery', 'lithium', 'cosmetic', 'food', 'knife', 'currency'
];

function matches(item, list) {
  const t = String(item || '').toLowerCase();
  return list.find((term) => t.includes(term)) || null;
}

/**
 * @param {string} item
 * @returns {{item, status, reason, note}} status: prohibited | restricted | allowed
 */
export function checkProhibited(item) {
  const banned = matches(item, PROHIBITED);
  if (banned) {
    return {
      item,
      status: 'prohibited',
      reason: `Matches a prohibited category ("${banned}") and may not be traded on XB2BX.`,
      note: 'Tell the user plainly it cannot be listed/sourced here; do not give legal advice.'
    };
  }
  const restricted = matches(item, RESTRICTED);
  if (restricted) {
    return {
      item,
      status: 'restricted',
      reason: `May be restricted ("${restricted}") — allowed only with extra verification, licences, or conditions.`,
      note: 'Advise the user it may require verification/compliance steps; offer to connect the team.'
    };
  }
  return {
    item,
    status: 'allowed',
    reason: 'No match against the prohibited or restricted lists.',
    note: 'Appears tradeable; remind the user that listings are still subject to platform policy review.'
  };
}
