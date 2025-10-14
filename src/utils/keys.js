// src/utils/keys.js

export const triesKey = (dealId) => `aiAttempts:${dealId || 'sin'}`
export const htmlKey  = (dealId) => `aiHtml:${dealId || 'sin'}`
export const commentDraftKey = (dealId) => `dealComment:${dealId || 'sin'}`

