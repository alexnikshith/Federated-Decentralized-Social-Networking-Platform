import React, { useRef, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { WormholeMaterial } from './WormholeWarpParams';

// Ensure the custom material is registered in the R3F schema before we render it
extend({ WormholeMaterial });

// The file is side-effect imported inside CinematicLoginTransition.

interface Phase1WormholeProps {
    timeScale: number;
    onComplete: () => void;
}

export const Phase1Wormhole: React.FC<Phase1WormholeProps> = ({ timeScale, onComplete }) => {
    const { camera } = useThree();
    const materialRef = useRef<any>(null); // Type is augmented globally
    const tubeRef = useRef<THREE.Mesh>(null);

    // We track the generic "time" of the animation (accelerated by timeScale)
    const timeRef = useRef(0);
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
        timeRef.current += effectiveDelta;

        // Update shader uniforms
        if (materialRef.current) {
            materialRef.current.time = timeRef.current;
        }

        // Camera movement: 
        // We want Phase 1 to last about 4.5 seconds at 1x speed.
        // The total distance we travel is roughly T=0 to T=0.9 along the curve.
        const totalPhaseDuration = 4.5;

        // Let's use progress 0.0 -> 1.0 based on elapsed time
        let progress = Math.min(timeRef.current / totalPhaseDuration, 1.0);

        // Apply easing (fast acceleration, smooth deceleration)
        // easeOutQuart or similar. Let's use a simple ease function
        const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        // Move camera along the spline curve up to 90%
        // The last 10% is where Phase 2 (Atmosphere) takes over
        const pathPosition = tubePath.getPointAt(easedProgress * 0.95);
        const lookAtPosition = tubePath.getPointAt(Math.min((easedProgress * 0.95) + 0.05, 1.0));

        camera.position.copy(pathPosition);
        camera.lookAt(lookAtPosition);

        // Rotating the camera slightly for a "corkscrew" effect during warp
        camera.rotation.z += timeRef.current * 0.5;

        // Transition logic
        if (progress >= 1.0) {
            onComplete();
        }
    });

    return (
        <group>
            {/* The wormhole tunnel */}
            <mesh ref={tubeRef} position={[0, 0, 0]}>
                <tubeGeometry args={[tubePath, 200, 3, 32, false]} />
                <wormholeMaterial
                    ref={materialRef}
                    side={THREE.BackSide} /* We are inside the tube */
                    transparent={true}
                    colorStart={new THREE.Color("#FFBA08")} /* Gold / Energy */
                    colorEnd={new THREE.Color("#240046")} /* Deep Purple / Void */
                    speed={2.0}
                    distortion={0.3}
                />
            </mesh>

            {/* Particle stars zipping past */}
            <StarsParticles timeScale={timeScale} path={tubePath} />
        </group>
    );
};

// Add some fast-moving particles to sell the speed
const StarsParticles: React.FC<{ timeScale: number, path: THREE.Curve<THREE.Vector3> }> = ({ timeScale, path }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const count = 2000;

    // Generate initial particle positions along the path
    const [positions, phases] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const ph = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            // T along the path (0 to 1)
            const t = Math.random();
            const pointOnPath = path.getPointAt(t);

            // Offset from the center of the tube
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.0 + Math.random() * 1.5; // Stay inside radius 3

            pos[i * 3] = pointOnPath.x + Math.cos(angle) * radius;
            pos[i * 3 + 1] = pointOnPath.y + Math.sin(angle) * radius;
            pos[i * 3 + 2] = pointOnPath.z;

            ph[i] = t; // Store their normalized progress
        }
        return [pos, ph];
    }, [count, path]);

    useFrame((_, delta) => {
        if (!pointsRef.current) return;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

        // Move particles towards camera (decrease T)
        for (let i = 0; i < count; i++) {
            phases[i] -= delta * timeScale * 0.2; // Speed of particles
            if (phases[i] < 0) phases[i] += 1.0; // Loop them

            const t = phases[i];
            const newPoint = path.getPointAt(t);

            // We need to keep their radial offset intact. For simplicity, we just snap them to path Z and keep old X/Y roughly.
            // A more exact way involves path frenet frames, but this is fast and looks chaotic enough for a warp tunnel.
            positions[i * 3 + 2] = newPoint.z;
            positions[i * 3] = newPoint.x + (Math.sin(i + t * 10) * 2.5);
            positions[i * 3 + 1] = newPoint.y + (Math.cos(i + t * 10) * 2.5);
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
            </bufferGeometry>
            <pointsMaterial
                size={0.1}
                color="#ffffff"
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
                sizeAttenuation={true}
            />
        </points>
    );
};
