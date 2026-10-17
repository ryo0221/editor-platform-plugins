import { useState, type CSSProperties, type ReactNode } from 'react';

// Reviewed, bundled implementations only. No URLs, HTML, source code, storage or
// browser events are accepted as props. Explicit props never spread onto the DOM.
export function Panel({ title, children, style }: { title: string; children?: ReactNode; style?: CSSProperties }) {
  return <section style={{ padding: 20, border: '1px solid #bcc4d0', borderRadius: 12, ...style }}><h2>{title}</h2>{children}</section>;
}
export function Text({ text, style }: { text: string; style?: CSSProperties }) {
  return <p style={style}>{text}</p>;
}
export function Counter({ label, initial, onChange, style }: { label: string; initial: number; onChange?: (value: number) => void; style?: CSSProperties }) {
  const [count, setCount] = useState(initial);
  return <button type="button" style={{ padding: 12, ...style }} onClick={() => {
    const next = count + 1; setCount(next); onChange?.(next);
  }}>{label}: {count}</button>;
}
