/**
 * Replaces {{variableName}} placeholders in template text with provided values.
 * Supports: firstName, companyName, ownerName, and any other alphanumeric variable.
 * Case-insensitive variable matching, handles whitespace inside braces e.g. {{ firstName }}.
 *
 * @param {string} text - The raw template string
 * @param {Record<string, string|number|null|undefined>} variables - The replacement values
 * @returns {string} - Rendered string
 */
export function renderTemplateVariables(text, variables = {}) {
  if (!text || typeof text !== 'string') return '';

  // Create lowercase key map for case-insensitive lookup
  const normalizedVars = Object.entries(variables || {}).reduce((acc, [key, val]) => {
    acc[key.toLowerCase()] = val !== undefined && val !== null ? String(val) : '';
    return acc;
  }, {});

  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, varName) => {
    const key = varName.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(normalizedVars, key)) {
      return normalizedVars[key];
    }
    return ''; // Replace unrecognized/unprovided variables with empty string
  });
}

export default {
  renderTemplateVariables,
};

