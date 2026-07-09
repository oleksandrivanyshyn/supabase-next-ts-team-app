import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase-admin.ts";
import { HttpError, toErrorResponse } from "../_shared/errors.ts";

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const cronSecret = Deno.env.get("CRON_SECRET");
        const requestSecret = req.headers.get("x-cron-secret");

        if (!cronSecret || requestSecret !== cronSecret) {
            throw new HttpError(401, "Unauthorized: Invalid cron secret");
        }

        const supabaseAdmin = createSupabaseAdminClient();

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const { data, error } = await supabaseAdmin
            .from("products")
            .delete()
            .eq("status", "deleted")
            .lte("deleted_at", twoWeeksAgo.toISOString())
            .select("id, image_path");

        if (error) {
            throw new HttpError(400, error.message);
        }

        const imagePaths = data?.map(p => p.image_path).filter((p): p is string => Boolean(p)) || [];
        if (imagePaths.length > 0) {
            const { error: storageError } = await supabaseAdmin.storage
                .from("product-images")
                .remove(imagePaths);
            if (storageError) console.error("Failed to remove product images:", storageError.message);
        }

        const deletedCount = data?.length || 0;

        return new Response(JSON.stringify({ success: true, deletedCount }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return toErrorResponse(error);
    }
});