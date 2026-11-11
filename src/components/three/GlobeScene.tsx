"use client";

/**
 * Interactive dotted globe with animated journey arcs from the student's home
 * country to their target study destinations. Loaded lazily (see Globe.tsx).
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { LAND_POINTS } from "./land-points";
import { COUNTRY_BY_CODE } from "@/lib/domain/reference";

const R = 1.6;

function latLngToVec(lat: number, lng: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

// ---------- land dots ----------

function LandDots() {
  const { positions, colors } = useMemo(() => {
    const n = LAND_POINTS.length / 2;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const a = new THREE.Color("#8b5cf6");
    const b = new THREE.Color("#22d3ee");
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const lat = LAND_POINTS[i * 2] / 10;
      const lng = LAND_POINTS[i * 2 + 1] / 10;
      latLngToVec(lat, lng, R * 1.002).toArray(positions, i * 3);
      c.lerpColors(a, b, (lat + 60) / 150).toArray(colors, i * 3);
    }
    return { positions, colors };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} vertexColors transparent opacity={0.95} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// ---------- atmosphere (fresnel glow) ----------

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
    void main() {
      float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      gl_FragColor = vec4(uColor, 1.0) * intensity;
    }`,
};

function Atmosphere() {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color("#7c3aed") } }), []);
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[R, 64, 64]} />
      <shaderMaterial
        args={[{ ...atmosphereShader, uniforms }]}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------- arcs ----------

function Arc({ from, to, color, delay }: { from: THREE.Vector3; to: THREE.Vector3; color: string; delay: number }) {
  const { geometry, curve, total } = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const lift = 1 + from.distanceTo(to) * 0.32;
    mid.normalize().multiplyScalar(R * lift);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geometry = new THREE.TubeGeometry(curve, 96, 0.012, 8, false);
    return { geometry, curve, total: geometry.index!.count };
  }, [from, to]);

  const comet = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);

  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - start.current - delay;
    const grow = THREE.MathUtils.clamp(t / 1.4, 0, 1);
    geometry.setDrawRange(0, Math.floor(total * grow));
    if (comet.current) {
      const p = (t * 0.35) % 1;
      comet.current.visible = grow >= 1;
      comet.current.position.copy(curve.getPoint(p < 0 ? 0 : p));
    }
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh ref={comet}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
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
        <circleGeometry args={[0.04, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.05, 0.065, 32]} />
        <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------- orbiting tokens (scholarship "coins" + graduation cap) ----------

function Coin({ radius, speed, offset, y, color }: { radius: number; speed: number; offset: number; y: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + offset;
    ref.current?.position.set(Math.cos(t) * radius, y + Math.sin(t * 2) * 0.08, Math.sin(t) * radius);
    if (ref.current) ref.current.rotation.y = t * 3;
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.025, 32]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} emissive={color} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function GradCap() {
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
      <group position={[1.9, 1.5, 0.4]} rotation={[0.35, -0.6, 0.15]} scale={0.55}>
        <mesh>
          <boxGeometry args={[1, 0.06, 1]} />
          <meshStandardMaterial color="#1e1b4b" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.3, 0.34, 0.32, 32]} />
          <meshStandardMaterial color="#312e81" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0.32, -0.15, 0.32]}>
          <cylinderGeometry args={[0.015, 0.015, 0.36, 8]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.32, -0.36, 0.32]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

// ---------- scene ----------

const ARC_COLORS = ["#22d3ee", "#a3e635", "#f472b6", "#facc15", "#60a5fa", "#fb923c", "#c084fc"];

function Globe({ home, targets, interactive }: { home?: string; targets: string[]; interactive: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const homeC = home ? COUNTRY_BY_CODE[home] : undefined;
  const homeV = useMemo(() => (homeC ? latLngToVec(homeC.lat, homeC.lng) : null), [homeC]);
  const targetVs = useMemo(
    () =>
      targets
        .map((c) => COUNTRY_BY_CODE[c])
        .filter(Boolean)
        .filter((c) => c.code !== home)
        .map((c) => ({ code: c.code, v: latLngToVec(c.lat, c.lng) })),
    [targets, home],
  );

  // Face the home country initially, then drift and follow the pointer.
  const baseY = useMemo(() => (homeC ? -((homeC.lng + 90) * Math.PI) / 180 : 0), [homeC]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const targetX = 0.35 + (interactive ? pointer.y * 0.25 : 0);
    const drift = interactive ? pointer.x * 0.6 : 0;
    // Gentle back-and-forth sway around home so arcs stay in view.
    g.userData.t = (g.userData.t ?? 0) + dt;
    const sway = Math.sin(g.userData.t * 0.15) * 0.45;
    const k = 1 - Math.pow(0.04, dt); // frame-rate independent easing
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, baseY + drift + sway, k);
  });

  return (
    <group ref={group} rotation={[0.35, baseY - 0.5, 0]}>
      <mesh>
        <sphereGeometry args={[R * 0.995, 64, 64]} />
        <meshStandardMaterial color="#0b0b25" roughness={0.9} metalness={0.1} />
      </mesh>
      <LandDots />
      <Atmosphere />
      {homeV && <Marker pos={homeV} color="#facc15" pulse />}
      {targetVs.map((t, i) => (
        <group key={t.code}>
          <Marker pos={t.v} color={ARC_COLORS[i % ARC_COLORS.length]} />
          {homeV && <Arc from={homeV} to={t.v} color={ARC_COLORS[i % ARC_COLORS.length]} delay={i * 0.25} />}
        </group>
      ))}
    </group>
  );
}

/** Calls onReady once, after the first frame has rendered. */
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
  home = "IN",
  targets = ["US", "GB", "CA", "DE", "AU"],
  interactive = true,
  decorations = true,
  onReady,
}: {
  home?: string;
  targets?: string[];
  interactive?: boolean;
  decorations?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 5.4], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <FirstFrame onReady={onReady} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} color="#c4b5fd" />
      <pointLight position={[-4, -2, -3]} intensity={30} color="#22d3ee" />
      <Stars radius={60} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
      <Globe home={home} targets={targets} interactive={interactive} />
      {decorations && (
        <>
          <Coin radius={2.45} speed={0.35} offset={0} y={0.5} color="#facc15" />
          <Coin radius={2.3} speed={0.28} offset={2.1} y={-0.7} color="#fbbf24" />
          <Coin radius={2.6} speed={0.22} offset={4.2} y={0.1} color="#fde047" />
          <GradCap />
          <Sparkles count={60} scale={[7, 5, 4]} size={2.2} speed={0.35} color="#c4b5fd" />
        </>
      )}
    </Canvas>
  );
}
