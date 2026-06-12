import { describe, expect, it } from "vitest";
import {
  emptyTipoActorSocialForm,
  toTipoActorSocialForm,
  buildTipoActorSocialPayload,
  filterTiposActorSocial,
} from "./tipos-actor-social-utils";
import type { TipoActorSocialRecord } from "./tipos-actor-social-types";

const dummyRecords: TipoActorSocialRecord[] = [
  {
    id: "1",
    tipoActor: "Actor Rural",
    tarifaRural: 15.5,
    tarifaUrbana: 12.0,
    orden: 1,
    codigo: "R01",
    activo: true,
    archivado: false,
  },
  {
    id: "2",
    tipoActor: "Actor Urbano",
    tarifaRural: 10.0,
    tarifaUrbana: 14.5,
    orden: 2,
    codigo: "U02",
    activo: false,
    archivado: false,
  },
];

describe("tipos-actor-social-utils", () => {
  it("returns empty form", () => {
    expect(emptyTipoActorSocialForm).toEqual({
      tipoActor: "",
      tarifaRural: "",
      tarifaUrbana: "",
      orden: "",
      codigo: "",
    });
  });

  it("converts record to form", () => {
    expect(toTipoActorSocialForm(dummyRecords[0])).toEqual({
      tipoActor: "Actor Rural",
      tarifaRural: "15.5",
      tarifaUrbana: "12",
      orden: "1",
      codigo: "R01",
    });
  });

  it("builds payload with parsed numbers", () => {
    const form = {
      tipoActor: " Actor Test  ",
      tarifaRural: "18.5",
      tarifaUrbana: "15",
      orden: "3",
      codigo: "T03",
    };
    expect(buildTipoActorSocialPayload(form)).toEqual({
      tipoActor: "Actor Test",
      tarifaRural: 18.5,
      tarifaUrbana: 15.0,
      orden: 3,
      codigo: "T03",
    });
  });

  it("filters records by query", () => {
    expect(filterTiposActorSocial(dummyRecords, "rural")).toHaveLength(1);
    expect(filterTiposActorSocial(dummyRecords, "U02")).toHaveLength(1);
    expect(filterTiposActorSocial(dummyRecords, "")).toHaveLength(2);
  });
});
