/**
 * The bounded registry of rich markdown directive components a Thesis author
 * may place in a doc body. Directives are portable: they render to rich
 * components in the Thesis portal and degrade to plain text elsewhere.
 */

export interface RegistryComponent {
  /** Component name as used in the directive, e.g. `video`. */
  name: string;
  /** Canonical syntax example. */
  syntax: string;
  /** One-line description of what it renders. */
  description: string;
  /** Supported attributes and what they mean. */
  attributes: { name: string; required: boolean; description: string }[];
}

export const REGISTRY: RegistryComponent[] = [
  {
    name: "video",
    syntax: ':::video{src="https://example.com/clip.mp4"}',
    description: "Embeds an inline video player for the given source URL.",
    attributes: [
      { name: "src", required: true, description: "URL of the video file or stream." },
      { name: "poster", required: false, description: "Optional poster image URL." },
      { name: "caption", required: false, description: "Optional caption shown beneath the player." },
    ],
  },
  {
    name: "callout",
    syntax: ':::callout{type="info"}\nYour message here.\n:::',
    description:
      "A highlighted callout block for notes, tips, warnings, and dangers.",
    attributes: [
      {
        name: "type",
        required: false,
        description: 'One of "info", "tip", "warning", "danger". Defaults to "info".',
      },
      { name: "title", required: false, description: "Optional bold heading for the callout." },
    ],
  },
  {
    name: "diagram",
    syntax: ":::diagram\ngraph TD; A-->B;\n:::",
    description:
      "Renders a diagram (e.g. Mermaid/flowchart syntax) from the block body.",
    attributes: [
      {
        name: "kind",
        required: false,
        description: 'Diagram dialect, e.g. "mermaid". Defaults to "mermaid".',
      },
      { name: "caption", required: false, description: "Optional caption shown beneath the diagram." },
    ],
  },
  {
    name: "embed",
    syntax: ':::embed{url="https://example.com"}',
    description:
      "Embeds external content (page, gist, slide deck, or oEmbed provider) by URL.",
    attributes: [
      { name: "url", required: true, description: "URL of the resource to embed." },
      { name: "height", required: false, description: "Optional pixel height of the embed frame." },
    ],
  },
];
