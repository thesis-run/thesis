/**
 * Thesis content pipeline.
 *
 * Portable markdown + directives → rich, bounded components. Files stay plain `.md`
 * (`:::video{src}`, `:::callout{type}`) and degrade gracefully; Thesis renders the
 * directives via a curated registry. MDX/JSX is intentionally NOT supported — content
 * stays portable.
 */
import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import { Play, Info, AlertTriangle, Lightbulb } from "lucide-react";

// --- The curated component registry (what an author/agent may place) -------
export const REGISTRY = [
  { name: "video", syntax: ':::video{src="https://…/clip.mp4"}', description: "Embed a video." },
  { name: "callout", syntax: ':::callout{type=info}\n…\n:::', description: "Info/warn/tip box (type: info|warn|tip)." },
  { name: "embed", syntax: ':::embed{url="https://…"}', description: "Embed an external page (iframe)." },
  { name: "diagram", syntax: ":::diagram\n…ascii or mermaid…\n:::", description: "Render a fenced diagram block." },
] as const;

// remark plugin: map :::name{attrs} directives to custom element nodes.
function remarkDirectives() {
  return (tree: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(tree as any, (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const data = node.data || (node.data = {});
        data.hName = `directive-${node.name}`;
        data.hProperties = { ...(node.attributes || {}) };
      }
    });
  };
}

function Callout({ type = "info", children }: { type?: string; children?: ReactNode }) {
  const map: Record<string, { Icon: typeof Info; cls: string }> = {
    info: { Icon: Info, cls: "border-foreground/15 bg-muted/40" },
    warn: { Icon: AlertTriangle, cls: "border-accent/30 bg-accent/5" },
    tip: { Icon: Lightbulb, cls: "border-foreground/15 bg-muted/40" },
  };
  const { Icon, cls } = map[type] ?? map.info;
  return (
    <div className={`my-5 flex gap-3 rounded-lg border p-4 ${cls}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="text-sm leading-relaxed [&>p]:my-0">{children}</div>
    </div>
  );
}

function Video({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-black">
      <video src={src} controls className="w-full" preload="metadata" />
    </div>
  );
}

function Embed({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border aspect-video">
      <iframe src={url} className="w-full h-full" loading="lazy" title="embed" />
    </div>
  );
}

function Diagram({ children }: { children?: ReactNode }) {
  return (
    <pre className="my-6 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed text-foreground">
      {children}
    </pre>
  );
}

function childText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childText).join("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = children as any;
  if (c && c.props) return childText(c.props.children);
  return "";
}
const HEADING_CLS: Record<string, string> = {
  h1: "text-3xl font-bold mb-6 mt-8 scroll-mt-24 first:mt-0",
  h2: "text-2xl font-semibold mb-4 mt-8 scroll-mt-24",
  h3: "text-xl font-semibold mb-3 mt-6 scroll-mt-24",
};
const heading = (Tag: "h1" | "h2" | "h3") => ({ children }: { children?: ReactNode }) => {
  const id = slugifyHeading(childText(children));
  return <Tag id={id} className={HEADING_CLS[Tag]}>{children}</Tag>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Record<string, any> = {
  "directive-video": Video,
  "directive-callout": Callout,
  "directive-embed": Embed,
  "directive-diagram": Diagram,
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  p: (props: { children?: ReactNode }) => <p className="mb-4 leading-relaxed">{props.children}</p>,
  ul: (props: { children?: ReactNode }) => <ul className="list-disc pl-6 mb-4 space-y-1">{props.children}</ul>,
  ol: (props: { children?: ReactNode }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{props.children}</ol>,
  blockquote: (props: { children?: ReactNode }) => (
    <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-4">{props.children}</blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: (props: any) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]" {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: (props: any) => (
    <pre className="my-6 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[13px]" {...props} />
  ),
  table: (props: { children?: ReactNode }) => (
    <div className="my-6 overflow-x-auto"><table className="w-full text-sm border-collapse">{props.children}</table></div>
  ),
  th: (props: { children?: ReactNode }) => <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium">{props.children}</th>,
  td: (props: { children?: ReactNode }) => <td className="border border-border px-3 py-2">{props.children}</td>,
  a: (props: { href?: string; children?: ReactNode }) => (
    <a href={props.href} target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary/80">
      {props.children}
    </a>
  ),
  img: (props: { src?: string; alt?: string }) => (
    <img src={props.src} alt={props.alt ?? ""} className="my-6 rounded-lg border border-border" />
  ),
};

export function MarkdownRenderer({ md, className = "" }: { md: string; className?: string }) {
  return (
    <div className={`text-[15px] leading-relaxed text-foreground ${className}`}>
      <Markdown remarkPlugins={[remarkGfm, remarkDirective, remarkDirectives]} components={components}>
        {md}
      </Markdown>
    </div>
  );
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

/** Extract H1/H2 headings for a table of contents. */
export function extractHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  const lines = md.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,2})\s+(.*)$/.exec(line);
    if (m) {
      const text = m[2].replace(/[#*`]/g, "").trim();
      out.push({ level: m[1].length, text, id: slugifyHeading(text) });
    }
  }
  return out;
}

export function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
