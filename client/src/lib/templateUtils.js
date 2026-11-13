/**
 * Replaces {{variableName}} placeholders in template text with provided values.
 * Supports: firstName, companyName, ownerName, and other variables.
 *
 * @param {string} text
 * @param {Record<string, string|number|null|undefined>} variables
 * @returns {string}
 */
export function renderTemplateVariables(text, variables = {}) {
  if (!text || typeof text !== 'string') return '';

  const normalized = Object.entries(variables || {}).reduce((acc, [k, v]) => {
    acc[k.toLowerCase()] = v !== undefined && v !== null ? String(v) : '';
    return acc;
  }, {});

  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, varName) => {
    const key = varName.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      return normalized[key];
    }
    return '';
  });
}

export const TEMPLATE_VARIABLES = [
  { key: '{{firstName}}', label: 'First Name', example: 'Jane' },
  { key: '{{companyName}}', label: 'Company Name', example: 'Acme Corporation' },
  { key: '{{ownerName}}', label: 'Owner / Rep Name', example: 'Alex Rivera' },
];

export default {
  renderTemplateVariables,
  TEMPLATE_VARIABLES,
};

