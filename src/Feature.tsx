import { useEffect, useState } from "react";
import {
  MeshToasts,
  pushToast,
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
      <div className="track-screen">
        <h1>room soundtrack</h1>
        <p className="track-status">Connecting…</p>
      </div>
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
    pushToast(room, `queued '${t.title}'`, { ttl: 3500, peerId: room.peerId });
    setTitle("");
    setArtist("");
    setUrl("");
  };

  const vote = (id: string, dir: "up" | "down") => {
    const key = `${room.peerId}|${id}`;
    const cur = votes.get(key);
    if (cur === dir) votes.delete(key);
    else votes.set(key, dir);
  };

  const present = room.peerCount + 1;
  const isHttp = (u?: string) => !!u && /^https?:\/\//.test(u);

  const row = (t: Track) => {
    const mine = t.peerId === room.peerId;
    const mv = myVote(t.id);
    return (
      <li key={t.id} className="track-row">
        <div className="track-meta">
          <div className="track-title">{t.title}</div>
          <div className="track-sub">
            {t.artist} · {nameOf(t.peerId) ?? "peer"}
          </div>
        </div>
        <span className="track-score">{score(t.id)}</span>
        <button
          type="button"
          className={`track-btn ${mv === "up" ? "track-btn-on" : ""}`}
          onClick={() => vote(t.id, "up")}
          disabled={mine}
          aria-label={`upvote ${t.title}`}
        >
          ▲
        </button>
        <button
          type="button"
          className={`track-btn ${mv === "down" ? "track-btn-on" : ""}`}
          onClick={() => vote(t.id, "down")}
          disabled={mine}
          aria-label={`downvote ${t.title}`}
        >
          ▼
        </button>
      </li>
    );
  };

  return (
    <div className="track-screen">
      <MeshToasts room={room} resolveName={nameOf} position="top" />
      <header className="track-header">
        <h1>room soundtrack</h1>
        <p className="track-status">
          {log.size} queued · {present} {present === 1 ? "peer" : "peers"}
        </p>
      </header>
      <div className="track-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>
      <div className="track-submit-row">
        <input
          className="track-input-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
          maxLength={80}
        />
        <input
          className="track-input-artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="artist"
          maxLength={80}
        />
        <input
          className="track-input-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="url (optional)"
          maxLength={500}
        />
        <button type="button" className="track-submit" onClick={submit} disabled={!canSubmit}>
          queue it
        </button>
      </div>
      {now && (
        <div className="track-now">
          <div className="track-now-label">now playing</div>
          <div className="track-now-title">{now.title}</div>
          <div className="track-now-sub">
            {now.artist} · {nameOf(now.peerId) ?? "peer"}{" "}
            <span className="track-score">{score(now.id)}</span>
            {isHttp(now.url) && (
              <>
                {" · "}
                <a href={now.url} target="_blank" rel="noopener noreferrer">
                  open ↗
                </a>
              </>
            )}
          </div>
        </div>
      )}
      <ul className="track-queue">{rest.map(row)}</ul>
    </div>
  );
}
