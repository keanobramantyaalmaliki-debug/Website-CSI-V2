"use client";

import { useEffect, useRef, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useSceneStore, VIEW_KEYS, type RoomKey } from "@/lib/store/sceneStore";

const bl = (x: number, y: number, z: number) => new Vector3(x, z, -y);

export const VIEWS: Record<RoomKey, { pos: Vector3; tgt: Vector3; disabled?: true }> = {
  Office:   { pos: bl(-6.0,  -4.0, 1.6),  tgt: bl(-11.0, -3.0, 1.1) },
  Lounge:   { pos: bl( 0.3,  -7.3, 1.55), tgt: bl(  0.0,  3.0, 1.1) },
  Meeting:  { pos: bl(-16.2, -0.4, 1.6),  tgt: bl(-20.5, -0.4, 1.3) },
  Function: { pos: bl( 0.0,   7.6, 1.6),  tgt: bl( -0.5, 10.5, 1.2) },
  Pantry:   { pos: bl(-15.5, -5.5, 1.7),  tgt: bl(-17.5, -3.2, 1.2), disabled: true },
};

export const ACTIVE_KEYS = VIEW_KEYS.filter((k) => !VIEWS[k].disabled) as RoomKey[];

const TWEEN_MS = 1400;

// Parallax: seberapa jauh kamera bergeser mengikuti mouse (meter, di ruang
// lokal kamera). Kecil saja — ini "bernafas", bukan orbit.
const PARALLAX_X = 0.12;
const PARALLAX_Y = 0.08;
// Idle sway: goyang halus terus-menerus supaya frame diam tidak terasa mati.
const SWAY_AMP = 0.015;
const SWAY_SPEED = 0.0006; // rad per ms
// Damping parallax (0..1 per frame ~60fps) — makin kecil makin lembut.
const PARALLAX_DAMP = 0.05;

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function CameraController() {
  const { camera, gl } = useThree();
  const setCurrentRoom = useSceneStore((s) => s.setCurrentRoom);
  const registerGoTo   = useSceneStore((s) => s.registerGoTo);

  const currentRoomRef = useRef<RoomKey>("Office");
  const animating      = useRef(false);
  const tweenStart     = useRef(0);
  const fromPos        = useRef(new Vector3());
  const fromTgt        = useRef(new Vector3());
  const toPos          = useRef(new Vector3());
  const toTgt          = useRef(new Vector3());
  const lookTarget     = useRef(new Vector3());

  // Posisi "logis" kamera (hasil tween/hash) — TERPISAH dari camera.position.
  // Parallax & idle sway ditambahkan sebagai offset di atas basePos tiap frame,
  // jadi navigasi tetap akurat sementara kamera terasa hidup.
  const basePos        = useRef(new Vector3());
  const mouse          = useRef({ x: 0, y: 0 }); // -1..1
  const parallax       = useRef({ x: 0, y: 0 }); // damped

  // snap to start on mount
  useEffect(() => {
    const v = VIEWS["Office"];
    basePos.current.copy(v.pos);
    camera.position.copy(v.pos);
    lookTarget.current.copy(v.tgt);
    camera.lookAt(v.tgt);
  }, [camera]);

  const goTo = useCallback(
    (name: RoomKey) => {
      if (VIEWS[name]?.disabled) return;
      if (animating.current) return;
      if (name === currentRoomRef.current) return;

      fromPos.current.copy(basePos.current);
      fromTgt.current.copy(lookTarget.current);
      toPos.current.copy(VIEWS[name].pos);
      toTgt.current.copy(VIEWS[name].tgt);
      tweenStart.current = performance.now();
      animating.current  = true;
      currentRoomRef.current = name;
      setCurrentRoom(name);

      const hash = name === "Office" ? "" : `#${name.toLowerCase()}`;
      history.pushState(null, "", window.location.pathname + hash);
    },
    [setCurrentRoom],
  );

  // register goTo in store so RoomNav (outside Canvas) can call it
  useEffect(() => {
    registerGoTo(goTo);
    return () => registerGoTo(() => {});
  }, [goTo, registerGoTo]);

  const nextRoom = useCallback(() => {
    const idx  = ACTIVE_KEYS.indexOf(currentRoomRef.current);
    const next = ACTIVE_KEYS[(idx + 1) % ACTIVE_KEYS.length];
    goTo(next);
  }, [goTo]);

  const prevRoom = useCallback(() => {
    const idx  = ACTIVE_KEYS.indexOf(currentRoomRef.current);
    const prev = ACTIVE_KEYS[(idx - 1 + ACTIVE_KEYS.length) % ACTIVE_KEYS.length];
    goTo(prev);
  }, [goTo]);

  // wheel on canvas only — page scroll unaffected
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) nextRoom(); else prevRoom();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, nextRoom, prevRoom]);

  // mouse position for parallax (normalized -1..1, center = 0)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") nextRoom();
      if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  prevRoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextRoom, prevRoom]);

  // touch swipe
  useEffect(() => {
    let startY = 0;
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onEnd   = (e: TouchEvent) => {
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 30) return;
      if (dy > 0) nextRoom(); else prevRoom();
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend",   onEnd);
    };
  }, [nextRoom, prevRoom]);

  // hash routing on load
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const key = VIEW_KEYS.find((k) => k.toLowerCase() === hash);
      if (key && !VIEWS[key].disabled) {
        currentRoomRef.current = key;
        setCurrentRoom(key);
        basePos.current.copy(VIEWS[key].pos);
        camera.position.copy(VIEWS[key].pos);
        lookTarget.current.copy(VIEWS[key].tgt);
        camera.lookAt(VIEWS[key].tgt);
      }
    }

    const onPop = () => {
      const h   = window.location.hash.replace("#", "");
      const key = (h
        ? VIEW_KEYS.find((k) => k.toLowerCase() === h)
        : "Office") as RoomKey | undefined;
      if (key && !VIEWS[key]?.disabled) goTo(key);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [camera, goTo, setCurrentRoom]);

  useFrame(() => {
    const now = performance.now();

    // 1) posisi logis dari tween (kalau sedang berpindah ruangan)
    if (animating.current) {
      const t = Math.min((now - tweenStart.current) / TWEEN_MS, 1);
      const e = ease(t);
      basePos.current.lerpVectors(fromPos.current, toPos.current, e);
      lookTarget.current.lerpVectors(fromTgt.current, toTgt.current, e);
      if (t >= 1) animating.current = false;
    }

    // 2) parallax mengejar mouse dengan damping (lembut, tidak patah)
    parallax.current.x += (mouse.current.x - parallax.current.x) * PARALLAX_DAMP;
    parallax.current.y += (mouse.current.y - parallax.current.y) * PARALLAX_DAMP;

    // 3) idle sway — sinus halus supaya frame diam tetap "bernafas"
    const swayX = Math.sin(now * SWAY_SPEED) * SWAY_AMP;
    const swayY = Math.cos(now * SWAY_SPEED * 0.8) * SWAY_AMP;

    // Pasang posisi & orientasi dari nilai logis, lalu geser di sumbu lokal
    // kamera (right/up). Menggeser SETELAH lookAt = viewpoint bergeser tapi
    // tetap mengarah ke target → efek parallax, bukan orbit. basePos tak
    // pernah ikut bergeser jadi tidak ada drift antar frame.
    camera.position.copy(basePos.current);
    camera.lookAt(lookTarget.current);
    camera.translateX(parallax.current.x * PARALLAX_X + swayX);
    camera.translateY(-parallax.current.y * PARALLAX_Y + swayY);
  });

  return null;
}
