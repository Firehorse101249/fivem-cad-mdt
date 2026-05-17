import { NextResponse } from "next/server";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type PartnerBody = {
  action?: unknown;
  combined_callsign?: unknown;
  officer_name?: unknown;
  request_id?: unknown;
  requester_callsign?: unknown;
  target_callsign?: unknown;
  unit_type?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "cad:officer");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const callsign = text(searchParams.get("callsign")).toUpperCase();
  const supabaseAdmin = getSupabaseAdminClient();

  const [{ data: requests }, { data: sessions }] = await Promise.all([
    callsign
      ? supabaseAdmin
          .from("partner_requests")
          .select("*")
          .eq("status", "pending")
          .or(`target_callsign.eq.${callsign},requester_user_id.eq.${auth.user.id}`)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("partner_sessions")
      .select("*")
      .eq("status", "active")
      .contains("members", [{ userId: auth.user.id }])
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return NextResponse.json({
    requests: requests ?? [],
    session: sessions?.[0] ?? null,
    success: true,
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "cad:officer");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: PartnerBody;
  try {
    body = (await request.json()) as PartnerBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const action = text(body.action);
  const officerName = text(body.officer_name) || auth.user.email || "Officer";
  const requesterCallsign = text(body.requester_callsign).toUpperCase();
  const combinedCallsign = text(body.combined_callsign).toUpperCase();

  if (action === "request") {
    const targetCallsign = text(body.target_callsign).toUpperCase();
    if (!requesterCallsign || !targetCallsign || !combinedCallsign) {
      return NextResponse.json({ success: false, error: "Requester, target, and combined callsigns are required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("partner_requests").insert({
      combined_callsign: combinedCallsign,
      requester_callsign: requesterCallsign,
      requester_name: officerName,
      requester_user_id: auth.user.id,
      target_callsign: targetCallsign,
    }).select("*").single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ request: data, success: true });
  }

  if (action === "accept") {
    const requestId = text(body.request_id);
    if (!requestId || !requesterCallsign) {
      return NextResponse.json({ success: false, error: "Request and accepting callsign are required." }, { status: 400 });
    }

    const { data: partnerRequest, error: requestError } = await supabaseAdmin
      .from("partner_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle<Record<string, unknown>>();

    if (requestError || !partnerRequest) {
      return NextResponse.json({ success: false, error: requestError?.message ?? "Partner request not found." }, { status: 404 });
    }

    const members = [
      { callsign: String(partnerRequest.requester_callsign), name: String(partnerRequest.requester_name ?? "Officer"), role: "Primary", userId: String(partnerRequest.requester_user_id ?? "") },
      { callsign: requesterCallsign, name: officerName, role: "Partner", userId: auth.user.id },
    ];
    const nextCombined = String(partnerRequest.combined_callsign || combinedCallsign || `${partnerRequest.requester_callsign}/${requesterCallsign}`).toUpperCase();

    const { data: session, error } = await supabaseAdmin.from("partner_sessions").insert({
      combined_callsign: nextCombined,
      created_by: auth.user.id,
      members,
      request_id: requestId,
    }).select("*").single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await supabaseAdmin.from("partner_requests").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", requestId);
    await supabaseAdmin.from("dispatch_units").delete().in("callsign", members.map((member) => member.callsign));
    await supabaseAdmin.from("dispatch_units").insert({
      agency: "Law Enforcement",
      callsign: nextCombined,
      created_by: auth.user.id,
      member_name: members.map((member) => member.name).join(" / "),
      metadata: { partner_members: members, partner_session_id: session.id },
      status: "Available",
      unit_type: text(body.unit_type) || "Patrol",
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ session, success: true });
  }

  if (action === "end") {
    const requestId = text(body.request_id);
    if (!requestId) {
      return NextResponse.json({ success: false, error: "Partner session id is required." }, { status: 400 });
    }

    await supabaseAdmin
      .from("partner_sessions")
      .update({ ended_at: new Date().toISOString(), status: "ended" })
      .eq("id", requestId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unsupported partner action." }, { status: 400 });
}
