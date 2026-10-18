/** Reads a multipart/form-data request body (what the form posts to FormSubmit) into field name -> value. */
export function parseMultipart(body: Buffer | null): Record<string, string> {
  if (!body) return {};
  const text = body.toString('utf8');
  const boundary = text.slice(0, text.indexOf('\r\n'));
  const fields: Record<string, string> = {};
  for (const part of text.split(boundary)) {
    const match = part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/);
    if (match) fields[match[1]] = match[2];
  }
  return fields;
}
