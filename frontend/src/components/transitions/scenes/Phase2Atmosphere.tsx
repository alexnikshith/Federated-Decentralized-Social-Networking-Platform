import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAuthStore } from '../../../../epics/identity/store/authStore';

interface Phase2AtmosphereProps {
    timeScale: number;
    onComplete: () => void;
}

export const Phase2Atmosphere: React.FC<Phase2AtmosphereProps> = ({ timeScale, onComplete }) => {
    const { camera, scene } = useThree();
    const timeRef = useRef(0);
    const { setTransitioning, isTransitioning } = useAuthStore();

    // We maintain a reference to the fog to animate its density
    const fogRef = useRef<THREE.FogExp2 | null>(null);

    // Add Fog to scene on mount, remove on unmount
    useEffect(() => {
        const initialFog = new THREE.FogExp2('#110022', 0); // Start with 0 density (invisible)
        scene.fog = initialFog;
        fogRef.current = initialFog;

        // Initial Camera position (Emerging from the wormhole)
        camera.position.set(0, 0, 500);
        camera.lookAt(0, 0, 0); // Looking at the planet

        return () => {
            scene.fog = null;
        };
    }, [camera, scene]);

    // Create background stars
    const [starPositions, starColors] = useMemo(() => {
        const count = 3000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const colorPalette = [
            new THREE.Color('#ffffff'),
            new THREE.Color('#FFBA08'),
            new THREE.Color('#3A0CA3'),
            new THREE.Color('#4CC9F0')
        ];

        for (let i = 0; i < count; i++) {
            // Distribute stars spherically
            const r = 500 + Math.random() * 500;
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        return [positions, colors];
    }, []);

    useFrame((state, delta) => {
        const effectiveDelta = delta * timeScale;
        timeRef.current += effectiveDelta;

        // Total duration of Phase 2 is ~3 seconds at 1x scale
        const duration = 3.0;
        const progress = Math.min(timeRef.current / duration, 1.0);

        // Easing for camera (decelerate towards planet)
        // easeOutExpo: fast approach, extremely slow end
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        // Move camera from Z=500 down to Z=150 (close to planet surface which is radius 100)
        camera.position.z = 500 - (350 * easeProgress);

        // As we get closer (progress > 0.4), rapidly increase fog density to simulate entering atmosphere
        if (fogRef.current && progress > 0.4) {
            // Map 0.4 -> 1.0 progress to density 0.0 -> 0.012
            const fogProgress = Math.min((progress - 0.4) / 0.6, 1.0);
            fogRef.current.density = fogProgress * 0.012;

            // Pulse the fog color dynamically as we enter (glowing mist)
            const pulse = 0.5 + Math.sin(timeRef.current * 4) * 0.5;
            fogRef.current.color.setHex(0x110022).lerp(new THREE.Color('#3A0CA3'), fogProgress * pulse * 0.5);
        }

        // Complete the transition
        if (progress >= 1.0 && isTransitioning) {
            // Delay the actual unmounting by 500ms so the CSS fadeout of the canvas overlay starts overlapping
            setTimeout(() => {
                onComplete();
            }, 500);
        }
    });

    return (
        <group>
            {/* The Background Stars */}
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={starPositions.length / 3} array={starPositions} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={starColors.length / 3} array={starColors} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={1.5} vertexColors transparent opacity={0.8} />
            </points>

            {/* The Community Planet */}
            <mesh position={[0, -20, 0]}>
                <sphereGeometry args={[100, 64, 64]} />
                <meshStandardMaterial
                    color="#140628"
                    emissive="#3A0CA3"
                    emissiveIntensity={0.2}
                    roughness={0.8}
                    metalness={0.2}
                    wireframe={false}
                />
            </mesh>

            {/* Inner Atmospheric Glow */}
            <mesh position={[0, -20, 0]}>
                <sphereGeometry args={[105, 32, 32]} />
                <meshBasicMaterial
                    color="#4CC9F0"
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* 3D Dashboard Wireframe overlay (Appears as fog thickens) */}
            {/* This sells the visual bridging from 3D to our DOM UI */}
            <DashboardHologram timeRef={timeRef} />
        </group>
    );
};

// Represents the "Structural Outlines" of the community dashboard forming
const DashboardHologram: React.FC<{ timeRef: React.MutableRefObject<number> }> = ({ timeRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.LineBasicMaterial>(null);

    useFrame(() => {
        if (!groupRef.current || !materialRef.current) return;

        // Only start fading in the hologram after 1.5 seconds into Phase 2
        if (timeRef.current > 1.5) {
            // Map 1.5s -> 3.0s to opacity 0.0 -> 0.4
            const progress = Math.min((timeRef.current - 1.5) / 1.5, 1.0);
            materialRef.current.opacity = progress * 0.4;

            // Slowly scale up to match camera zoom into surface
            groupRef.current.scale.setScalar(1 + progress * 0.5);
        } else {
            materialRef.current.opacity = 0;
        }
    });

    // Very simple abstract representation of our UI layout in 3D wireframe
    return (
        <group ref={groupRef} position={[0, 10, 80]}>
            {/* Sidebar box */}
            <lineSegments position={[-35, 0, 0]}>
                <edgesGeometry args={[new THREE.PlaneGeometry(20, 60)]} />
                <lineBasicMaterial ref={materialRef} color="#4CC9F0" transparent opacity={0} />
            </lineSegments>

            {/* Main feed cards */}
            {[20, 0, -20].map((yOffset, i) => (
                <lineSegments key={`card-${i}`} position={[10, yOffset, 0]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(40, 15, 2)]} />
                    <lineBasicMaterial color="#4CC9F0" transparent opacity={0} /> {/* Shares opacity via context/ref in useFrame hack above doesn't work well physically for arrays, let's fix below */}
                </lineSegments>
            ))}

            {/* Top nav */}
            <lineSegments position={[10, 40, 0]}>
                <edgesGeometry args={[new THREE.PlaneGeometry(60, 5)]} />
                <lineBasicMaterial color="#FFBA08" transparent opacity={0} />
            </lineSegments>
        </group>
    );
};
