export type NodeKind = "page" | "class" | "element";

export interface StyleMap {
  [property: string]: string;
}

export interface OruNode {
  kind: NodeKind;
  name: string;
  tag?: string;
  text?: string;
  styles: StyleMap;
  children: OruNode[];
  line: number;
}

export interface OruDocument {
  title: string;
  description: string;
  font?: string;
  styles: StyleMap;
  pages: OruNode[];
  classes: Map<string, OruNode>;
}

export class OruError extends Error {
  constructor(message: string, public readonly line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "OruError";
  }
}
