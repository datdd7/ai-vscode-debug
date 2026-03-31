export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') el.className = v;
      else if (k === 'innerHTML') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
  }
  for (const child of children) {
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

export function $(selector: string, parent: ParentNode = document): Element | null {
  return parent.querySelector(selector);
}

export function $$(selector: string, parent: ParentNode = document): Element[] {
  return [...parent.querySelectorAll(selector)];
}
