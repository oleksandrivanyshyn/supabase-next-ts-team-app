import { corsHeaders } from "../_shared/cors.ts";
import { createContext } from "../_shared/context.ts";
import { HttpError, toErrorResponse } from "../_shared/errors.ts";
import { jsonResponse, parseBody } from "../_shared/http.ts";
import type { Database } from "../_shared/database.types.ts";
import { createTeamSchema, joinTeamSchema } from "./schemas.ts";

type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type TeamDto = { id: string; name: string; inviteCode: string; createdAt: string; createdBy: string };

function toTeamDto(team: TeamRow): TeamDto {
    return {
        id: team.id,
        name: team.name,
        inviteCode: team.invite_code,
        createdAt: team.created_at,
        createdBy: team.created_by,
    };
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const ctx = await createContext(req);
        const url = new URL(req.url);
        const path = url.pathname.replace(/\/+$/, "");

        // Leave and delete require the opposite guard from create/join (must
        // HAVE a team), so both are handled before the "already belongs to a
        // team" check below.
        if (req.method === "POST" && path.endsWith("/leave")) {
            if (!ctx.teamId) {
                throw new HttpError(409, "User does not belong to a team");
            }

            const { error: rpcError } = await ctx.supabase.rpc("leave_team");
            if (rpcError) {
                const status = rpcError.code === "P0002" ? 409 : 400;
                throw new HttpError(status, rpcError.message);
            }

            return jsonResponse({ success: true });
        }

        if (req.method === "POST" && path.endsWith("/delete")) {
            if (!ctx.teamId) {
                throw new HttpError(409, "User does not belong to a team");
            }

            const { error: rpcError } = await ctx.supabase.rpc("delete_team");
            if (rpcError) {
                const status = rpcError.code === "P0002" ? 409 : rpcError.code === "42501" ? 403 : 400;
                throw new HttpError(status, rpcError.message);
            }

            return jsonResponse({ success: true });
        }

        if (ctx.teamId) {
            throw new HttpError(409, "User already belongs to a team");
        }

        if (req.method === "POST" && (path === "/teams" || path === "/")) {
            const result = await parseBody(req, createTeamSchema);

            const { data: team, error: rpcError } = await ctx.supabase.rpc("create_team", {
                p_name: result.name,
            }).single();

            if (rpcError) {
                const status = rpcError.code === "23505" ? 409 : 400;
                throw new HttpError(status, rpcError.message);
            }

            return jsonResponse({ team: toTeamDto(team) }, 201);
        }

        if (req.method === "POST" && path.endsWith("/join")) {
            const result = await parseBody(req, joinTeamSchema);

            const { data: team, error: rpcError } = await ctx.supabase.rpc("join_team", {
                p_invite_code: result.inviteCode,
            }).single();

            if (rpcError) {
                const status = rpcError.code === "P0002" ? 404 : 400;
                throw new HttpError(status, rpcError.message);
            }

            return jsonResponse({ team: toTeamDto(team) });
        }

        throw new HttpError(404, "Not Found");

    } catch (error) {
        return toErrorResponse(error);
    }
});