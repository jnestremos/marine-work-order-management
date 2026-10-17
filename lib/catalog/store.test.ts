import { describe, expect, it } from "vitest"
import { marineFixture } from "@/lib/fixtures/marine"
import {
  createCatalogStore,
  resolveCatalog,
  type CatalogState,
} from "@/lib/catalog/store"
import {
  CATALOG_STORAGE_KEY,
  type SessionStorage,
} from "@/lib/session/types"

function memoryStorage(): SessionStorage {
  const values = new Map<string, string>()
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: (name) => {
      values.delete(name)
    },
  }
}

function envelope(catalog: CatalogState): string {
  return JSON.stringify({ state: catalog, version: 0 })
}

describe("resolveCatalog", () => {
  it("restores the seed for a missing payload", () => {
    expect(resolveCatalog(null, marineFixture)).toEqual({
      catalog: marineFixture,
      shouldWrite: true,
    })
  })

  it("restores the seed for malformed JSON", () => {
    expect(resolveCatalog("{not json", marineFixture)).toEqual({
      catalog: marineFixture,
      shouldWrite: true,
    })
  })

  it("restores the seed when vessels are missing", () => {
    const raw = JSON.stringify({
      state: { members: [], assignments: [] },
      version: 0,
    })
    expect(resolveCatalog(raw, marineFixture)).toEqual({
      catalog: marineFixture,
      shouldWrite: true,
    })
  })

  it("keeps a valid empty catalog", () => {
    const catalog: CatalogState = {
      vessels: [],
      members: [],
      assignments: [],
    }
    expect(resolveCatalog(envelope(catalog), marineFixture)).toEqual({
      catalog,
      shouldWrite: false,
    })
  })

  it("keeps a saved catalog with an extra vessel", () => {
    const catalog: CatalogState = {
      ...marineFixture,
      vessels: [
        ...marineFixture.vessels,
        { id: "vessel_tide", name: "MV Tide", active: true },
      ],
    }
    expect(resolveCatalog(envelope(catalog), marineFixture)).toEqual({
      catalog,
      shouldWrite: false,
    })
  })
})

describe("createCatalogStore actions", () => {
  function store() {
    return createCatalogStore({ ...marineFixture, storage: memoryStorage() })
  }

  it("seeds a new store from the marine fixture", () => {
    expect(store().getState()).toMatchObject(marineFixture)
  })

  it("creates an active vessel with a unique id", () => {
    const catalog = store()
    const id = catalog.getState().createVessel("MV Tide")
    expect(id).toBe("vessel_mv_tide")
    expect(catalog.getState().vessels.at(-1)).toEqual({
      id: "vessel_mv_tide",
      name: "MV Tide",
      active: true,
    })
  })

  it("suffixes colliding vessel ids", () => {
    const catalog = store()
    expect(catalog.getState().createVessel("Horizon")).toBe("vessel_horizon_2")
    expect(catalog.getState().createVessel("Horizon")).toBe("vessel_horizon_3")
  })

  it("rejects an empty vessel name", () => {
    const catalog = store()
    const before = catalog.getState().vessels.length
    expect(catalog.getState().createVessel("   ")).toBeNull()
    expect(catalog.getState().vessels).toHaveLength(before)
  })

  it("updates and deactivates a vessel", () => {
    const catalog = store()
    catalog.getState().updateVessel("vessel_horizon", {
      name: "MV Horizon II",
      active: false,
    })
    expect(
      catalog.getState().vessels.find((vessel) => vessel.id === "vessel_horizon"),
    ).toEqual({
      id: "vessel_horizon",
      name: "MV Horizon II",
      active: false,
    })
    expect(
      catalog
        .getState()
        .activeVessels()
        .map((vessel) => vessel.id),
    ).toEqual(["vessel_aurora"])
  })

  it("creates a member and updates their role", () => {
    const catalog = store()
    const id = catalog.getState().createMember("Lane Quinn", "captain")
    expect(id).toBe("member_lane_quinn")
    catalog.getState().updateMember(id!, { role: "crew" })
    expect(
      catalog.getState().members.find((member) => member.id === id),
    ).toMatchObject({
      name: "Lane Quinn",
      role: "crew",
      active: true,
    })
  })

  it("sets and clears an assignment", () => {
    const catalog = store()
    catalog.getState().setAssignment("member_casey", "vessel_aurora", true)
    expect(catalog.getState().assignments).toContainEqual({
      memberId: "member_casey",
      vesselId: "vessel_aurora",
    })
    catalog.getState().setAssignment("member_casey", "vessel_aurora", false)
    expect(catalog.getState().assignments).not.toContainEqual({
      memberId: "member_casey",
      vesselId: "vessel_aurora",
    })
  })

  it("ignores assignments for unknown ids", () => {
    const catalog = store()
    const before = catalog.getState().assignments.length
    catalog.getState().setAssignment("missing", "vessel_horizon", true)
    catalog.getState().setAssignment("member_casey", "missing", true)
    expect(catalog.getState().assignments).toHaveLength(before)
  })
})

describe("createCatalogStore persistence", () => {
  it("writes the seed envelope when storage is empty", async () => {
    const storage = memoryStorage()
    const catalog = createCatalogStore({ ...marineFixture, storage })
    await catalog.persist.rehydrate()
    expect(storage.getItem(CATALOG_STORAGE_KEY)).toBe(envelope(marineFixture))
    expect(catalog.getState().hasHydrated).toBe(true)
  })

  it("keeps a saved catalog without rewriting storage", async () => {
    const saved: CatalogState = {
      vessels: [{ id: "vessel_tide", name: "MV Tide", active: true }],
      members: [
        {
          id: "member_lane",
          name: "Lane Quinn",
          role: "admin",
          active: true,
        },
      ],
      assignments: [{ memberId: "member_lane", vesselId: "vessel_tide" }],
    }
    const storage = memoryStorage()
    const raw = envelope(saved)
    storage.setItem(CATALOG_STORAGE_KEY, raw)
    let writes = 0
    const write = storage.setItem
    storage.setItem = (name, value) => {
      writes += 1
      write(name, value)
    }
    const catalog = createCatalogStore({ ...marineFixture, storage })
    await catalog.persist.rehydrate()
    expect(catalog.getState()).toMatchObject(saved)
    expect(writes).toBe(0)
    expect(storage.getItem(CATALOG_STORAGE_KEY)).toBe(raw)
  })
})
