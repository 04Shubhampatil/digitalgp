import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as uploadRoute } from "@/app/api/v1/media/route";
import { GET as publicFileRoute } from "@/app/api/v1/public/[tenantSlug]/media/[mediaId]/route";
import { deleteMedia, getMedia, getMediaFile, getPublicMediaFile, listMedia, updateMedia, uploadMedia } from "@/features/media/service";
import { MEDIA_MAX_BYTES, sniffMimeType } from "@/features/media/validators";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { LocalDiskStorage, assertSafeKey, setStorage } from "@/lib/storage";
import { actor, buildWorld, client, params } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1]);
const PDF = new TextEncoder().encode("%PDF-1.4\n%fake\n");
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");

let dir: string;
let storage: LocalDiskStorage;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "dgp-media-"));
  storage = new LocalDiskStorage(dir);
  setStorage(storage);
});
afterAll(async () => {
  setStorage(undefined);
  await rm(dir, { recursive: true, force: true });
});

const read = async (stream: ReadableStream) => new Uint8Array(await new Response(stream).arrayBuffer());

describe("media upload", () => {
  it("stores the file under the tenant folder with a sniffed type and writes an audit row", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "media" }]);
    const m = await uploadMedia(operator.ctx, { tenantId: w.tenantA.id, altEn: "Gram Panchayat office" }, { name: "../../evil name.exe", type: "text/html", bytes: PNG }, client);
    expect(m).toMatchObject({ tenantId: w.tenantA.id, kind: "IMAGE", mimeType: "image/png", sizeBytes: PNG.byteLength, originalName: "evil name.exe" });
    const row = await db.media.findUniqueOrThrow({ where: { id: m.id } });
    expect(row.storageKey).toBe(`${w.tenantA.id}/${m.id}.png`);
    expect(await read((await storage.get(row.storageKey))!.stream)).toEqual(PNG);
    expect((await db.auditLog.findMany({ where: { entityId: m.id } })).map((l) => l.action)).toEqual(["media.upload"]);

    const file = await getMediaFile(operator.ctx, m.id);
    expect(file.mimeType).toBe("image/png");
    expect(await read(file.stream)).toEqual(PNG);
  });

  it("rejects disallowed types, empty and oversized files regardless of the declared type", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    await expectCode(uploadMedia(admin.ctx, { tenantId: w.tenantA.id }, { name: "page.png", type: "image/png", bytes: HTML }, client), "BAD_REQUEST");
    await expectCode(uploadMedia(admin.ctx, { tenantId: w.tenantA.id }, { name: "empty.png", type: "image/png", bytes: new Uint8Array() }, client), "BAD_REQUEST");
    const big = new Uint8Array(MEDIA_MAX_BYTES + 1);
    big.set(PNG);
    await expectCode(uploadMedia(admin.ctx, { tenantId: w.tenantA.id }, { name: "big.png", type: "image/png", bytes: big }, client), "BAD_REQUEST");
    expect((await listMedia(admin.ctx, { limit: 10 })).items).toHaveLength(0);
    expect(sniffMimeType(PDF)).toBe("application/pdf");
    expect(sniffMimeType(HTML)).toBeNull();
    expect(() => assertSafeKey("../x")).toThrow();
    expect(() => assertSafeKey("/etc/passwd")).toThrow();
  });

  it("operators need the media module; cross-tenant uploads and reads are refused", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const noModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const readOnly = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "media", canWrite: false }]);

    await expectCode(uploadMedia(noModule.ctx, { tenantId: w.tenantA.id }, { name: "a.png", type: null, bytes: PNG }, client), "FORBIDDEN");
    await expectCode(uploadMedia(readOnly.ctx, { tenantId: w.tenantA.id }, { name: "a.png", type: null, bytes: PNG }, client), "FORBIDDEN");
    await expectCode(uploadMedia(adminB.ctx, { tenantId: w.tenantA.id }, { name: "a.png", type: null, bytes: PNG }, client), "NOT_FOUND");
    // Operators cannot upload shared media; GP admins cannot share either (no content:share).
    await expectCode(uploadMedia(noModule.ctx, { ownerUnitId: w.taluka1.id }, { name: "a.png", type: null, bytes: PNG }, client), "NOT_FOUND");
    await expectCode(uploadMedia(adminA.ctx, { ownerUnitId: w.gpA.id }, { name: "a.png", type: null, bytes: PNG }, client), "BAD_REQUEST");

    const m = await uploadMedia(adminA.ctx, { tenantId: w.tenantA.id }, { name: "a.png", type: null, bytes: PNG }, client);
    await expectCode(getMedia(adminB.ctx, m.id), "NOT_FOUND");
    await expectCode(getMediaFile(adminB.ctx, m.id), "NOT_FOUND");
    await expectCode(updateMedia(adminB.ctx, m.id, { altEn: "x" }, client), "NOT_FOUND");
    await expectCode(deleteMedia(adminB.ctx, m.id, client), "NOT_FOUND");
    expect((await listMedia(adminB.ctx, { limit: 10, tenantId: w.tenantA.id })).items).toHaveLength(0);
    expect((await listMedia(readOnly.ctx, { limit: 10 })).items.map((i) => i.id)).toEqual([m.id]);
  });

  it("deleting removes the bytes and the item disappears from lists", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const m = await uploadMedia(admin.ctx, { tenantId: w.tenantA.id }, { name: "doc.pdf", type: "application/pdf", bytes: PDF }, client);
    expect(m.kind).toBe("DOCUMENT");
    const key = (await db.media.findUniqueOrThrow({ where: { id: m.id } })).storageKey;
    await deleteMedia(admin.ctx, m.id, client);
    expect(await storage.get(key)).toBeNull();
    expect((await listMedia(admin.ctx, { limit: 10 })).items).toHaveLength(0);
    await expectCode(getMedia(admin.ctx, m.id), "NOT_FOUND");
  });
});

describe("public media", () => {
  it("serves own and shared-from-ancestor files of published websites only", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const own = await uploadMedia(adminA.ctx, { tenantId: w.tenantA.id }, { name: "own.png", type: null, bytes: PNG }, client);
    const shared = await uploadMedia(taluka.ctx, { ownerUnitId: w.taluka1.id }, { name: "shared.pdf", type: null, bytes: PDF }, client);
    expect(shared.tenantId).toBeNull();
    expect((await db.media.findUniqueOrThrow({ where: { id: shared.id } })).storageKey).toBe(`shared/${w.taluka1.id}/${shared.id}.pdf`);

    expect(await read((await getPublicMediaFile("gp-a", own.id)).stream)).toEqual(PNG);
    expect((await getPublicMediaFile("gp-a", shared.id)).mimeType).toBe("application/pdf");
    expect((await getPublicMediaFile("gp-b", shared.id)).mimeType).toBe("application/pdf");
    await expectCode(getPublicMediaFile("gp-b", own.id), "NOT_FOUND");
    await expectCode(getPublicMediaFile("gp-c", shared.id), "NOT_FOUND");

    const res = await publicFileRoute(new NextRequest(`http://localhost:3000/api/v1/public/gp-a/media/${own.id}`), params({ tenantSlug: "gp-a", mediaId: own.id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);

    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "DRAFT" } });
    await expectCode(getPublicMediaFile("gp-a", own.id), "NOT_FOUND");
    const hidden = await publicFileRoute(new NextRequest(`http://localhost:3000/api/v1/public/gp-a/media/${own.id}`), params({ tenantSlug: "gp-a", mediaId: own.id }));
    expect(hidden.status).toBe(404);
  });

  it("upload route accepts multipart form data and validates it", async () => {
    const w = await buildWorld();
    const { token } = await actor("GP_ADMIN", w.gpA.id);
    const form = new FormData();
    form.set("file", new File([PNG], "photo.png", { type: "image/png" }));
    form.set("tenantId", w.tenantA.id);
    form.set("altMr", "कार्यालय");
    const req = new NextRequest("http://localhost:3000/api/v1/media", { method: "POST", body: form, headers: { cookie: `dgp_session=${token}` } });
    const res = await uploadRoute(req, params({}));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { kind: string; altMr: string } };
    expect(body.data).toMatchObject({ kind: "IMAGE", altMr: "कार्यालय" });

    const noFile = new FormData();
    noFile.set("tenantId", w.tenantA.id);
    const bad = await uploadRoute(new NextRequest("http://localhost:3000/api/v1/media", { method: "POST", body: noFile, headers: { cookie: `dgp_session=${token}` } }), params({}));
    expect(bad.status).toBe(400);
    const json = await uploadRoute(new NextRequest("http://localhost:3000/api/v1/media", { method: "POST", body: "{}", headers: { "content-type": "application/json", cookie: `dgp_session=${token}` } }), params({}));
    expect(json.status).toBe(400);
  });
});
