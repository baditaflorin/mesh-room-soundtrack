import { useEffect, useState, type FormEvent } from "react";
import {
  MeshButton,
  MeshNameInput,
  MeshStatusPill,
  MeshSurface,
  MeshToasts,
  SafeLink,
  pushToast,
  safeUrl,
  useEventLog,
  useNamedPeer,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Track = {
  id: string;
  peerId: string;
  title: string;
  artist: string;
  url?: string;
  ts: number;
};

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <main className="soundtrack-page soundtrack-page--connecting" aria-busy="true">
        <MeshSurface as="section" tone="raised" padding="lg" className="soundtrack-connecting">
          <span className="soundtrack-kicker">Shared listening queue</span>
          <h1>Room Soundtrack</h1>
          <p>Preparing the room so everyone can shape the next track together.</p>
          <MeshStatusPill tone="info" dot announce="polite">
            Connecting
          </MeshStatusPill>
        </MeshSurface>
      </main>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName, nameOf } = useNamedPeer(config, room);
  const log = useEventLog<Track>(room, "tracks");
  const [, rerender] = useState(0);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const m = room.doc.getMap<"up" | "down">("track-votes");
    const cb = () => rerender((n) => n + 1);
    m.observe(cb);
    return () => m.unobserve(cb);
  }, [room]);

  const votes = room.doc.getMap<"up" | "down">("track-votes");
  const trimmed = name.trim();
  const canSubmit = !!trimmed && !!title.trim() && !!artist.trim();

  const score = (id: string) => {
    let s = 0;
    votes.forEach((v, k) => {
      if (k.endsWith(`|${id}`)) s += v === "up" ? 1 : -1;
    });
    return s;
  };
  const myVote = (id: string) => votes.get(`${room.peerId}|${id}`);

  const sorted = [...log.events].sort((a, b) => {
    const d = score(b.id) - score(a.id);
    return d !== 0 ? d : a.ts - b.ts;
  });
  const [now, ...rest] = sorted;

  const submit = () => {
    if (!canSubmit) return;
    const t: Track = {
      id: Math.random().toString(36).slice(2, 12),
      peerId: room.peerId,
      title: title.trim(),
      artist: artist.trim(),
      url: url.trim() || undefined,
      ts: Date.now(),
    };
    log.push(t);
    pushToast(room, `Added ${t.title} to the room queue`, { ttl: 3500, peerId: room.peerId });
    setTitle("");
    setArtist("");
    setUrl("");
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const vote = (id: string, dir: "up" | "down") => {
    const key = `${room.peerId}|${id}`;
    const cur = votes.get(key);
    if (cur === dir) votes.delete(key);
    else votes.set(key, dir);
  };

  const present = room.peerCount + 1;
  const isHttp = (u?: string) => !!u && !!safeUrl(u, { allowSchemes: ["http:", "https:"] });

  const row = (t: Track) => {
    const mine = t.peerId === room.peerId;
    const mv = myVote(t.id);
    return (
      <li key={t.id} className="track-row">
        <div className="track-meta">
          <div className="track-title">{t.title}</div>
          <div className="track-sub">
            {t.artist} <span aria-hidden="true">·</span> added by {nameOf(t.peerId) ?? "a peer"}
          </div>
        </div>
        <span className="track-score" aria-label={`${score(t.id)} votes`}>
          {score(t.id)}
        </span>
        <MeshButton
          className={`track-btn ${mv === "up" ? "track-btn-on" : ""}`}
          size="sm"
          variant="quiet"
          onClick={() => vote(t.id, "up")}
          disabled={mine}
          aria-label={`upvote ${t.title}`}
        >
          <span aria-hidden="true">▲</span>
        </MeshButton>
        <MeshButton
          className={`track-btn ${mv === "down" ? "track-btn-on" : ""}`}
          size="sm"
          variant="quiet"
          onClick={() => vote(t.id, "down")}
          disabled={mine}
          aria-label={`downvote ${t.title}`}
        >
          <span aria-hidden="true">▼</span>
        </MeshButton>
      </li>
    );
  };

  return (
    <main className="soundtrack-page" aria-labelledby="soundtrack-title">
      <MeshToasts room={room} resolveName={nameOf} position="top" />
      <header className="soundtrack-hero">
        <div className="soundtrack-hero-copy">
          <span className="soundtrack-kicker">Shared listening queue</span>
          <h1 id="soundtrack-title">Choose the room’s next track.</h1>
          <p>Add what belongs in the room, then let the group’s votes settle the order.</p>
        </div>
        <div className="soundtrack-stats" aria-label="Room activity">
          <MeshStatusPill tone={log.size > 0 ? "live" : "neutral"} dot>
            {log.size} {log.size === 1 ? "track" : "tracks"}
          </MeshStatusPill>
          <MeshStatusPill tone="info">
            {present} {present === 1 ? "person" : "people"}
          </MeshStatusPill>
        </div>
      </header>

      <div className="soundtrack-workspace">
        <MeshSurface as="section" tone="raised" padding="none" className="track-stage">
          <div className="track-stage-topline">
            <span className="track-now-label">{now ? "Top of queue" : "The room is quiet"}</span>
            {now ? <span className="track-vote-summary">{score(now.id)} group votes</span> : null}
          </div>
          {now ? (
            <div className="track-now">
              <div className="track-now-art" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="track-now-copy">
                <div className="track-now-title">{now.title}</div>
                <div className="track-now-sub">{now.artist}</div>
                <p>
                  Added by <strong>{nameOf(now.peerId) ?? "a peer"}</strong>
                  {isHttp(now.url) ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <SafeLink href={now.url} allowSchemes={["http:", "https:"]}>
                        Open the source ↗
                      </SafeLink>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          ) : (
            <div className="track-empty">
              <div className="track-empty-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <h2>Start the room’s soundtrack.</h2>
                <p>The first shared track becomes the first thing everyone can vote on.</p>
              </div>
            </div>
          )}
          <p className="track-stage-note">
            This room coordinates the queue. Audio opens only when someone chooses a source in their
            own browser.
          </p>
        </MeshSurface>

        <MeshSurface as="section" tone="accent" padding="md" className="track-composer">
          <div className="track-composer-heading">
            <div>
              <span className="soundtrack-kicker">Contribute</span>
              <h2>Add a track</h2>
            </div>
            <span className="track-composer-step">01</span>
          </div>
          <form className="track-submit-row" onSubmit={submitForm}>
            <MeshNameInput
              className="track-name"
              value={name}
              onChange={setName}
              placeholder="your name"
              label="Your name"
              maxLength={48}
            />
            <label className="track-field">
              <span>Track title</span>
              <input
                className="track-input-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="title"
                maxLength={80}
                autoComplete="off"
              />
            </label>
            <label className="track-field">
              <span>Artist</span>
              <input
                className="track-input-artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="artist"
                maxLength={80}
                autoComplete="off"
              />
            </label>
            <details className="track-source-details">
              <summary>
                Add a source link <em>optional</em>
              </summary>
              <label className="track-field track-field-url">
                <span>Source link</span>
                <input
                  className="track-input-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="url (optional)"
                  maxLength={500}
                  inputMode="url"
                  autoComplete="url"
                />
              </label>
            </details>
            <MeshButton type="submit" className="track-submit" fullWidth disabled={!canSubmit}>
              Add to queue
            </MeshButton>
          </form>
        </MeshSurface>

        <MeshSurface as="section" tone="quiet" padding="none" className="track-queue-panel">
          <div className="track-queue-heading">
            <div>
              <span className="soundtrack-kicker">The vote</span>
              <h2>Up next</h2>
            </div>
            <span>{rest.length} waiting</span>
          </div>
          {rest.length > 0 ? (
            <ul className="track-queue">{rest.map(row)}</ul>
          ) : (
            <p className="track-queue-empty">
              When there is more than one track, the remaining picks collect here.
            </p>
          )}
        </MeshSurface>
      </div>
    </main>
  );
}
