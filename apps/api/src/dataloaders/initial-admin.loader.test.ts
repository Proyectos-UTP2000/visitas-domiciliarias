import { describe, expect, it, vi } from "vitest";
import { seedInitialAdmin } from "./initial-admin.loader.js";

describe("seedInitialAdmin", () => {
  it("creates an active ADMIN_GENERAL user when username does not exist", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "admin-id" });
    const hashPassword = vi.fn().mockResolvedValue("hashed-password");

    const result = await seedInitialAdmin({
      users: { findUnique, create },
      hashPassword,
      config: { username: "admin", password: "secret" }
    });

    expect(result).toEqual({ created: true, username: "admin" });
    expect(create).toHaveBeenCalledWith({
      data: {
        username: "admin",
        passwordHash: "hashed-password",
        rol: "ADMIN_GENERAL",
        activo: true,
        municipalidadId: null
      }
    });
  });

  it("does not duplicate an existing admin username", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "existing-admin" });
    const create = vi.fn();
    const hashPassword = vi.fn();

    const result = await seedInitialAdmin({
      users: { findUnique, create },
      hashPassword,
      config: { username: "admin", password: "secret" }
    });

    expect(result).toEqual({ created: false, username: "admin" });
    expect(create).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });
});
