import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

export const WormholeMaterial = shaderMaterial(
    {
        time: 0,
        color1: new THREE.Color("#020111"), // Deep Space Dark
        color2: new THREE.Color("#3a0ca3"), // Nebula Purple
        color3: new THREE.Color("#f72585"), // Neon Pink
        color4: new THREE.Color("#4cc9f0"), // Bright Cyan
        speed: 1.0,
        distortion: 0.5,
        opacity: 1.0,
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform float speed;
    uniform float distortion;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vUv = uv;
        vPosition = position;
        
        vec3 pos = position;
        
        // Very gentle displacement to maintain the clear tunnel/funnel shape
        float noiseFreq = 0.1;
        float noiseAmp = distortion * 0.5;
        vec3 noisePos = vec3(pos.x * noiseFreq, pos.y * noiseFreq, pos.z * noiseFreq + time * speed * 0.5);
        
        // Gentle organic wavering
        pos.x += snoise(noisePos) * noiseAmp;
        pos.y += snoise(noisePos + vec3(100.0)) * noiseAmp;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
    `,
    // Fragment Shader
    `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    uniform vec3 color4;
    uniform float speed;
    uniform float opacity;

    // Fractional Brownian Motion for nebula clouds
    float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
    
    // Hash for star placement
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

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
        for (int i = 0; i < 5; i++) {
            f += w * noise(p);
            p *= 2.0;
            w *= 0.5;
        }
        return f;
    }

    void main() {
        vec2 st = vUv;
        float t = time * speed;
        
        // We scale st.x so the noise is mapped proportionally to the long tunnel
        // The tunnel is very long compared to its circumference.
        vec2 uvScaled = vec2(st.x * 20.0 - t * 1.5, st.y * 3.0);
        
        // Generate several layers of fractal noise for the nebula clouds
        float n1 = fbm(uvScaled * 1.0 + vec2(t * 0.2, 0.0));
        float n2 = fbm(uvScaled * 2.0 - vec2(t * 0.1, t * 0.1));
        float n3 = fbm(uvScaled * 4.0 + vec2(0.0, t * 0.3));
        
        // Start with Deep Space background
        vec3 finalColor = color1;
        
        // Add Purple nebula clouds
        float mask2 = smoothstep(0.3, 0.8, n1);
        finalColor = mix(finalColor, color2, mask2 * 0.8);
        
        // Add Cyan highlights
        float mask4 = smoothstep(0.4, 0.9, n2);
        finalColor = mix(finalColor, color4, mask4 * 0.7);
        
        // Add Pink fiery edges
        float mask3 = smoothstep(0.6, 1.0, n3);
        finalColor = mix(finalColor, color3, mask3 * 0.9);
        
        // --------- STARS INSIDE THE TUNNEL WALLS ---------
        // Map UV into high frequency grid for stars
        vec2 starUV = vec2(st.x * 300.0, st.y * 100.0);
        vec2 starID = floor(starUV);
        vec2 starPos = fract(starUV);
        
        // Skew the grid slightly so it doesn't look perfectly aligned
        starID += floor(starPos * 2.0);
        float starRand = random(starID);
        
        if (starRand > 0.98) {
            float starDist = length(starPos - vec2(0.5));
            // Add a twinkling effect
            float twinkle = 0.5 + 0.5 * sin(t * 10.0 + starRand * 100.0);
            float starGlow = smoothstep(0.3, 0.05, starDist) * twinkle;
            finalColor += vec3(1.0) * starGlow; // White stars
        }

        // --------- THE EXIT GLOW ---------
        // A bright white/blue light at the end of the tunnel
        // st.x goes from 0 to 1 along the tube. 1 is the exit.
        float endGlow = smoothstep(0.75, 1.0, st.x);
        
        // Mix towards pure white/cyan at the end
        vec3 exitColor = mix(vec3(0.5, 0.8, 1.0), vec3(1.0), endGlow * endGlow);
        finalColor = mix(finalColor, exitColor, endGlow * 1.5);
        
        // Fade out at the very beginning to blend with the camera
        float alpha = smoothstep(0.0, 0.05, st.x) * opacity;
        
        // The tunnel walls become more opaque further down, and fully solid at the glowing end
        alpha *= (0.6 + mask2 * 0.4 + mask4 * 0.2 + endGlow);
        alpha = min(alpha, 1.0);

        gl_FragColor = vec4(finalColor, alpha);
    }
    `
);

// Pure White Energy Core Shader
export const WormholeCoreMaterial = shaderMaterial(
    {
        time: 0,
        expansion: 0.0, // Controls the white-out scale
        opacity: 1.0,
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment Shader
    `
    varying vec2 vUv;
    uniform float time;
    uniform float expansion;
    uniform float opacity;
    
    void main() {
        vec2 st = vUv - 0.5;
        float r = length(st);
        
        // Base core size
        float coreRadius = mix(0.15, 2.0, expansion); // Expands heavily when transition happens
        
        // Pure white core
        vec3 color = vec3(1.0);
        
        // Chromatic aberration at the edges
        float edge = smoothstep(coreRadius - 0.05, coreRadius, r);
        
        // As edge gets closer to 1, we split colors slightly
        // Red fringe
        float redFringe = smoothstep(coreRadius - 0.08, coreRadius + 0.02, r) * 0.5;
        // Blue fringe
        float blueFringe = smoothstep(coreRadius - 0.02, coreRadius + 0.08, r) * 0.5;
        
        // Mix aberration into the white
        if (expansion < 0.5) {
            color = mix(color, vec3(1.0, 0.5, 0.5), redFringe);
            color = mix(color, vec3(0.5, 0.5, 1.0), blueFringe);
        }
        
        // Soft bloom falloff
        float alpha = 1.0 - smoothstep(coreRadius - 0.1, coreRadius + 0.2 + (expansion * 2.0), r);
        
        // If expansion is high enough, wash out everything to pure white
        if (expansion > 0.8) {
            color = vec3(1.0);
            alpha = 1.0;
        }

        gl_FragColor = vec4(color, alpha * opacity);
    }
    `
);

// Register the custom materials so we can use them declaratively in R3F
extend({ WormholeMaterial, WormholeCoreMaterial });

declare module '@react-three/fiber' {
    interface ThreeElements {
        wormholeMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
            ref?: React.Ref<any>;
            time?: number;
            color1?: THREE.Color;
            color2?: THREE.Color;
            color3?: THREE.Color;
            color4?: THREE.Color;
            speed?: number;
            distortion?: number;
            opacity?: number;
        };
        wormholeCoreMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
            ref?: React.Ref<any>;
            time?: number;
            expansion?: number;
            opacity?: number;
        };
    }
}
