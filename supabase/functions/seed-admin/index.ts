import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const adminEmail = "thiago@conxvendas.com.br";
    const adminPassword = "Conx@2025";
    const adminName = "Thiago Admin";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);

    if (existingUser) {
      // Update password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: adminPassword }
      );

      if (updateError) {
        throw updateError;
      }

      // Ensure role is admin
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: existingUser.id, role: "admin" }, { onConflict: "user_id,role" });

      // Update profile
      await supabaseAdmin
        .from("profiles")
        .update({ name: adminName, is_first_login: false })
        .eq("id", existingUser.id);

      return new Response(
        JSON.stringify({ success: true, message: "Admin user password updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: adminName },
    });

    if (createError) {
      throw createError;
    }

    if (newUser.user) {
      // Set role to admin
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newUser.user.id, role: "admin" }, { onConflict: "user_id,role" });

      // Update profile
      await supabaseAdmin
        .from("profiles")
        .update({ name: adminName, is_first_login: false })
        .eq("id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Admin user created successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
