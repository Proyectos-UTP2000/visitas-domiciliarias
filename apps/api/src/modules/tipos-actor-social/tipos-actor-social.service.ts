import { HttpError } from "../../shared/http-error.js";
import type {
  TipoActorSocialCreateInput,
  TipoActorSocialRecord,
  TipoActorSocialUpdateInput,
  TiposActorSocialRepository,
} from "./tipos-actor-social.types.js";

export class TiposActorSocialService {
  constructor(private readonly repository: TiposActorSocialRepository) {}
  list(): Promise<TipoActorSocialRecord[]> {
    return this.repository.list();
  }
  async create(
    input: TipoActorSocialCreateInput,
  ): Promise<TipoActorSocialRecord> {
    const existing = await this.repository.findByCodigo(input.codigo);
    if (existing)
      throw new HttpError(
        409,
        "Ya existe un tipo de actor social con ese código",
      );
    return this.repository.create({ ...input, activo: true, archivado: false });
  }
  async update(
    id: string,
    input: TipoActorSocialUpdateInput,
  ): Promise<TipoActorSocialRecord> {
    await this.ensureExists(id);
    return this.repository.update(id, input);
  }
  async setActivo(id: string, activo: boolean): Promise<TipoActorSocialRecord> {
    await this.ensureExists(id);
    return this.repository.setActivo(id, activo);
  }
  async archive(id: string): Promise<TipoActorSocialRecord> {
    await this.ensureExists(id);
    return this.repository.archive(id);
  }
  private async ensureExists(id: string) {
    if (!(await this.repository.findById(id)))
      throw new HttpError(404, "Tipo de actor social no encontrado");
  }
}
