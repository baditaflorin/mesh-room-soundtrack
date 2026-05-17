import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-room-soundtrack",
  description: "Democratic room playlist: any peer queues, peers upvote, top is now playing.",
  accentHex: "#9d6dff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
