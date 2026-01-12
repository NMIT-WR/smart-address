import { Option, Tracer } from "effect";

export interface RecordedSpan {
  name: string;
  attributes: Map<string, unknown>;
  traceId: string;
}

export const makeTestTracer = (spans: RecordedSpan[]) => {
  let counter = 0;
  return Tracer.make({
    span: (name, parent, context, links, startTime, kind) => {
      const attributes = new Map<string, unknown>();
      const traceId = Option.isSome(parent) ? parent.value.traceId : "trace-1";
      const span: Tracer.Span = {
        _tag: "Span",
        name,
        spanId: `span-${counter++}`,
        traceId,
        parent,
        context,
        status: { _tag: "Started", startTime },
        attributes,
        links,
        sampled: true,
        kind,
        end: (endTime, exit) => {
          span.status = { _tag: "Ended", startTime, endTime, exit };
        },
        attribute: (key, value) => {
          attributes.set(key, value);
        },
        event: () => undefined,
        addLinks: () => undefined,
      };
      spans.push({ name, attributes, traceId });
      return span;
    },
    context: (f) => f(),
  });
};
