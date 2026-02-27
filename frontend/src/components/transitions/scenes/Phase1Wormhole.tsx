import React, { useRef, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAuthStore, TransitionState } from '../../../../epics/identity/store/authStore';
import { WormholeMaterial, WormholeCoreMaterial } from './WormholeWarpParams';

// Ensure the custom material is registered in the R3F schema before we render it
extend({ WormholeMaterial, WormholeCoreMaterial });

// The file is side-effect imported inside CinematicLoginTransition.

interface Phase1WormholeProps {
    timeScale: number;
    isPreWarp?: boolean;
    onComplete: () => void;
}

export const Phase1Wormhole: React.FC<Phase1WormholeProps> = ({ timeScale, isPreWarp = false, onComplete }) => {
    const { camera, clock } = useThree();
    const materialRef = useRef<any>(null); // Type is augmented globally
    const tubeRef = useRef<THREE.Mesh>(null);
    const coreRef = useRef<any>(null);
    const hasCompletedRef = useRef(false);

    // We track the generic "time" of the animation (accelerated by timeScale)
    const timeRef = useRef(0); // Progress of the camera
    const shaderTimeRef = useRef(0); // Dedicated time passed to the shader to keep it moving when paused
    const zPosRef = useRef(0);

    // Create a curving path for the wormhole
    const tubePath = useMemo(() => {
        // A simple spline curve
        return new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(2, 1, -50),
            new THREE.Vector3(-2, -3, -100),
            new THREE.Vector3(5, 2, -150),
            new THREE.Vector3(0, 0, -200), // Exit point
        ]);
    }, []);

    useFrame((state, delta) => {
        // Advance time
        const effectiveDelta = delta * timeScale;

        // Shader time tracks forever to keep particles and colors swirling
        shaderTimeRef.current += effectiveDelta;

        // Camera time only advances when warp actually starts
        if (!isPreWarp) {
            timeRef.current += effectiveDelta;
        }

        // Update shader uniforms
        if (materialRef.current) {
            materialRef.current.time = shaderTimeRef.current;
        }

        // Camera movement: 
        // We want Phase 1 to last about 4.5 seconds at 1x speed.
        // The total distance we travel is roughly T=0 to T=0.9 along the curve.
        const totalPhaseDuration = 4.5;
        const whiteoutHoldDuration = 0.2; // 200ms hold at pure white

        // Let's use progress 0.0 -> 1.0 based on elapsed time (capped at 1.0)
        let progress = Math.min(timeRef.current / totalPhaseDuration, 1.0);

        // Custom Cinematic Easing Curve (3-stage physics)
        // 0-40%: Gradual acceleration out of idle
        // 40-85%: Sustained high velocity
        // 85-100%: Violent acceleration into the core
        let easedProgress = progress;
        if (progress < 0.4) {
            // Cubic ease in
            const p = progress / 0.4;
            easedProgress = 0.4 * (p * p * p);
        } else if (progress < 0.85) {
            // Linear velocity
            easedProgress = 0.4 + (progress - 0.4);
        } else {
            // Exponential/cubic acceleration into the singularity
            const p = (progress - 0.85) / 0.15;
            easedProgress = 0.85 + 0.15 * (p * p * p);
        }

        // Move camera along the spline curve up to 90%
        // The last 10% is where Phase 2 (Atmosphere) takes over
        const pathPosition = tubePath.getPointAt(easedProgress * 0.95);
        const lookAtPosition = tubePath.getPointAt(Math.min((easedProgress * 0.95) + 0.05, 1.0));

        camera.position.copy(pathPosition);
        camera.lookAt(lookAtPosition);

        // Rotating the camera slightly for a "corkscrew" effect during warp
        camera.rotation.z += timeRef.current * 0.5;

        // Transition logic: White-out expansion at the end
        if (coreRef.current) {
            // Start expanding rapidly when progress > 0.92
            const expansionStart = 0.92;
            let currentExpansion = 0.0;
            if (progress > expansionStart) {
                currentExpansion = (progress - expansionStart) / (1.0 - expansionStart);
                // Ease in out for the explosion
                currentExpansion = currentExpansion * currentExpansion * (3.0 - 2.0 * currentExpansion);

                // Trigger FSM State change to WHITE_FLASH
                const authState = useAuthStore.getState();
                if (authState.transitionState === TransitionState.WORMHOLE_TRAVEL && currentExpansion > 0.5 && !hasCompletedRef.current) {
                    authState.setTransitionState(TransitionState.WHITE_FLASH);
                }
            }
            coreRef.current.expansion = currentExpansion;
        }

        // Wait an extra 200ms while screen is completely white before moving to Phase 2
        if (progress >= 1.0) {
            if (timeRef.current > totalPhaseDuration + whiteoutHoldDuration) {
                if (!hasCompletedRef.current) {
                    hasCompletedRef.current = true;
                    // Move to PLANET_APPROACH, handled by CinematicLoginTransition overlay
                    onComplete();
                }
            }
        }
    });

    return (
        <group>
            {/* The wormhole tunnel */}
            <mesh ref={tubeRef} position={[0, 0, 0]}>
                <tubeGeometry args={[tubePath, 200, 15, 64, false]} />
                <wormholeMaterial
                    ref={materialRef}
                    side={THREE.BackSide} /* We are inside the tube */
                    transparent={true}
                    color1={new THREE.Color("#020111")}
                    color2={new THREE.Color("#3a0ca3")}
                    color3={new THREE.Color("#f72585")}
                    color4={new THREE.Color("#4cc9f0")}
                    speed={1.5}
                    distortion={0.3}
                    opacity={isPreWarp ? 0 : Math.min(timeRef.current / 0.5, 1.0)} // Fade tunnel in rapidly when warp starts
                />
            </mesh>

            {/* The White Energy Core at the exit */}
            <WormholeCore exitPoint={tubePath.getPointAt(1.0)} coreRef={coreRef} />

            {/* Particle stars zipping past, now styled as ionized debris */}
            <SpiralingDebris timeScale={timeScale} path={tubePath} />
        </group>
    );
};

// Add some fast-moving, spiraling particles to represent broken down orbital debris and ionized gas
const SpiralingDebris: React.FC<{ timeScale: number, path: THREE.Curve<THREE.Vector3> }> = ({ timeScale, path }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const count = 3000;

    // Create a smooth circular gradient texture for particles so they aren't default squares
    const particleTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        if (context) {
            const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 64, 64);
        }
        return new THREE.CanvasTexture(canvas);
    }, []);

    // Generate initial particle positions along the path
    const [positions, phases, colors] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const ph = new Float32Array(count);
        const col = new Float32Array(count * 3);

        const baseColor = new THREE.Color("#4cc9f0");
        const accentColor = new THREE.Color("#f72585");

        for (let i = 0; i < count; i++) {
            // T along the path (0 to 1)
            const t = Math.random();
            const pointOnPath = path.getPointAt(t);

            // Debris is spiraling in a wider radius inside the enlarged tube
            const angle = Math.random() * Math.PI * 2;
            const radius = 2.0 + Math.random() * 10.0;

            pos[i * 3] = pointOnPath.x + Math.cos(angle) * radius;
            pos[i * 3 + 1] = pointOnPath.y + Math.sin(angle) * radius;
            pos[i * 3 + 2] = pointOnPath.z;

            ph[i] = t; // Store their normalized progress

            // Mix colors, leaning towards bright white
            const mixedColor = baseColor.clone().lerp(accentColor, Math.random());
            if (Math.random() > 0.6) {
                mixedColor.setHex(0xFFFFFF); // Most debris is bright white
            }
            col[i * 3] = mixedColor.r;
            col[i * 3 + 1] = mixedColor.g;
            col[i * 3 + 2] = mixedColor.b;
        }
        return [pos, ph, col];
    }, [count, path]);

    useFrame((_, delta) => {
        if (!pointsRef.current) return;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

        // Move particles towards camera (decrease T)
        for (let i = 0; i < count; i++) {
            phases[i] -= delta * timeScale * 0.15; // Speed of particles
            if (phases[i] < 0) phases[i] += 1.0; // Loop them

            const t = phases[i];
            const newPoint = path.getPointAt(t);

            // Add intense rotation to simulate gravitational spiraling
            const spiralAngle = i + t * 20.0;
            const radius = 2.0 + (i % 8.0); // Widened to match the tube radius

            positions[i * 3 + 2] = newPoint.z;
            positions[i * 3] = newPoint.x + Math.sin(spiralAngle) * radius;
            positions[i * 3 + 1] = newPoint.y + Math.cos(spiralAngle) * radius;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.6}
                vertexColors={true}
                transparent={true}
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                sizeAttenuation={true}
                depthWrite={false}
                map={particleTexture}
            />
        </points>
    );
};

// The intense white energy core that causes the white-out flash transition
const WormholeCore: React.FC<{ exitPoint: THREE.Vector3, coreRef: React.MutableRefObject<any> }> = ({ exitPoint, coreRef }) => {
    return (
        <mesh position={[exitPoint.x, exitPoint.y, exitPoint.z + 10]}>
            <planeGeometry args={[100, 100]} />
            <wormholeCoreMaterial
                ref={coreRef}
                transparent={true}
                depthWrite={false}
                opacity={1.0}
                expansion={0.0} // Driven by useFrame in parent
            />
        </mesh>
    );
};
