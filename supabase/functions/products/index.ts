import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createContext, requireTeam } from "../_shared/context.ts";
import { HttpError, toErrorResponse } from "../_shared/errors.ts";
import { jsonResponse, parseBody, validate } from "../_shared/http.ts";
import type { Database } from "../_shared/database.types.ts";
import { createProductSchema, productListQuerySchema, updateProductSchema } from "./schemas.ts";

type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
    profiles: { display_name: string } | null;
};
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

type ProductDto = {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    status: Database["public"]["Enums"]["product_status"];
    createdBy: { id: string; displayName: string };
    createdAt: string;
    updatedAt: string;
};

// Locally, the auto-injected SUPABASE_URL resolves to the internal Docker
// network hostname (e.g. http://kong:8000), which a real browser can't reach —
// only Edge Functions calling Storage/PostgREST server-side can. Signed URLs
// built from that client inherit the same unreachable origin. PUBLIC_SUPABASE_URL
// (set locally to http://127.0.0.1:54321, unset in production where SUPABASE_URL
// is already public) rewrites the origin before a signed URL reaches the client.
function toPublicUrl(url: string): string {
    const publicOrigin = Deno.env.get("PUBLIC_SUPABASE_URL");
    if (!publicOrigin) return url;
    return url.replace(/^https?:\/\/[^/]+/, publicOrigin);
}

function mapProductRow(product: ProductRow, imageUrl: string | null): ProductDto {
    return {
        id: product.id,
        title: product.title,
        description: product.description,
        imageUrl,
        status: product.status,
        // profiles is nullable in the generated embed type (Supabase can't
        // statically prove the join always resolves), but created_by is a
        // not-null FK into profiles and every user gets a profile row via
        // the handle_new_user trigger on signup — this can't actually be
        // null in practice, so asserting it here is more honest than
        // quietly coalescing to null and pretending that's a normal state.
        createdBy: { id: product.created_by, displayName: product.profiles!.display_name },
        createdAt: product.created_at,
        updatedAt: product.updated_at,
    };
}

async function toProductDto(supabase: SupabaseClient<Database>, product: ProductRow): Promise<ProductDto> {
    let imageUrl: string | null = null;
    if (product.image_path) {
        const { data: signedData, error: storageError } = await supabase
            .storage
            .from("product-images")
            .createSignedUrl(product.image_path, 3600);
        if (storageError) console.error("Failed to sign product image URL:", storageError.message);
        imageUrl = signedData?.signedUrl ? toPublicUrl(signedData.signedUrl) : null;
    }

    return mapProductRow(product, imageUrl);
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const ctx = await createContext(req);
        const teamId = requireTeam(ctx);

        const url = new URL(req.url);
        const path = url.pathname.replace(/\/+$/, "");
        const segments = path.split("/").filter(Boolean);

        if (req.method === "GET" && segments.length === 1) {
            const parsedPage = parseInt(url.searchParams.get("page") || "1", 10);
            const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage);
            const parsedPageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
            const pageSize = Math.min(100, Math.max(1, Number.isNaN(parsedPageSize) ? 20 : parsedPageSize));

            const queryParams: Record<string, string> = {};
            for (const key of ["status", "dateFrom", "dateTo", "createdBy", "search"]) {
                const value = url.searchParams.get(key);
                if (value) queryParams[key] = value;
            }
            const { status, dateFrom, dateTo, createdBy, search } = validate(queryParams, productListQuerySchema);

            let query = ctx.supabase
                .from("products")
                .select("*, profiles!created_by(display_name)", { count: "exact" })
                .eq("team_id", teamId);

            if (status) query = query.eq("status", status);
            if (createdBy) query = query.eq("created_by", createdBy);
            if (dateFrom) query = query.gte("created_at", dateFrom);
            if (dateTo) {
                // The UI sends dateTo as a calendar day (yyyy-MM-dd). Left as-is
                // it compares against 00:00, silently excluding rows created
                // later that same day — extend to end-of-day so the range is
                // inclusive of the whole picked day.
                const upperBound = /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? `${dateTo}T23:59:59.999Z` : dateTo;
                query = query.lte("created_at", upperBound);
            }
            if (search) query = query.textSearch("fts", search, { type: "websearch", config: "simple" });

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data: products, count, error } = await query
                .range(from, to)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false });

            if (error) throw new HttpError(400, error.message);

            const imagePaths = products?.map(p => p.image_path).filter((p): p is string => Boolean(p)) || [];
            let signedUrlsMap: Record<string, string> = {};

            if (imagePaths.length > 0) {
                const { data: signedData, error: storageError } = await ctx.supabase
                    .storage
                    .from("product-images")
                    .createSignedUrls(imagePaths, 3600);

                if (storageError) console.error("Failed to sign product image URLs:", storageError.message);

                if (!storageError && signedData) {
                    signedUrlsMap = signedData.reduce((acc, current) => {
                        if (current.path && current.signedUrl) {
                            acc[current.path] = toPublicUrl(current.signedUrl);
                        }
                        return acc;
                    }, {} as Record<string, string>);
                }
            }

            const responseData = products?.map(p =>
                mapProductRow(p, p.image_path ? (signedUrlsMap[p.image_path] || null) : null)
            ) || [];

            return jsonResponse({ data: responseData, count, page, pageSize });
        }

        if (req.method === "GET" && segments.length === 2) {
            const productId = segments[1];

            const { data: product, error } = await ctx.supabase
                .from("products")
                .select("*, profiles!created_by(display_name)")
                .eq("id", productId)
                .eq("team_id", teamId)
                .single();

            if (error || !product) throw new HttpError(404, "Product not found");

            return jsonResponse({ product: await toProductDto(ctx.supabase, product) });
        }

        if (req.method === "POST" && segments.length === 1) {
            const result = await parseBody(req, createProductSchema);

            const { data: product, error } = await ctx.supabase
                .from("products")
                .insert({
                    team_id: teamId,
                    title: result.title,
                    description: result.description || "",
                    image_path: result.imagePath || null,
                    created_by: ctx.user.id,
                    status: "draft"
                })
                .select("*, profiles!created_by(display_name)")
                .single();

            if (error) throw new HttpError(400, error.message);

            return jsonResponse({ product: await toProductDto(ctx.supabase, product) }, 201);
        }

        if (req.method === "PATCH" && segments.length === 2) {
            const productId = segments[1];
            const result = await parseBody(req, updateProductSchema);

            const { data: currentProduct, error: fetchError } = await ctx.supabase
                .from("products")
                .select("status")
                .eq("id", productId)
                .eq("team_id", teamId)
                .single();

            if (fetchError || !currentProduct) throw new HttpError(404, "Product not found");

            if (currentProduct.status !== "draft" && (result.title !== undefined || result.description !== undefined || result.imagePath !== undefined)) {
                throw new HttpError(409, "Active or deleted products cannot be edited, only their status can change");
            }

            const updateData: ProductUpdate = {};
            if (result.title !== undefined) updateData.title = result.title;
            if (result.description !== undefined) updateData.description = result.description;
            if (result.imagePath !== undefined) updateData.image_path = result.imagePath || null;
            if (result.status !== undefined) updateData.status = result.status;

            const { data: updatedProduct, error: updateError } = await ctx.supabase
                .from("products")
                .update(updateData)
                .eq("id", productId)
                .eq("team_id", teamId)
                .select("*, profiles!created_by(display_name)")
                .single();

            if (updateError) {
                const status = updateError.code === "23514" ? 409 : 400;
                throw new HttpError(status, updateError.message);
            }

            return jsonResponse({ product: await toProductDto(ctx.supabase, updatedProduct) });
        }

        if (req.method === "DELETE" && segments.length === 2) {
            const productId = segments[1];

            const { data: currentProduct, error: fetchError } = await ctx.supabase
                .from("products")
                .select("status")
                .eq("id", productId)
                .eq("team_id", teamId)
                .single();

            if (fetchError || !currentProduct || currentProduct.status === "deleted") {
                throw new HttpError(404, "Product not found");
            }

            const { data: updatedProduct, error } = await ctx.supabase
                .from("products")
                .update({ status: "deleted" })
                .eq("id", productId)
                .eq("team_id", teamId)
                .select("*, profiles!created_by(display_name)")
                .single();

            if (error) throw new HttpError(400, error.message);

            return jsonResponse({ success: true, product: await toProductDto(ctx.supabase, updatedProduct) });
        }

        throw new HttpError(404, "Not Found");

    } catch (error) {
        return toErrorResponse(error);
    }
});