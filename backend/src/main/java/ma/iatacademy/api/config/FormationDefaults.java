package ma.iatacademy.api.config;

import java.util.UUID;

/**
 * The app currently assumes a single Formation, seeded with this fixed id in
 * V1__init_schema.sql. Centralizes what used to be the same literal repeated
 * independently in several services/controllers/the seeder.
 */
public final class FormationDefaults {

    public static final UUID DEFAULT_FORMATION_ID =
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    private FormationDefaults() {
    }
}
