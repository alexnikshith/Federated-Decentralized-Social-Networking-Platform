import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useAuthStore, TransitionState } from '../../../../epics/identity/store/authStore';
import { useLoader } from '@react-three/fiber';
import { PlanetSurfaceMaterial, PlanetCloudsMaterial, AtmosphereGlowMaterial } from './PlanetMaterials';

extend({ PlanetSurfaceMaterial, PlanetCloudsMaterial, AtmosphereGlowMaterial });

declare module '@react-three/fiber' {
    interface ThreeElements {
        planetSurfaceMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
            ref?: React.Ref<any>;
            time?: number;
            colorOcean?: THREE.Color;
            colorLand?: THREE.Color;
            colorCityLights?: THREE.Color;
            lightDir?: THREE.Vector3;
        };
        planetCloudsMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
            ref?: React.Ref<any>;
            time?: number;
            lightDir?: THREE.Vector3;
            opacity?: number;
        };
        atmosphereGlowMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
            ref?: React.Ref<any>;
            colorAtmosphere?: THREE.Color;
            lightDir?: THREE.Vector3;
            opacity?: number;
        };
    }
}

interface Phase2AtmosphereProps {
    timeScale: number;
    onComplete: () => void;
}

export const Phase2Atmosphere: React.FC<Phase2AtmosphereProps> = ({ timeScale, onComplete }) => {
    const { camera, scene } = useThree();
    const timeRef = useRef(0);
    const hasCompletedRef = useRef(false);
    const planetRef = useRef<THREE.Mesh>(null);
    const cloudsRef = useRef<THREE.Mesh>(null);

    const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
        '/textures/earth/color.jpg',
        '/textures/earth/normal.jpg',
        '/textures/earth/specular.jpg',
        '/textures/earth/clouds.png'
    ]);

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

        if (cloudsRef.current) {
            cloudsRef.current.rotation.y += effectiveDelta * 0.02; // Slow cloud rotation over the planet
        }
        if (planetRef.current) {
            planetRef.current.rotation.y += effectiveDelta * 0.01; // Continuous orbital drift 
        }

        // Total duration of Phase 2 is ~3.5 seconds at 1x scale
        const duration = 3.5;
        const progress = Math.min(timeRef.current / duration, 1.0);

        // Easing for camera (decelerate towards planet)
        // easeOutExpo: fast approach, extremely slow end
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        // Move camera from Z=500 down to Z=50 (piercing into the planet core/clouds)
        camera.position.z = 500 - (450 * easeProgress);

        // Fade out clouds when extremely close (simulate breaking through atmospheric layer)
        if (cloudsRef.current && progress > 0.8) {
            const clearProgress = (progress - 0.8) / 0.2; // 0.0 -> 1.0 during last 20%
            (cloudsRef.current.material as THREE.Material).opacity = 0.9 * (1 - clearProgress);
        }

        // As we get closer (progress > 0.4), rapidly increase fog density to simulate entering atmosphere
        if (fogRef.current && progress > 0.4) {
            // Map 0.4 -> 1.0 progress to density 0.0 -> 0.012
            const fogProgress = Math.min((progress - 0.4) / 0.6, 1.0);
            fogRef.current.density = fogProgress * 0.012;

            // Pulse the fog color dynamically as we enter (glowing mist)
            const pulse = 0.5 + Math.sin(timeRef.current * 4) * 0.5;
            fogRef.current.color.setHex(0x110022).lerp(new THREE.Color('#3A0CA3'), fogProgress * pulse * 0.5);

            // Advance FSM to Atmospheric Entry
            const authState = useAuthStore.getState();
            if (authState.transitionState === TransitionState.PLANET_APPROACH && fogProgress > 0.1) {
                authState.setTransitionState(TransitionState.ATMOSPHERIC_ENTRY);
            }
        }

        // Complete the transition
        const authState = useAuthStore.getState();
        if (progress >= 1.0 && authState.isTransitioning) {
            if (!hasCompletedRef.current) {
                hasCompletedRef.current = true;
                onComplete();
            }
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

            {/* The Community Planet Surface */}
            <mesh position={[0, -20, 0]} ref={planetRef}>
                <sphereGeometry args={[100, 128, 128]} />
                <meshStandardMaterial
                    map={colorMap}
                    normalMap={normalMap}
                    roughnessMap={specularMap}
                    roughness={1}
                    metalness={0.1}
                />
            </mesh>

            {/* Dynamic Cloud Layer */}
            <mesh position={[0, -20, 0]} ref={cloudsRef}>
                <sphereGeometry args={[101, 64, 64]} />
                <meshStandardMaterial
                    map={cloudsMap}
                    alphaMap={cloudsMap}
                    transparent={true}
                    opacity={0.9}
                    depthWrite={false}
                />
            </mesh>

            {/* Outer Atmospheric Glow / Rim Lighting */}
            <mesh position={[0, -20, 0]}>
                <sphereGeometry args={[106, 64, 64]} />
                <atmosphereGlowMaterial
                    colorAtmosphere={new THREE.Color("#4CC9F0")}
                    lightDir={new THREE.Vector3(1, 0.5, 0.5).normalize()}
                    transparent={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    opacity={1.0}
                    side={THREE.BackSide} /* Useful for rim lighting when entering */
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

        // Only start fading in the hologram after 2.0 seconds into Phase 2
        if (timeRef.current > 2.0) {
            // Map 2.0s -> 3.5s to opacity 0.0 -> 0.6
            const progress = Math.min((timeRef.current - 2.0) / 1.5, 1.0);
            materialRef.current.opacity = progress * 0.6;

            // Critical Event: Handoff sync
            const authState = useAuthStore.getState();
            if (authState.transitionState === TransitionState.ATMOSPHERIC_ENTRY && progress > 0.05) {
                authState.setTransitionState(TransitionState.DOM_HANDOFF);
            }

            // Slowly scale up to match camera zoom into surface
            groupRef.current.scale.setScalar(1 + progress * 0.5);

            groupRef.current.children.forEach(child => {
                if ((child as any).material && (child as any).material !== materialRef.current) {
                    (child as any).material.opacity = progress * 0.6;
                }
            });
        } else {
            materialRef.current.opacity = 0;
            groupRef.current.children.forEach(child => {
                if ((child as any).material && (child as any).material !== materialRef.current) {
                    (child as any).material.opacity = 0;
                }
            });
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
