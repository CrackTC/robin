export const ok = <T>(data?: T) =>
  new Response(JSON.stringify({ success: true, data }));

export const fail = (status = 404, message?: string) =>
  new Response(JSON.stringify({ success: false, message }), { status });
