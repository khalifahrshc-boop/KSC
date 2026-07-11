/**
 * Utility to temporarily sanitize stylesheets and window.getComputedStyle by replacing
 * unsupported oklch() and oklab() color functions with standard CSS HSL fallback colors.
 * This prevents html2canvas from crashing during PDF generation while preserving beautiful colors.
 */

export function oklchToHsl(matchStr: string): string {
  const openParen = matchStr.indexOf('(');
  const closeParen = matchStr.lastIndexOf(')');
  if (openParen === -1 || closeParen === -1) return 'rgb(120, 120, 120)';
  
  const content = matchStr.slice(openParen + 1, closeParen).trim();
  // Split by whitespace, slashes, or commas
  const tokens = content.split(/[\s,/]+/).filter(Boolean);
  if (tokens.length < 3) return 'rgb(120, 120, 120)';

  // Parse L (Lightness)
  let lVal = tokens[0];
  let L = 0;
  if (lVal.endsWith('%')) {
    L = parseFloat(lVal) / 100;
  } else {
    L = parseFloat(lVal);
  }

  // Parse C (Chroma)
  let C = parseFloat(tokens[1]);

  // Parse H (Hue)
  let H = parseFloat(tokens[2]);

  // Parse optional alpha
  let alpha: string | null = null;
  if (tokens.length >= 4) {
    let aVal = tokens[3];
    if (aVal.endsWith('%')) {
      alpha = (parseFloat(aVal) / 100).toString();
    } else {
      alpha = aVal;
    }
  }

  // Fallback check
  if (isNaN(L) || isNaN(C) || isNaN(H)) return 'rgb(120, 120, 120)';

  // Map OKLCH to HSL
  // Lightness translates directly to HSL Lightness (0-100)
  // Chroma translates roughly to HSL Saturation: typical max chroma is around 0.4.
  const h = Math.round(H);
  const s = Math.round(Math.min(100, Math.max(0, (C / 0.4) * 100)));
  const l = Math.round(Math.min(100, Math.max(0, L * 100)));

  if (alpha !== null) {
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  } else {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}

export function oklabToHsl(matchStr: string): string {
  const openParen = matchStr.indexOf('(');
  const closeParen = matchStr.lastIndexOf(')');
  if (openParen === -1 || closeParen === -1) return 'rgb(120, 120, 120)';
  
  const content = matchStr.slice(openParen + 1, closeParen).trim();
  const tokens = content.split(/[\s,/]+/).filter(Boolean);
  if (tokens.length < 3) return 'rgb(120, 120, 120)';

  let lVal = tokens[0];
  let L = 0;
  if (lVal.endsWith('%')) {
    L = parseFloat(lVal) / 100;
  } else {
    L = parseFloat(lVal);
  }

  let a = parseFloat(tokens[1]);
  let b = parseFloat(tokens[2]);

  let alpha: string | null = null;
  if (tokens.length >= 4) {
    let aVal = tokens[3];
    if (aVal.endsWith('%')) {
      alpha = (parseFloat(aVal) / 100).toString();
    } else {
      alpha = aVal;
    }
  }

  if (isNaN(L) || isNaN(a) || isNaN(b)) return 'rgb(120, 120, 120)';

  // Convert oklab to oklch
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  const h = Math.round(H);
  const s = Math.round(Math.min(100, Math.max(0, (C / 0.4) * 100)));
  const l = Math.round(Math.min(100, Math.max(0, L * 100)));

  if (alpha !== null) {
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  } else {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}

export function sanitizeColorFunctions(text: string): string {
  let result = text;
  
  // Regex to match oklch(...) and oklab(...) case-insensitively
  const oklchRegex = /oklch\([^)]+\)/gi;
  const oklabRegex = /oklab\([^)]+\)/gi;

  result = result.replace(oklchRegex, (match) => oklchToHsl(match));
  result = result.replace(oklabRegex, (match) => oklabToHsl(match));

  return result;
}

export async function runWithOklchSanitizer<T>(fn: () => Promise<T>): Promise<T> {
  const documents: Document[] = [document];
  
  // Find all accessible iframes on the page and scan their documents too
  const iframes = Array.from(document.querySelectorAll('iframe'));
  iframes.forEach((iframe) => {
    try {
      if (iframe.contentWindow?.document) {
        documents.push(iframe.contentWindow.document);
      }
    } catch (e) {
      // Ignore cross-origin iframes
    }
  });

  interface SavedRule {
    sheet: CSSStyleSheet | CSSGroupingRule;
    index: number;
    originalText: string;
  }

  const savedRules: SavedRule[] = [];
  const savedStyles: Array<{ el: HTMLStyleElement; originalText: string }> = [];
  const originalGetComputedStyles = new Map<Window, typeof window.getComputedStyle>();

  // Override window.getComputedStyle for all accessible windows
  const windowsToOverride: Window[] = [window];
  iframes.forEach((iframe) => {
    try {
      if (iframe.contentWindow) {
        windowsToOverride.push(iframe.contentWindow);
      }
    } catch (e) {
      // Ignore
    }
  });

  windowsToOverride.forEach((w) => {
    try {
      const original = w.getComputedStyle;
      originalGetComputedStyles.set(w, original);
      w.getComputedStyle = function(elt: Element, pseudoElt?: string | null) {
        const style = original.call(w, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('OKLCH') || val.includes('OKLAB'))) {
                  return sanitizeColorFunctions(val);
                }
                return val;
              };
            }
            
            // Avoid using Reflect.get with receiver because native getters on CSSStyleDeclaration (like .color, .display, etc.)
            // will throw "Illegal invocation" if called with the Proxy as the 'this' context.
            const val = target[prop as any];
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('OKLCH') || val.includes('OKLAB'))) {
              return sanitizeColorFunctions(val);
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      };
    } catch (e) {
      // Ignore
    }
  });

  function sanitizeRule(rule: CSSRule, parent: CSSStyleSheet | CSSGroupingRule, index: number) {
    if (rule instanceof CSSStyleRule) {
      const text = rule.cssText;
      if (text.includes('oklch') || text.includes('oklab') || text.includes('OKLCH') || text.includes('OKLAB')) {
        const sanitized = sanitizeColorFunctions(text);
        try {
          parent.deleteRule(index);
          parent.insertRule(sanitized, index);
          savedRules.push({ sheet: parent, index, originalText: text });
        } catch (e) {
          // If insert fails for some reason, ignore
        }
      }
    } else if (rule instanceof CSSGroupingRule) {
      sanitizeRulesList(rule);
    }
  }

  function sanitizeRulesList(group: CSSStyleSheet | CSSGroupingRule) {
    try {
      const rules = group.cssRules;
      if (!rules) return;
      for (let i = rules.length - 1; i >= 0; i--) {
        sanitizeRule(rules[i], group, i);
      }
    } catch (e) {
      // Ignore security errors
    }
  }

  // 1. Sanitize style sheets via CSSOM
  for (const doc of documents) {
    try {
      const sheets = Array.from(doc.styleSheets);
      sheets.forEach((sheet) => {
        sanitizeRulesList(sheet);
      });
    } catch (e) {
      // Ignore stylesheet enumeration errors
    }

    // 2. Also sanitize `<style>` tags directly as fallback (handles cases where cssRules is empty but textContent is present)
    try {
      const styleElements = Array.from(doc.querySelectorAll('style'));
      styleElements.forEach((el) => {
        const text = el.textContent || '';
        if (text.includes('oklch') || text.includes('oklab') || text.includes('OKLCH') || text.includes('OKLAB')) {
          savedStyles.push({ el, originalText: text });
          el.textContent = sanitizeColorFunctions(text);
        }
      });
    } catch (e) {
      // Ignore
    }
  }

  try {
    // Run the actual PDF generation task
    return await fn();
  } finally {
    // Restore all inline style tags
    savedStyles.forEach(({ el, originalText }) => {
      el.textContent = originalText;
    });

    // Restore all CSSOM rules in reverse order
    for (let i = savedRules.length - 1; i >= 0; i--) {
      const saved = savedRules[i];
      try {
        saved.sheet.deleteRule(saved.index);
        saved.sheet.insertRule(saved.originalText, saved.index);
      } catch (e) {
        // Ignore
      }
    }

    // Restore getComputedStyle
    originalGetComputedStyles.forEach((orig, w) => {
      try {
        w.getComputedStyle = orig;
      } catch (e) {
        // Ignore
      }
    });
  }
}
