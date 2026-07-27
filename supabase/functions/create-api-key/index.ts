import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userToken = authHeader.replace("Bearer ", "");

    // Verify the user's JWT
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        apikey: serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = await userResponse.json();

    const { organizationId, name } = await req.json();

    if (!organizationId || !name) {
      return new Response(
        JSON.stringify({ error: "Missing organizationId or name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the user is a member of the organization with admin/owner role
    const memberResponse = await fetch(
      `${supabaseUrl}/rest/v1/memberships?select=role&user_id=eq.${user.id}&organization_id=eq.${organizationId}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!memberResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to verify membership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const memberships = await memberResponse.json();
    if (!memberships || memberships.length === 0) {
      return new Response(
        JSON.stringify({ error: "Not a member of this organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const role = memberships[0].role;
    if (role !== "admin" && role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin or owner role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate a secure random API key
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const secret = "cak_" + Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create a preview (first 12 chars)
    const keyPreview = secret.substring(0, 12) + "...";

    // Hash the key using SHA-256
    const hashBytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    );
    const keyHash = Array.from(hashBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert the API key using the service role key (bypasses RLS)
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/api_keys`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          organization_id: organizationId,
          name,
          key_preview: keyPreview,
          key_hash: keyHash,
          created_by: user.id,
        }),
      },
    );

    if (!insertResponse.ok) {
      const err = await insertResponse.text();
      return new Response(
        JSON.stringify({ error: "Failed to create API key", detail: err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inserted = await insertResponse.json();
    const apiKey = inserted[0];

    return new Response(
      JSON.stringify({ apiKey, secret }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
