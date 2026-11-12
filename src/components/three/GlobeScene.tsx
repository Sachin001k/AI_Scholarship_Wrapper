"use client";

/**
 * Hero globe: dotted continents, journey arcs from home to study destinations,
 * and a small "scholar" animation (a graduation cap that gets tossed + a
 * floating diploma). Colours follow the light/dark theme. Loaded lazily via Globe.tsx.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { LAND_POINTS } from "./land-points";
import { COUNTRY_BY_CODE } from "@/lib/domain/reference";
import type { ResolvedTheme } from "@/lib/theme";

const R = 1.6;

const PALETTE = {
  light: {
    dotA: "#1d4ed8",
    dotB: "#60a5fa",
    sphere: "#e0e9ff",
    sphereGlow: 0.55,
    glow: "#93c5fd",
    glowStrength: 0.4,
    arcs: ["#2563eb", "#0891b2", "#16a34a", "#d97706", "#db2777"],
    comet: "#1e3a8a",
    home: "#d97706",
    cap: "#1e293b",
    capBoard: "#0f172a",
    tassel: "#d97706",
    paper: "#fffbeb",
    ribbon: "#dc2626",
    sparkle: "#3b82f6",
    ambient: 1.1,
  },
  dark: {
    dotA: "#60a5fa",
    dotB: "#a5b4fc",
    sphere: "#0f1a33",
    sphereGlow: 0,
    glow: "#3b82f6",
    glowStrength: 1,
    arcs: ["#60a5fa", "#22d3ee", "#4ade80", "#fbbf24", "#f472b6"],
    comet: "#ffffff",
    home: "#fbbf24",
    cap: "#1e293b",
    capBoard: "#111827",
    tassel: "#fbbf24",
    paper: "#fef3c7",
    ribbon: "#ef4444",
    sparkle: "#93c5fd",
    ambient: 0.6,
  },
} as const;
type Palette = (typeof PALETTE)[ResolvedTheme];

function latLngToVec(lat: number, lng: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

// ---------- globe parts ----------

function LandDots({ p }: { p: Palette }) {
  const { positions, colors } = useMemo(() => {
    const n = LAND_POINTS.length / 2;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const a = new THREE.Color(p.dotA);
    const b = new THREE.Color(p.dotB);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const lat = LAND_POINTS[i * 2] / 10;
      const lng = LAND_POINTS[i * 2 + 1] / 10;
      latLngToVec(lat, lng, R * 1.002).toArray(positions, i * 3);
      c.lerpColors(a, b, (lat + 60) / 150).toArray(colors, i * 3);
    }
    return { positions, colors };
  }, [p]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.026} vertexColors transparent opacity={0.95} sizeAttenuation depthWrite={false} />
    </points>
  );
}

const atmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vNormal;
    uniform vec3 uColor;
    uniform float uStrength;
    void main() {
      float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0) * uStrength;
      gl_FragColor = vec4(uColor, intensity);
    }`,
};

function Atmosphere({ p }: { p: Palette }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(p.glow) }, uStrength: { value: p.glowStrength } }), [p]);
  return (
    <mesh scale={1.16}>
      <sphereGeometry args={[R, 64, 64]} />
      <shaderMaterial args={[{ ...atmosphereShader, uniforms }]} side={THREE.BackSide} transparent depthWrite={false} />
    </mesh>
  );
}

function Arc({ from, to, color, comet, delay }: { from: THREE.Vector3; to: THREE.Vector3; color: string; comet: string; delay: number }) {
  const { geometry, curve, total } = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(R * (1 + from.distanceTo(to) * 0.32));
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geometry = new THREE.TubeGeometry(curve, 96, 0.011, 8, false);
    return { geometry, curve, total: geometry.index!.count };
  }, [from, to]);
  const dot = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);

  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - start.current - delay;
    const grow = THREE.MathUtils.clamp(t / 1.4, 0, 1);
    geometry.setDrawRange(0, Math.floor(total * grow));
    if (dot.current) {
      dot.current.visible = grow >= 1;
      dot.current.position.copy(curve.getPoint(Math.max(0, (t * 0.32) % 1)));
    }
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={comet} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Marker({ pos, color, pulse }: { pos: THREE.Vector3; color: string; pulse?: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  useFrame(({ clock }) => {
    if (!ring.current || !pulse) return;
    const s = 1 + ((clock.elapsedTime * 0.8) % 1) * 2.2;
    ring.current.scale.setScalar(s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 1 - (s - 1) / 2.2;
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <circleGeometry args={[0.038, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.05, 0.064, 32]} />
        <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Globe({ home, targets, p }: { home: string; targets: string[]; p: Palette }) {
  const group = useRef<THREE.Group>(null);
  const homeC = COUNTRY_BY_CODE[home];
  const homeV = useMemo(() => (homeC ? latLngToVec(homeC.lat, homeC.lng) : null), [homeC]);
  const targetVs = useMemo(
    () => targets.map((c) => COUNTRY_BY_CODE[c]).filter((c) => c && c.code !== home).map((c) => ({ code: c.code, v: latLngToVec(c.lat, c.lng) })),
    [targets, home],
  );
  const baseY = useMemo(() => (homeC ? -((homeC.lng + 90) * Math.PI) / 180 : 0), [homeC]);

  useFrame(({ pointer }, dt) => {
    const g = group.current;
    if (!g) return;
    g.userData.t = (g.userData.t ?? 0) + dt;
    const k = 1 - Math.pow(0.04, dt);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.35 + pointer.y * 0.2, k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, baseY + pointer.x * 0.5 + Math.sin(g.userData.t * 0.15) * 0.45, k);
  });

  return (
    <group ref={group} rotation={[0.35, baseY - 0.5, 0]}>
      <mesh>
        <sphereGeometry args={[R * 0.995, 64, 64]} />
        <meshStandardMaterial color={p.sphere} emissive={p.sphere} emissiveIntensity={p.sphereGlow} roughness={0.9} metalness={0} />
      </mesh>
      <LandDots p={p} />
      <Atmosphere p={p} />
      {homeV && <Marker pos={homeV} color={p.home} pulse />}
      {targetVs.map((t, i) => (
        <group key={t.code}>
          <Marker pos={t.v} color={p.arcs[i % p.arcs.length]} />
          {homeV && <Arc from={homeV} to={t.v} color={p.arcs[i % p.arcs.length]} comet={p.comet} delay={0.4 + i * 0.25} />}
        </group>
      ))}
    </group>
  );
}

// ---------- scholar animation ----------

/** Graduation cap that bobs, and every few seconds is tossed up with a spin (like graduation day). */
function TossedCap({ p }: { p: Palette }) {
  const cap = useRef<THREE.Group>(null);
  const tassel = useRef<THREE.Group>(null);
  const PERIOD = 6;
  const TOSS = 1.4;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const phase = t % PERIOD;
    const c = cap.current;
    if (!c) return;
    let lift = Math.sin(t * 1.6) * 0.05;
    let spin = 0;
    if (phase > PERIOD - TOSS) {
      const u = (phase - (PERIOD - TOSS)) / TOSS; // 0..1 through the toss
      lift += Math.sin(u * Math.PI) * 0.6; // up and back down
      spin = u * Math.PI * 2; // one full flip
    }
    c.position.y = 1.45 + lift;
    c.rotation.set(0.35 + spin, -0.6 + t * 0.15, 0.12);
    if (tassel.current) tassel.current.rotation.z = Math.sin(t * 3) * 0.35;
  });

  return (
    <group ref={cap} position={[1.6, 1.45, 0.5]} scale={0.5}>
      {/* board */}
      <mesh>
        <boxGeometry args={[1, 0.06, 1]} />
        <meshStandardMaterial color={p.capBoard} roughness={0.5} />
      </mesh>
      {/* skull cap */}
      <mesh position={[0, -0.19, 0]}>
        <cylinderGeometry args={[0.31, 0.35, 0.32, 32]} />
        <meshStandardMaterial color={p.cap} roughness={0.5} />
      </mesh>
      {/* button */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
        <meshStandardMaterial color={p.tassel} emissive={p.tassel} emissiveIntensity={0.3} />
      </mesh>
      {/* tassel cord + end, swinging */}
      <group ref={tassel} position={[0, 0.05, 0]}>
        <mesh position={[0.25, 0, 0.25]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.7, 0.015, 0.015]} />
          <meshStandardMaterial color={p.tassel} />
        </mesh>
        <mesh position={[0.5, -0.2, 0.5]}>
          <cylinderGeometry args={[0.012, 0.012, 0.4, 8]} />
          <meshStandardMaterial color={p.tassel} />
        </mesh>
        <mesh position={[0.5, -0.43, 0.5]}>
          <coneGeometry args={[0.06, 0.16, 12]} />
          <meshStandardMaterial color={p.tassel} emissive={p.tassel} emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** Rolled-up diploma with a ribbon, floating gently. */
function Diploma({ p }: { p: Palette }) {
  return (
    <Float speed={1.6} rotationIntensity={0.5} floatIntensity={0.7}>
      <group position={[-1.85, 1.25, 0.3]} rotation={[0.3, 0.4, -Math.PI / 6]} scale={0.55}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 1.3, 32]} />
          <meshStandardMaterial color={p.paper} roughness={0.8} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.17, 0.035, 12, 32]} />
          <meshStandardMaterial color={p.ribbon} roughness={0.4} />
        </mesh>
        <mesh position={[0.02, -0.25, 0.08]} rotation={[0.2, 0, -0.3]}>
          <boxGeometry args={[0.06, 0.3, 0.01]} />
          <meshStandardMaterial color={p.ribbon} />
        </mesh>
      </group>
    </Float>
  );
}

/** Calls onReady once the first frame has rendered (lets Globe.tsx cross-fade from the CSS fallback). */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady?.());
  });
  return null;
}

export default function GlobeScene({
  theme,
  home = "IN",
  targets = ["US", "GB", "CA", "DE", "AU"],
  onReady,
}: {
  theme: ResolvedTheme;
  home?: string;
  targets?: string[];
  onReady?: () => void;
}) {
  const p = PALETTE[theme];
  return (
    <Canvas camera={{ position: [0, 0, 5.6], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <FirstFrame onReady={onReady} />
      <ambientLight intensity={p.ambient} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} />
      <pointLight position={[-4, -2, -3]} intensity={20} color={p.glow} />
      {theme === "dark" && <Stars radius={60} depth={40} count={1800} factor={3} saturation={0} fade speed={0.5} />}
      <Globe home={home} targets={targets} p={p} />
      <TossedCap p={p} />
      <Diploma p={p} />
      <Sparkles count={40} scale={[6.5, 5, 4]} size={2} speed={0.3} color={p.sparkle} opacity={theme === "dark" ? 0.8 : 0.5} />
    </Canvas>
  );
}
