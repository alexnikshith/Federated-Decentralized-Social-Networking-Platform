import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// --- Procedural Planet Surface Shader ---
export const PlanetSurfaceMaterial = shaderMaterial(
    {
        time: 0,
        colorOcean: new THREE.Color("#0A1128"),     // Deep Ocean Blue
        colorLand: new THREE.Color("#1A2D42"),      // Dark Continental Blue/Green
        colorCityLights: new THREE.Color("#FFBA08"),// Gold city lights
        lightDir: new THREE.Vector3(1, 0.5, 0.5).normalize(), // Directional Star
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment Shader
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    uniform vec3 colorOcean;
    uniform vec3 colorLand;
    uniform vec3 colorCityLights;
    uniform vec3 lightDir;

    // Simplex Noise and FBM
    float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
        float f = 0.0;
        float w = 0.5;
        for (int i = 0; i < 6; i++) {
            f += w * noise(p);
            p *= 2.0;
            w *= 0.5;
        }
        return f;
    }

    void main() {
        // Map UVs to spherical coordinates for seamless noise
        float theta = vUv.x * 3.14159 * 2.0;
        float phi = vUv.y * 3.14159;
        vec3 sphereCoord = vec3(sin(phi)*cos(theta), cos(phi), sin(phi)*sin(theta));
        
        // Generate continents slowly rotating
        float t = time * 0.02;
        float elevation = fbm(sphereCoord.xy * 3.0 + vec2(t, 0.0));
        elevation += fbm(sphereCoord.yz * 6.0) * 0.5;
        
        // Define coastlines
        float landMask = smoothstep(0.55, 0.65, elevation);
        
        // Base color mixing
        vec3 finalColor = mix(colorOcean, colorLand, landMask);
        
        // Lighting Calculations (Lambertian + Specular for oceans)
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, lightDir), 0.0);
        
        // Add a terminator line gradient (soft day/night transition)
        float terminator = smoothstep(-0.2, 0.2, dot(normal, lightDir));
        
        // Specular reflection on water
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        float specularHighlight = spec * (1.0 - landMask) * diff; // Only oceans reflect
        
        // City lights on the night side of landmasses
        float nightMask = 1.0 - smoothstep(-0.1, 0.1, dot(normal, lightDir));
        float cities = smoothstep(0.7, 1.0, fbm(sphereCoord.xz * 15.0)); // fine noise
        vec3 cityColor = colorCityLights * cities * landMask * nightMask * 2.0;

        // Apply lighting
        finalColor = finalColor * diff + vec3(specularHighlight) + cityColor;
        
        // Add ambient space light to the dark side so it's not pitch black
        finalColor += mix(colorOcean, colorLand, landMask) * 0.05 * nightMask;

        gl_FragColor = vec4(finalColor, 1.0);
    }
    `
);

// --- Dynamic Cloud Layer Shader ---
export const PlanetCloudsMaterial = shaderMaterial(
    {
        time: 0,
        lightDir: new THREE.Vector3(1, 0.5, 0.5).normalize(),
        opacity: 1.0,
    },
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float time;
    uniform vec3 lightDir;
    uniform float opacity;

    // Include the same noise functions
    float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
        float f = 0.0; float w = 0.5;
        for (int i = 0; i < 5; i++) { f += w * noise(p); p *= 2.0; w *= 0.5; }
        return f;
    }

    void main() {
        float theta = vUv.x * 6.283;
        float phi = vUv.y * 3.1415;
        vec3 sphereCoord = vec3(sin(phi)*cos(theta), cos(phi), sin(phi)*sin(theta));
        
        // Clouds move faster than land
        float t = time * 0.05;
        float cloudNoise = fbm(sphereCoord.xy * 4.0 + vec2(t * 1.5, t * 0.2));
        cloudNoise += fbm(sphereCoord.yz * 8.0 - vec2(0.0, t)) * 0.5;
        
        // Threshold clouds to create distinct formations
        float cloudMask = smoothstep(0.4, 0.8, cloudNoise);
        
        // Lighting on clouds
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, lightDir), 0.0);
        float terminator = smoothstep(-0.1, 0.2, dot(normal, lightDir));
        
        // Clouds are white on day side, dark blue on night side
        vec3 cloudColor = mix(vec3(0.05, 0.1, 0.2), vec3(1.0), terminator);
        
        gl_FragColor = vec4(cloudColor, cloudMask * opacity * terminator); // Fade clouds in dark to invisible
    }
    `
);

// --- Atmospheric Limb Glow (Rayleigh approximation) ---
export const AtmosphereGlowMaterial = shaderMaterial(
    {
        colorAtmosphere: new THREE.Color("#4CC9F0"),
        lightDir: new THREE.Vector3(1, 0.5, 0.5).normalize(),
        opacity: 0.6,
    },
    `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
    `,
    `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform vec3 colorAtmosphere;
    uniform vec3 lightDir;
    uniform float opacity;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        
        // Fresnel effect for rim lighting at the edges of the sphere
        float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
        fresnel = pow(fresnel, 3.0); // Sharpen the edge
        
        // Day/night scattering
        float diff = max(dot(normal, lightDir), 0.0);
        float terminator = smoothstep(-0.2, 0.5, dot(normal, lightDir));
        
        vec3 glowColor = colorAtmosphere * fresnel * terminator;
        
        gl_FragColor = vec4(glowColor, fresnel * terminator * opacity);
    }
    `
);
