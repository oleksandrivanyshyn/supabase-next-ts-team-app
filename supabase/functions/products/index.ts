import { corsHeaders } from "../_shared/cors.ts";
import { createContext, requireTeam } from "../_shared/context.ts";
import { HttpError, toErrorResponse } from "../_shared/errors.ts";
import { createProductSchema, productListQuerySchema, updateProductSchema } from "./schemas.ts";

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

function mapProductRow(product: Record<string, any>, imageUrl: string | null) {
    return {
        id: product.id,
        title: product.title,
        description: product.description,
        imageUrl,
        status: product.status,
        createdBy: { id: product.created_by, displayName: product.profiles?.display_name ?? null },
        createdAt: product.created_at,
        updatedAt: product.updated_at,
    };
}

async function toProductDto(supabase: any, product: Record<string, any>) {
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
            const parsedQuery = productListQuerySchema.safeParse(queryParams);
            if (!parsedQuery.success) {
                throw new HttpError(400, "Validation failed: " + parsedQuery.error.message);
            }
            const { status, dateFrom, dateTo, createdBy, search } = parsedQuery.data;

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

            const imagePaths = products?.map(p => p.image_path).filter(Boolean) || [];
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

            return new Response(JSON.stringify({ data: responseData, count, page, pageSize }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
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

            let imageUrl: string | null = null;
            if (product.image_path) {
                const { data: signedData, error: storageError } = await ctx.supabase
                    .storage
                    .from("product-images")
                    .createSignedUrl(product.image_path, 3600);

                if (storageError) console.error("Failed to sign product image URL:", storageError.message);

                if (!storageError && signedData) {
                    imageUrl = toPublicUrl(signedData.signedUrl);
                }
            }

            return new Response(JSON.stringify({ product: mapProductRow(product, imageUrl) }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (req.method === "POST" && segments.length === 1) {
            const body = await req.json().catch(() => ({}));
            const result = createProductSchema.safeParse(body);

            if (!result.success) {
                throw new HttpError(400, "Validation failed: " + result.error.message);
            }

            const { data: product, error } = await ctx.supabase
                .from("products")
                .insert({
                    team_id: teamId,
                    title: result.data.title,
                    description: result.data.description || "",
                    image_path: result.data.imagePath || null,
                    created_by: ctx.user.id,
                    status: "draft"
                })
                .select("*, profiles!created_by(display_name)")
                .single();

            if (error) throw new HttpError(400, error.message);

            return new Response(JSON.stringify({ product: await toProductDto(ctx.supabase, product) }), {
                status: 201,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (req.method === "PATCH" && segments.length === 2) {
            const productId = segments[1];
            const body = await req.json().catch(() => ({}));
            const result = updateProductSchema.safeParse(body);

            if (!result.success) {
                throw new HttpError(400, "Validation failed: " + result.error.message);
            }

            const { data: currentProduct, error: fetchError } = await ctx.supabase
                .from("products")
                .select("status")
                .eq("id", productId)
                .eq("team_id", teamId)
                .single();

            if (fetchError || !currentProduct) throw new HttpError(404, "Product not found");

            if (currentProduct.status !== "draft" && (result.data.title !== undefined || result.data.description !== undefined || result.data.imagePath !== undefined)) {
                throw new HttpError(409, "Active or deleted products cannot be edited, only their status can change");
            }

            const updateData: Record<string, any> = {};
            if (result.data.title !== undefined) updateData.title = result.data.title;
            if (result.data.description !== undefined) updateData.description = result.data.description;
            if (result.data.imagePath !== undefined) updateData.image_path = result.data.imagePath || null;
            if (result.data.status !== undefined) updateData.status = result.data.status;

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

            return new Response(JSON.stringify({ product: await toProductDto(ctx.supabase, updatedProduct) }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
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

            return new Response(JSON.stringify({ success: true, product: await toProductDto(ctx.supabase, updatedProduct) }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        throw new HttpError(404, "Not Found");

    } catch (error) {
        return toErrorResponse(error);
    }
});