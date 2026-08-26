import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-room-soundtrack",
  breadcrumbs: false,
  displayName: "Room Soundtrack",
  visualProfile: "gather",
  shellLayout: "inset",
  description:
    "A democratic shared listening queue: every person can add a track, vote, and agree on what comes next.",
  accentHex: "#f0ba64",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
