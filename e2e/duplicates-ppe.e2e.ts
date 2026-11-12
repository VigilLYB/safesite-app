import { incidentsApi, type Incident } from "@/lib/api";
import { as, describeLive, failure, report, RUN, uploadPhoto, words } from "./support";

/** Pipeline: two similar reports -> auto-cluster -> thread rules -> unlink/relink -> similar. */
describeLive("LIVE duplicates and similar reports", () => {
  const vocab = words();
  let parent: Incident;
  let child: Incident;

  it("a similar report from another worker is nested under the parent", async () => {
    parent = (await report("worker", { category: `E2E ${RUN}`, description: `Leak near ${vocab}` }))
      .incident;
    const result = await report("contractor", {
      category: `E2E ${RUN}`,
      description: `Leaking near ${vocab}`,
    });
    child = result.incident;
    expect(result.ai?.clusteredUnder?.incidentId).toBe(parent.id);
    expect(child.cluster).toMatchObject({ parentIncidentId: parent.id, isDuplicate: true });
    expect(child.lastChange.nodeType).toBe("CLUSTERED");
  });

  it("the parent's worker sees the thread; staff can unlink; other workers can't read the child", async () => {
    await as("contractor");
    expect((await incidentsApi.get(parent.id)).id).toBe(parent.id); // the duplicate's reporter can read the parent
    await as("worker");
    expect((await failure(() => incidentsApi.get(child.id))).status).toBe(404);
    const dups = await incidentsApi.duplicates(parent.id);
    expect(dups.items.map((i) => i.id)).toContain(child.id);
    await as("supervisor");
    expect((await incidentsApi.get(parent.id)).duplicateCount).toBeGreaterThan(0);
  });

  it("hide-duplicates leaves only roots in the triage list", async () => {
    await as("supervisor");
    const roots = await incidentsApi.list({ rootsOnly: true, status: "OPEN", limit: 100 });
    expect(roots.items.some((i) => i.id === parent.id)).toBe(true);
    expect(roots.items.some((i) => i.id === child.id)).toBe(false);
  });

  it("unlink then relink under the parent, with a note; the parent can't be linked under anything while it has duplicates", async () => {
    await as("supervisor");
    const unlinked = await incidentsApi.uncluster(child.id, {
      expectedVersion: (await incidentsApi.get(child.id)).version,
    });
    expect(unlinked.cluster.parentIncidentId).toBeNull();
    const relinked = await incidentsApi.cluster(child.id, {
      parentIncidentId: parent.id,
      expectedVersion: unlinked.version,
      note: "Same leak",
    });
    expect(relinked.cluster.parentIncidentId).toBe(parent.id);
    const p = await incidentsApi.get(parent.id);
    expect(p.permissions.canCluster).toBe(false);
    const other = (await report("worker", { description: `Unrelated ${RUN} ${words()}` })).incident;
    await as("supervisor");
    const blocked = await failure(() =>
      incidentsApi.cluster(parent.id, { parentIncidentId: other.id, expectedVersion: p.version }),
    );
    expect(blocked.status).toBe(409); // "has its own duplicates"
  });

  it("a report can't be its own parent, and linking under a duplicate suggests the real parent", async () => {
    await as("supervisor");
    const c = await incidentsApi.get(child.id);
    expect(
      (
        await failure(() =>
          incidentsApi.cluster(c.id, { parentIncidentId: c.id, expectedVersion: c.version }),
        )
      ).status,
    ).toBe(400);
    const third = (await report("worker", { description: `Third ${RUN} ${words()}` })).incident;
    await as("supervisor");
    const e = await failure(() =>
      incidentsApi.cluster(third.id, {
        parentIncidentId: child.id,
        expectedVersion: third.version,
      }),
    );
    expect(e.status).toBe(422);
    expect((e.details as { suggestedParentId?: string })?.suggestedParentId).toBe(parent.id);
  });

  it("only staff can ask for similar reports; scores are 0..1", async () => {
    await as("worker");
    expect((await failure(() => incidentsApi.similar(parent.id))).status).toBe(403);
    await as("supervisor");
    const { items } = await incidentsApi.similar(parent.id, 20);
    expect(items.length).toBeLessThanOrEqual(20);
    expect(items.every((i) => i.similarity >= 0 && i.similarity <= 1)).toBe(true);
    expect((await failure(() => incidentsApi.similar(parent.id, 21))).status).toBe(400);
  });
});

describeLive("LIVE PPE scan", () => {
  it("scans a photo, lists the scan, and refuses a report without a photo", async () => {
    const photoKey = await uploadPhoto();
    const withPhoto = (await report("worker", { photoKey, description: `PPE ${RUN} ${words()}` }))
      .incident;
    expect(withPhoto.permissions.canRunPpeScan).toBe(true);
    const scan = await incidentsApi.runPpeScan(withPhoto.id);
    expect(["COMPLIANT", "VIOLATION", "NO_PERSONS"]).toContain(scan.summary.verdict);
    expect(scan.photoKey).toBe(withPhoto.photo?.key);
    const scans = await incidentsApi.ppeScans(withPhoto.id);
    expect(scans.some((s) => s.id === scan.id)).toBe(true);

    const noPhoto = (await report("worker", { description: `No photo ${RUN} ${words()}` }))
      .incident;
    expect(noPhoto.permissions.canRunPpeScan).toBe(false);
    expect((await failure(() => incidentsApi.runPpeScan(noPhoto.id))).status).toBe(422);

    await as("contractor"); // not the reporter, not staff
    expect((await failure(() => incidentsApi.ppeScans(withPhoto.id))).status).toBe(404);
    await as("supervisor");
    expect((await incidentsApi.ppeScans(withPhoto.id)).length).toBeGreaterThan(0);
  });
});
