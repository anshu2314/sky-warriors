/*!
 * Sky Warriors 2 — Authentic 3D Jet Airframe Generator
 * Generates custom, aerodynamic 3D procedural meshes for all roster jets:
 *  - falcon:  F-22/F-16 Air Superiority Fighter
 *  - viper:   Su-47 Berkut Forward-Swept Wing Interceptor (Canards + Forward Swept Wings)
 *  - phantom: Heavy Assault Compound Delta Wing (Armed with Heavy Pylon Missiles)
 *  - raptor:  Variable-Sweep Strike Fighter (Twin Giant Outward Tails + Wingtip Missiles)
 *  - nova:    Hypersonic Wave-Rider Mach 5+ (Chine Blended Body + Drooped Wingtips)
 *  - shadow:  Iconic B-2 Spirit Stealth Flying Wing (Saw-tooth W-trailing edge, S-ducts, Pure Flying Wing)
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['three'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('three'));
    } else {
        root.JetModels = factory(root.THREE);
    }
}(typeof self !== 'undefined' ? self : this, function (THREE) {
    'use strict';

    if (!THREE) {
        console.warn('JetModels: THREE is not loaded yet.');
        return {};
    }

    // Common extruded wing settings with crisp beveled edges
    var WING_SETTINGS = {
        depth: 0.08,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02
    };

    var THICK_WING_SETTINGS = {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04
    };

    // Color palettes & specs for each aircraft
    var SPECS = {
        falcon: {
            name: 'Falcon',
            bodyColor: 0x3d70cc,
            noseColor: 0x1a2d55,
            accentColor: 0x5a90ee,
            cockpitColor: 0x88ccff,
            cockpitEmissive: 0x0044aa,
            engineGlow: 0x00ffcc,
            scale: 1.0
        },
        viper: {
            name: 'Viper',
            bodyColor: 0x0d2826,
            noseColor: 0x00ffcc,
            accentColor: 0x00ccaa,
            cockpitColor: 0x00ffee,
            cockpitEmissive: 0x008877,
            engineGlow: 0x00ffaa,
            scale: 1.02
        },
        phantom: {
            name: 'Phantom',
            bodyColor: 0x221330,
            noseColor: 0x471d63,
            accentColor: 0xa855f7,
            cockpitColor: 0xd8b4fe,
            cockpitEmissive: 0x7e22ce,
            engineGlow: 0xcc00ff,
            scale: 1.04
        },
        raptor: {
            name: 'Fire Raptor',
            bodyColor: 0x2d170b,
            noseColor: 0xff5500,
            accentColor: 0xff7700,
            cockpitColor: 0xffaa44,
            cockpitEmissive: 0x9a3412,
            engineGlow: 0xff3300,
            scale: 1.05
        },
        nova: {
            name: 'Nova',
            bodyColor: 0x201c12,
            noseColor: 0xf59e0b,
            accentColor: 0xfcd34d,
            cockpitColor: 0xffea75,
            cockpitEmissive: 0xb45309,
            engineGlow: 0xffcc00,
            scale: 1.03
        },
        shadow: {
            name: 'Shadow B-2',
            bodyColor: 0x16181f,
            noseColor: 0x0e1015,
            accentColor: 0x2a2e3a,
            cockpitColor: 0xff1144,
            cockpitEmissive: 0x880022,
            engineGlow: 0xff0044,
            scale: 0.96
        }
    };

    // Helper: Material factory
    function createMaterials(jetId, isEnemy) {
        var spec = SPECS[jetId] || SPECS.falcon;
        var primary = isEnemy ? 0xb51a2b : spec.bodyColor;
        var secondary = isEnemy ? 0x6e0915 : spec.noseColor;
        var accent = isEnemy ? 0xff4444 : spec.accentColor;
        var canopy = isEnemy ? 0xff2244 : spec.cockpitColor;
        var canopyEmissive = isEnemy ? 0x990022 : spec.cockpitEmissive;
        var glow = isEnemy ? 0xff0044 : spec.engineGlow;

        var bodyMat = new THREE.MeshStandardMaterial({
            color: primary,
            metalness: 0.72,
            roughness: 0.28,
            flatShading: true,
            emissive: isEnemy ? 0x2b0008 : 0x000000
        });

        var noseMat = new THREE.MeshStandardMaterial({
            color: secondary,
            metalness: 0.82,
            roughness: 0.22,
            flatShading: true
        });

        var accentMat = new THREE.MeshStandardMaterial({
            color: accent,
            metalness: 0.75,
            roughness: 0.3,
            flatShading: true
        });

        var cockpitMat = new THREE.MeshStandardMaterial({
            color: canopy,
            transparent: true,
            opacity: 0.78,
            roughness: 0.1,
            metalness: 0.9,
            emissive: canopyEmissive,
            toneMapped: false
        });

        var nozzleMat = new THREE.MeshStandardMaterial({
            color: 0x1c1e22,
            metalness: 0.92,
            roughness: 0.35
        });

        var fireMat = new THREE.MeshBasicMaterial({
            color: glow,
            transparent: true,
            opacity: 0.92,
            toneMapped: false
        });

        var lightMat = new THREE.MeshBasicMaterial({
            color: glow,
            toneMapped: false
        });

        return {
            spec: spec,
            bodyMat: bodyMat,
            noseMat: noseMat,
            accentMat: accentMat,
            cockpitMat: cockpitMat,
            nozzleMat: nozzleMat,
            fireMat: fireMat,
            lightMat: lightMat,
            glowHex: glow
        };
    }

    // Helper: Standard Thruster Setup (adds nozzles, flames, boost beams, halos)
    function attachThrusterNozzles(group, positions, mats, isEnemy) {
        var fireMeshes = [];
        var fireMaterials = [];
        var boostBeams = [];
        var boostBeamMats = [];
        var boostHalos = [];
        var boostHaloMats = [];

        var nozzleGeom = new THREE.CylinderGeometry(0.28, 0.24, 0.8, 8);
        nozzleGeom.rotateX(Math.PI / 2);

        var fireGeom = new THREE.ConeGeometry(0.24, 1.6, 8);
        fireGeom.rotateX(-Math.PI / 2);
        fireGeom.translate(0, 0, -0.8);

        var beamGeom = new THREE.CylinderGeometry(0.08, 0.22, 6.0, 8);
        beamGeom.rotateX(Math.PI / 2);
        beamGeom.translate(0, 0, -3.4);

        var haloGeom = new THREE.CylinderGeometry(0.3, 1.0, 10, 8);
        haloGeom.rotateX(Math.PI / 2);
        haloGeom.translate(0, 0, -5.8);

        positions.forEach(function (pos) {
            var nozzle = new THREE.Mesh(nozzleGeom, mats.nozzleMat);
            nozzle.position.set(pos[0], pos[1], pos[2]);
            nozzle.castShadow = true;
            group.add(nozzle);

            var fm = mats.fireMat.clone();
            var fire = new THREE.Mesh(fireGeom, fm);
            nozzle.add(fire);
            fireMeshes.push(fire);
            fireMaterials.push(fm);

            var bm = new THREE.MeshBasicMaterial({
                color: isEnemy ? 0xff2200 : mats.glowHex,
                transparent: true,
                opacity: 0,
                toneMapped: false,
                depthWrite: false
            });
            var beam = new THREE.Mesh(beamGeom, bm);
            nozzle.add(beam);
            boostBeams.push(beam);
            boostBeamMats.push(bm);

            var hm = new THREE.MeshBasicMaterial({
                color: isEnemy ? 0xff4444 : mats.glowHex,
                transparent: true,
                opacity: 0,
                toneMapped: false,
                depthWrite: false
            });
            var halo = new THREE.Mesh(haloGeom, hm);
            nozzle.add(halo);
            boostHalos.push(halo);
            boostHaloMats.push(hm);
        });

        return {
            fireMeshes: fireMeshes,
            fireMaterials: fireMaterials,
            boostBeams: boostBeams,
            boostBeamMats: boostBeamMats,
            boostHalos: boostHalos,
            boostHaloMats: boostHaloMats
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 1. FALCON (Classic Air Superiority Fighter)
    // ─────────────────────────────────────────────────────────────
    function buildFalcon(mats, isEnemy) {
        var g = new THREE.Group();

        // 1. Fuselage
        var bodyGeom = new THREE.CylinderGeometry(0.7, 0.35, 7.5, 8);
        bodyGeom.rotateX(Math.PI / 2);
        var body = new THREE.Mesh(bodyGeom, mats.bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        g.add(body);

        // 2. Nose Cone
        var noseGeom = new THREE.ConeGeometry(0.7, 2.5, 8);
        noseGeom.rotateX(Math.PI / 2);
        noseGeom.translate(0, 0, 5);
        var nose = new THREE.Mesh(noseGeom, mats.noseMat);
        nose.castShadow = true;
        g.add(nose);

        // 3. Cockpit Canopy
        var cockpitGeom = new THREE.SphereGeometry(0.55, 12, 12);
        cockpitGeom.scale(1, 0.65, 1.8);
        cockpitGeom.translate(0, 0.5, 1.2);
        var cockpit = new THREE.Mesh(cockpitGeom, mats.cockpitMat);
        g.add(cockpit);

        // 4. Swept-back Wings
        var wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(5.5, -2.5);
        wingShape.lineTo(5.0, -3.8);
        wingShape.lineTo(0, -1.8);
        wingShape.lineTo(0, 0);

        var wingGeom = new THREE.ExtrudeGeometry(wingShape, WING_SETTINGS);
        wingGeom.rotateX(Math.PI / 2);
        wingGeom.translate(0, 0, 0.8);

        var wingLeft = new THREE.Mesh(wingGeom, mats.bodyMat);
        wingLeft.castShadow = true;
        g.add(wingLeft);

        var wingRight = wingLeft.clone();
        wingRight.scale.x = -1;
        g.add(wingRight);

        // Wingtip lights
        var tipGeom = new THREE.SphereGeometry(0.2, 8, 8);
        var tipL = new THREE.Mesh(tipGeom, mats.lightMat);
        tipL.position.set(5.5, 0, -1.7);
        g.add(tipL);
        var tipR = tipL.clone();
        tipR.position.x = -5.5;
        g.add(tipR);

        // 5. Horizontal Tail Stabilizers
        var tailShape = new THREE.Shape();
        tailShape.moveTo(0, 0);
        tailShape.lineTo(2.2, -0.8);
        tailShape.lineTo(2.0, -1.4);
        tailShape.lineTo(0, -0.9);
        tailShape.lineTo(0, 0);

        var tailGeom = new THREE.ExtrudeGeometry(tailShape, WING_SETTINGS);
        tailGeom.rotateX(Math.PI / 2);
        tailGeom.translate(0, 0, -2.8);

        var tailLeft = new THREE.Mesh(tailGeom, mats.bodyMat);
        g.add(tailLeft);
        var tailRight = tailLeft.clone();
        tailRight.scale.x = -1;
        g.add(tailRight);

        // 6. Canted Vertical Stabilizers
        var finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(0, 1.8);
        finShape.lineTo(-1.2, 1.6);
        finShape.lineTo(-1.6, 0);
        finShape.lineTo(0, 0);

        var finGeom = new THREE.ExtrudeGeometry(finShape, WING_SETTINGS);
        finGeom.rotateY(-Math.PI / 2);
        finGeom.translate(0.2, 0.3, -2.4);

        var finLeft = new THREE.Mesh(finGeom, mats.bodyMat);
        finLeft.rotation.z = -0.15;
        g.add(finLeft);

        var finRight = finLeft.clone();
        finRight.position.x = -0.4;
        finRight.rotation.z = 0.15;
        g.add(finRight);

        // Thrusters
        var thrusters = attachThrusterNozzles(g, [[-0.3, 0, -3.7], [0.3, 0, -3.7]], mats, isEnemy);
        return { group: g, thrusters: thrusters };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. VIPER (Su-47 Berkut Forward-Swept Wing Interceptor)
    // ─────────────────────────────────────────────────────────────
    function buildViper(mats, isEnemy) {
        var g = new THREE.Group();

        // 1. Slim, razor needle fuselage
        var bodyGeom = new THREE.CylinderGeometry(0.55, 0.32, 7.8, 6);
        bodyGeom.rotateX(Math.PI / 2);
        var body = new THREE.Mesh(bodyGeom, mats.bodyMat);
        body.castShadow = true;
        g.add(body);

        // 2. Sharp Needle Nose with twin intake chines
        var noseGeom = new THREE.ConeGeometry(0.55, 3.2, 6);
        noseGeom.rotateX(Math.PI / 2);
        noseGeom.translate(0, 0, 5.4);
        var nose = new THREE.Mesh(noseGeom, mats.noseMat);
        nose.castShadow = true;
        g.add(nose);

        // Pitot probe antenna on nose tip
        var probeGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
        probeGeom.rotateX(Math.PI / 2);
        probeGeom.translate(0, 0, 7.4);
        var probe = new THREE.Mesh(probeGeom, mats.accentMat);
        g.add(probe);

        // 3. Elongated Low-Drag Cockpit
        var cockpitGeom = new THREE.SphereGeometry(0.48, 12, 12);
        cockpitGeom.scale(0.85, 0.55, 2.2);
        cockpitGeom.translate(0, 0.42, 1.5);
        var cockpit = new THREE.Mesh(cockpitGeom, mats.cockpitMat);
        g.add(cockpit);

        // 4. Forward All-Moving Canards (mounted ahead of main wings)
        var canardShape = new THREE.Shape();
        canardShape.moveTo(0, 0);
        canardShape.lineTo(1.8, -0.6);
        canardShape.lineTo(1.5, -1.2);
        canardShape.lineTo(0, -0.7);
        canardShape.lineTo(0, 0);

        var canardGeom = new THREE.ExtrudeGeometry(canardShape, WING_SETTINGS);
        canardGeom.rotateX(Math.PI / 2);
        canardGeom.translate(0.3, 0.1, 2.6);

        var canardL = new THREE.Mesh(canardGeom, mats.accentMat);
        g.add(canardL);
        var canardR = canardL.clone();
        canardR.position.x = -0.3;
        canardR.scale.x = -1;
        g.add(canardR);

        // 5. AGGRESSIVE FORWARD-SWEPT WINGS!
        // Root is further back at z = -0.4, sweeps forward to z = +1.6 at wingtips!
        var fswShape = new THREE.Shape();
        fswShape.moveTo(0, -0.4);
        fswShape.lineTo(5.4, 1.5);    // Sweeps FORWARD!
        fswShape.lineTo(5.2, 0.4);    // Tip chord
        fswShape.lineTo(0, -2.0);    // Root trailing edge
        fswShape.lineTo(0, -0.4);

        var fswGeom = new THREE.ExtrudeGeometry(fswShape, WING_SETTINGS);
        fswGeom.rotateX(Math.PI / 2);

        var wingLeft = new THREE.Mesh(fswGeom, mats.bodyMat);
        wingLeft.castShadow = true;
        g.add(wingLeft);

        var wingRight = wingLeft.clone();
        wingRight.scale.x = -1;
        g.add(wingRight);

        // Downward canted wingtip endplates with neon edge
        var tipEndShape = new THREE.Shape();
        tipEndShape.moveTo(0, 0);
        tipEndShape.lineTo(0, -0.6);
        tipEndShape.lineTo(1.0, -0.4);
        tipEndShape.lineTo(1.0, 0.2);
        tipEndShape.lineTo(0, 0);

        var tipEndGeom = new THREE.ExtrudeGeometry(tipEndShape, WING_SETTINGS);
        tipEndGeom.rotateY(Math.PI / 2);
        tipEndGeom.translate(5.3, -0.1, 0.9);

        var endplateL = new THREE.Mesh(tipEndGeom, mats.accentMat);
        g.add(endplateL);
        var endplateR = endplateL.clone();
        endplateR.position.x = -10.6;
        g.add(endplateR);

        // Wingtip glowing nav beacons
        var tipGlowGeom = new THREE.SphereGeometry(0.18, 8, 8);
        var tipL = new THREE.Mesh(tipGlowGeom, mats.lightMat);
        tipL.position.set(5.35, -0.1, 1.4);
        g.add(tipL);
        var tipR = tipL.clone();
        tipR.position.x = -5.35;
        g.add(tipR);

        // 6. Dual Outward-Canted Vertical Stabilizers
        var vFinShape = new THREE.Shape();
        vFinShape.moveTo(0, 0);
        vFinShape.lineTo(0.3, 1.9);
        vFinShape.lineTo(-1.1, 1.7);
        vFinShape.lineTo(-1.5, 0);
        vFinShape.lineTo(0, 0);

        var vFinGeom = new THREE.ExtrudeGeometry(vFinShape, WING_SETTINGS);
        vFinGeom.rotateY(-Math.PI / 2);
        vFinGeom.translate(0.5, 0.2, -2.6);

        var finL = new THREE.Mesh(vFinGeom, mats.accentMat);
        finL.rotation.z = -0.26; // Canted outward
        g.add(finL);

        var finR = finL.clone();
        finR.position.x = -1.0;
        finR.rotation.z = 0.26;
        g.add(finR);

        // Thrusters
        var thrusters = attachThrusterNozzles(g, [[-0.28, 0.02, -3.9], [0.28, 0.02, -3.9]], mats, isEnemy);
        return { group: g, thrusters: thrusters };
    }

    // ─────────────────────────────────────────────────────────────
    // 3. PHANTOM (Heavy Delta-Wing Assault Fighter)
    // ─────────────────────────────────────────────────────────────
    function buildPhantom(mats, isEnemy) {
        var g = new THREE.Group();

        // 1. Wide Armored Fuselage (heavy lifting body)
        var bodyGeom = new THREE.BoxGeometry(1.6, 0.85, 7.2);
        bodyGeom.translate(0, 0, 0.1);
        var body = new THREE.Mesh(bodyGeom, mats.bodyMat);
        body.castShadow = true;
        g.add(body);

        // 2. Chiseled Faceted Stealth Nose
        var noseGeom = new THREE.ConeGeometry(0.9, 2.8, 4);
        noseGeom.rotateY(Math.PI / 4);
        noseGeom.rotateX(Math.PI / 2);
        noseGeom.translate(0, 0, 4.8);
        var nose = new THREE.Mesh(noseGeom, mats.noseMat);
        nose.castShadow = true;
        g.add(nose);

        // 3. Heavy Armored Canopy
        var cockpitGeom = new THREE.BoxGeometry(0.95, 0.65, 2.4);
        cockpitGeom.translate(0, 0.55, 1.2);
        var cockpit = new THREE.Mesh(cockpitGeom, mats.cockpitMat);
        g.add(cockpit);

        // 4. MASSIVE CONTINUOUS DELTA WINGS!
        // Root runs from z = 2.4 all the way to z = -3.2, spanning out to x = 5.8!
        var deltaShape = new THREE.Shape();
        deltaShape.moveTo(0, 2.4);
        deltaShape.lineTo(5.8, -2.8);   // Sharp wide delta sweep
        deltaShape.lineTo(5.4, -3.3);   // Clipped trailing tip
        deltaShape.lineTo(0, -3.1);     // Wide trailing edge
        deltaShape.lineTo(0, 2.4);

        var deltaGeom = new THREE.ExtrudeGeometry(deltaShape, THICK_WING_SETTINGS);
        deltaGeom.rotateX(Math.PI / 2);

        var wingL = new THREE.Mesh(deltaGeom, mats.bodyMat);
        wingL.castShadow = true;
        g.add(wingL);

        var wingR = wingL.clone();
        wingR.scale.x = -1;
        g.add(wingR);

        // Accent leading edge slats
        var slatShape = new THREE.Shape();
        slatShape.moveTo(0.8, 2.0);
        slatShape.lineTo(5.7, -2.7);
        slatShape.lineTo(5.4, -2.9);
        slatShape.lineTo(0.8, 1.7);
        slatShape.lineTo(0.8, 2.0);
        var slatGeom = new THREE.ExtrudeGeometry(slatShape, WING_SETTINGS);
        slatGeom.rotateX(Math.PI / 2);
        slatGeom.translate(0, 0.12, 0);
        var slatL = new THREE.Mesh(slatGeom, mats.accentMat);
        g.add(slatL);
        var slatR = slatL.clone();
        slatR.scale.x = -1;
        g.add(slatR);

        // 5. Heavy Under-Wing Missile Pylons & Armament (4 heavy assault missiles)
        var pylonGeom = new THREE.BoxGeometry(0.12, 0.35, 1.8);
        var missileGeom = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8);
        missileGeom.rotateX(Math.PI / 2);
        var missileMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
        var warheadGeom = new THREE.ConeGeometry(0.12, 0.5, 8);
        warheadGeom.rotateX(Math.PI / 2);
        warheadGeom.translate(0, 0, 1.35);

        [-3.2, -1.8, 1.8, 3.2].forEach(function (xPos) {
            var pylon = new THREE.Mesh(pylonGeom, mats.noseMat);
            pylon.position.set(xPos, -0.3, -0.8);
            g.add(pylon);

            var missile = new THREE.Mesh(missileGeom, missileMat);
            missile.position.set(xPos, -0.5, -0.8);
            g.add(missile);

            var warhead = new THREE.Mesh(warheadGeom, mats.lightMat);
            warhead.position.set(xPos, -0.5, -0.8);
            g.add(warhead);
        });

        // 6. Tall Center Dorsal Fin + Wingtip Vertical Fences
        var centerFinShape = new THREE.Shape();
        centerFinShape.moveTo(0, 0);
        centerFinShape.lineTo(0, 2.2);
        centerFinShape.lineTo(-1.4, 1.9);
        centerFinShape.lineTo(-2.2, 0);
        centerFinShape.lineTo(0, 0);

        var centerFinGeom = new THREE.ExtrudeGeometry(centerFinShape, WING_SETTINGS);
        centerFinGeom.rotateY(-Math.PI / 2);
        centerFinGeom.translate(0, 0.4, -1.8);
        var centerFin = new THREE.Mesh(centerFinGeom, mats.accentMat);
        g.add(centerFin);

        // Wingtip vertical fences
        var fenceShape = new THREE.Shape();
        fenceShape.moveTo(0, -0.3);
        fenceShape.lineTo(0, 0.7);
        fenceShape.lineTo(-1.2, 0.5);
        fenceShape.lineTo(-1.2, -0.3);
        fenceShape.lineTo(0, -0.3);

        var fenceGeom = new THREE.ExtrudeGeometry(fenceShape, WING_SETTINGS);
        fenceGeom.rotateY(-Math.PI / 2);
        fenceGeom.translate(5.7, 0, -2.4);
        var fenceL = new THREE.Mesh(fenceGeom, mats.accentMat);
        g.add(fenceL);
        var fenceR = fenceL.clone();
        fenceR.position.x = -11.4;
        g.add(fenceR);

        // Heavy dual turbofans
        var thrusters = attachThrusterNozzles(g, [[-0.45, 0, -3.6], [0.45, 0, -3.6]], mats, isEnemy);
        return { group: g, thrusters: thrusters };
    }

    // ─────────────────────────────────────────────────────────────
    // 4. RAPTOR (Fire Raptor Strike Fighter)
    // ─────────────────────────────────────────────────────────────
    function buildRaptor(mats, isEnemy) {
        var g = new THREE.Group();

        // 1. Broad Twin-Engine Blended Fuselage with central tunnel
        var bodyL = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 7.2, 8), mats.bodyMat);
        bodyL.geometry.rotateX(Math.PI / 2);
        bodyL.position.set(0.45, 0, 0);
        bodyL.castShadow = true;
        g.add(bodyL);

        var bodyR = bodyL.clone();
        bodyR.position.x = -0.45;
        g.add(bodyR);

        // Center spine tunnel
        var spineGeom = new THREE.BoxGeometry(0.9, 0.45, 5.8);
        spineGeom.translate(0, 0.15, 0.4);
        var spine = new THREE.Mesh(spineGeom, mats.accentMat);
        g.add(spine);

        // 2. Chiseled Strike Shark Nose with LERX (leading-edge root extensions)
        var noseGeom = new THREE.ConeGeometry(0.85, 3.0, 6);
        noseGeom.rotateX(Math.PI / 2);
        noseGeom.translate(0, 0, 5.1);
        var nose = new THREE.Mesh(noseGeom, mats.noseMat);
        nose.castShadow = true;
        g.add(nose);

        // 3. Tandem 2-Seat Canopy
        var cockpitGeom = new THREE.SphereGeometry(0.5, 12, 12);
        cockpitGeom.scale(0.9, 0.6, 2.5);
        cockpitGeom.translate(0, 0.48, 1.6);
        var cockpit = new THREE.Mesh(cockpitGeom, mats.cockpitMat);
        g.add(cockpit);

        // 4. Swept Combat Wings with Wingtip Sidewinder Missile Rails
        var wingShape = new THREE.Shape();
        wingShape.moveTo(0, 1.4);
        wingShape.lineTo(5.8, -1.8);
        wingShape.lineTo(5.4, -3.2);
        wingShape.lineTo(0, -1.8);
        wingShape.lineTo(0, 1.4);

        var wingGeom = new THREE.ExtrudeGeometry(wingShape, WING_SETTINGS);
        wingGeom.rotateX(Math.PI / 2);

        var wingL = new THREE.Mesh(wingGeom, mats.bodyMat);
        wingL.castShadow = true;
        g.add(wingL);

        var wingR = wingL.clone();
        wingR.scale.x = -1;
        g.add(wingR);

        // Wingtip Sidewinder Missiles
        var railGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6);
        railGeom.rotateX(Math.PI / 2);
        var missileTipGeom = new THREE.ConeGeometry(0.12, 0.4, 6);
        missileTipGeom.rotateX(Math.PI / 2);
        missileTipGeom.translate(0, 0, 1.1);

        var missileL = new THREE.Mesh(railGeom, mats.accentMat);
        missileL.position.set(5.75, 0, -2.4);
        var tipMissileL = new THREE.Mesh(missileTipGeom, mats.lightMat);
        missileL.add(tipMissileL);
        g.add(missileL);

        var missileR = missileL.clone();
        missileR.position.x = -5.75;
        g.add(missileR);

        // 5. Twin Giant Outward-Canted Vertical Stabilizers (F-15/F-22 style)
        var tailFinShape = new THREE.Shape();
        tailFinShape.moveTo(0, 0);
        tailFinShape.lineTo(0.3, 2.3);
        tailFinShape.lineTo(-1.3, 2.0);
        tailFinShape.lineTo(-1.8, 0);
        tailFinShape.lineTo(0, 0);

        var tailFinGeom = new THREE.ExtrudeGeometry(tailFinShape, WING_SETTINGS);
        tailFinGeom.rotateY(-Math.PI / 2);
        tailFinGeom.translate(0.65, 0.2, -2.4);

        var finL = new THREE.Mesh(tailFinGeom, mats.accentMat);
        finL.rotation.z = -0.22;
        g.add(finL);

        var finR = finL.clone();
        finR.position.x = -1.3;
        finR.rotation.z = 0.22;
        g.add(finR);

        // 6. Horizontal All-Moving Tailerons
        var taileronShape = new THREE.Shape();
        taileronShape.moveTo(0, 0);
        taileronShape.lineTo(2.4, -0.9);
        taileronShape.lineTo(2.1, -1.6);
        taileronShape.lineTo(0, -1.1);
        taileronShape.lineTo(0, 0);

        var taileronGeom = new THREE.ExtrudeGeometry(taileronShape, WING_SETTINGS);
        taileronGeom.rotateX(Math.PI / 2);
        taileronGeom.translate(0, -0.05, -3.0);

        var taileronL = new THREE.Mesh(taileronGeom, mats.bodyMat);
        g.add(taileronL);
        var taileronR = taileronL.clone();
        taileronR.scale.x = -1;
        g.add(taileronR);

        // Dual heavy afterburners
        var thrusters = attachThrusterNozzles(g, [[-0.45, 0, -3.7], [0.45, 0, -3.7]], mats, isEnemy);
        return { group: g, thrusters: thrusters };
    }

    // ─────────────────────────────────────────────────────────────
    // 5. NOVA (Hypersonic Wave-Rider Mach 5+ Sci-Fi Stealth)
    // ─────────────────────────────────────────────────────────────
    function buildNova(mats, isEnemy) {
        var g = new THREE.Group();

        // 1. Extreme Knife-Edge Blended Lifting Body (Wave-rider geometry)
        var bodyGeom = new THREE.ConeGeometry(1.1, 8.5, 4);
        bodyGeom.rotateY(Math.PI / 4);
        bodyGeom.rotateX(Math.PI / 2);
        bodyGeom.scale(1.2, 0.35, 1.0);
        bodyGeom.translate(0, 0, 1.2);
        var body = new THREE.Mesh(bodyGeom, mats.bodyMat);
        body.castShadow = true;
        g.add(body);

        // 2. Needle Nose Probe
        var needleGeom = new THREE.ConeGeometry(0.3, 3.2, 4);
        needleGeom.rotateY(Math.PI / 4);
        needleGeom.rotateX(Math.PI / 2);
        needleGeom.translate(0, 0, 5.8);
        var needle = new THREE.Mesh(needleGeom, mats.noseMat);
        needle.castShadow = true;
        g.add(needle);

        // 3. Flush Dorsal Cockpit Visor
        var cockpitGeom = new THREE.SphereGeometry(0.42, 10, 10);
        cockpitGeom.scale(0.8, 0.45, 2.2);
        cockpitGeom.translate(0, 0.32, 1.4);
        var cockpit = new THREE.Mesh(cockpitGeom, mats.cockpitMat);
        g.add(cockpit);

        // 4. Cranked Wave-Rider Wings with Drooped Hypersonic Wingtips
        var innerWingShape = new THREE.Shape();
        innerWingShape.moveTo(0, 3.2);
        innerWingShape.lineTo(4.4, -1.8);
        innerWingShape.lineTo(4.0, -3.4);
        innerWingShape.lineTo(0, -3.0);
        innerWingShape.lineTo(0, 3.2);

        var innerWingGeom = new THREE.ExtrudeGeometry(innerWingShape, WING_SETTINGS);
        innerWingGeom.rotateX(Math.PI / 2);

        var wingL = new THREE.Mesh(innerWingGeom, mats.bodyMat);
        wingL.castShadow = true;
        g.add(wingL);

        var wingR = wingL.clone();
        wingR.scale.x = -1;
        g.add(wingR);

        // Drooped outer wave-rider wingtips (canted downward 35 degrees to trap shockwave!)
        var droopShape = new THREE.Shape();
        droopShape.moveTo(0, 0);
        droopShape.lineTo(1.6, -0.6);
        droopShape.lineTo(1.4, -1.4);
        droopShape.lineTo(0, -1.2);
        droopShape.lineTo(0, 0);

        var droopGeom = new THREE.ExtrudeGeometry(droopShape, WING_SETTINGS);
        droopGeom.rotateX(Math.PI / 2);
        droopGeom.translate(4.2, 0, -2.0);

        var droopL = new THREE.Mesh(droopGeom, mats.accentMat);
        droopL.rotation.z = -0.55; // Droop downward!
        g.add(droopL);

        var droopR = droopL.clone();
        droopR.position.x = -8.4;
        droopR.rotation.z = 0.55;
        g.add(droopR);

        // Glowing gold energy conduit stripes along the leading edges
        var conduitGeom = new THREE.CylinderGeometry(0.05, 0.05, 6.2, 6);
        conduitGeom.rotateZ(-Math.PI / 4.2);
        conduitGeom.rotateX(Math.PI / 2);
        conduitGeom.translate(2.2, 0.08, 0.6);
        var conduitL = new THREE.Mesh(conduitGeom, mats.lightMat);
        g.add(conduitL);

        var conduitR = conduitL.clone();
        conduitR.position.x = -4.4;
        conduitR.rotation.z = Math.PI / 4.2;
        g.add(conduitR);

        // 5. Low-Profile Integrated Scramjet Vertical Rudders
        var rudGeom = new THREE.BoxGeometry(0.12, 1.1, 2.2);
        rudGeom.translate(1.0, 0.65, -2.4);
        var rudL = new THREE.Mesh(rudGeom, mats.accentMat);
        rudL.rotation.z = -0.18;
        g.add(rudL);

        var rudR = rudL.clone();
        rudR.position.x = -2.0;
        rudR.rotation.z = 0.18;
        g.add(rudR);

        // Dual hypersonic scramjet thrusters
        var thrusters = attachThrusterNozzles(g, [[-0.4, 0.04, -3.8], [0.4, 0.04, -3.8]], mats, isEnemy);
        return { group: g, thrusters: thrusters };
    }

    // ─────────────────────────────────────────────────────────────
    // 6. SHADOW (B-2 Spirit Stealth Flying Wing Bomber)
    // ─────────────────────────────────────────────────────────────
    function buildShadowB2(mats, isEnemy) {
        var g = new THREE.Group();

        // 1. THE ICONIC B-2 STEALTH FLYING WING PLANFORM
        // Continuous sweep leading edge (33 deg) + W-shaped saw-tooth trailing edge!
        var b2Shape = new THREE.Shape();
        // Nose apex at z = +4.2 (shape Y = +4.2)
        b2Shape.moveTo(0, 4.2);

        // Left leading edge (sweeping back to left wingtip at x = +7.0, z = -0.8)
        b2Shape.lineTo(7.0, -0.8);
        b2Shape.lineTo(7.0, -1.6); // Straight tip edge

        // Left saw-tooth / W trailing edge notches (deflects radar)
        b2Shape.lineTo(4.4, 0.4);   // Notch 1 inward
        b2Shape.lineTo(3.0, -0.8);  // Tooth 1 outward
        b2Shape.lineTo(1.5, 0.5);   // Notch 2 inward
        b2Shape.lineTo(0, -0.6);    // Center aft apex

        // Right saw-tooth / W trailing edge notches (symmetric)
        b2Shape.lineTo(-1.5, 0.5);
        b2Shape.lineTo(-3.0, -0.8);
        b2Shape.lineTo(-4.4, 0.4);
        b2Shape.lineTo(-7.0, -1.6); // Right wingtip
        b2Shape.lineTo(-7.0, -0.8);

        // Close back to nose apex
        b2Shape.lineTo(0, 4.2);

        var b2Geom = new THREE.ExtrudeGeometry(b2Shape, THICK_WING_SETTINGS);
        b2Geom.rotateX(Math.PI / 2);
        b2Geom.translate(0, 0, 0);

        var flyingWing = new THREE.Mesh(b2Geom, mats.bodyMat);
        flyingWing.castShadow = true;
        flyingWing.receiveShadow = true;
        g.add(flyingWing);

        // 2. Center Blended Cockpit Hump (emerges smoothly from the wing)
        var humpGeom = new THREE.SphereGeometry(0.72, 14, 12);
        humpGeom.scale(1.3, 0.6, 2.8);
        humpGeom.translate(0, 0.28, 1.8);
        var hump = new THREE.Mesh(humpGeom, mats.noseMat);
        hump.castShadow = true;
        g.add(hump);

        // Stealth cockpit faceted canopy glass
        var canopyGeom = new THREE.ConeGeometry(0.55, 1.6, 4);
        canopyGeom.rotateY(Math.PI / 4);
        canopyGeom.rotateX(Math.PI / 2);
        canopyGeom.scale(1.2, 0.45, 1.0);
        canopyGeom.translate(0, 0.48, 2.3);
        var canopy = new THREE.Mesh(canopyGeom, mats.cockpitMat);
        g.add(canopy);

        // 3. Scalloped S-Duct Stealth Air Intakes on Upper Surface
        var intakeGeom = new THREE.BoxGeometry(0.85, 0.22, 1.4);
        var intakeL = new THREE.Mesh(intakeGeom, mats.noseMat);
        intakeL.position.set(1.4, 0.24, 0.8);
        g.add(intakeL);

        var intakeR = intakeL.clone();
        intakeR.position.x = -1.4;
        g.add(intakeR);

        // Intake dark cavities
        var cavityGeom = new THREE.BoxGeometry(0.7, 0.15, 0.4);
        var cavityMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        var cavL = new THREE.Mesh(cavityGeom, cavityMat);
        cavL.position.set(1.4, 0.24, 1.4);
        g.add(cavL);
        var cavR = cavL.clone();
        cavR.position.x = -1.4;
        g.add(cavR);

        // 4. Stealth Slot Exhaust Nozzles (Flush embedded into upper rear deck)
        var slotDeckGeom = new THREE.BoxGeometry(0.9, 0.25, 1.6);
        var slotL = new THREE.Mesh(slotDeckGeom, mats.nozzleMat);
        slotL.position.set(1.4, 0.16, -1.0);
        g.add(slotL);

        var slotR = slotL.clone();
        slotR.position.x = -1.4;
        g.add(slotR);

        // 5. Radar-absorbent stealth leading edge panel accents
        var stealthStripGeom = new THREE.CylinderGeometry(0.04, 0.04, 7.8, 4);
        stealthStripGeom.rotateZ(-Math.PI / 5.2);
        stealthStripGeom.rotateX(Math.PI / 2);
        stealthStripGeom.translate(3.5, 0.12, 1.6);
        var stripL = new THREE.Mesh(stealthStripGeom, mats.accentMat);
        g.add(stripL);

        var stripR = stripL.clone();
        stripR.position.x = -7.0;
        stripR.rotation.z = Math.PI / 5.2;
        g.add(stripR);

        // Stealth Wingtip Infrared Beacon Lights
        var tipGeom = new THREE.SphereGeometry(0.16, 8, 8);
        var tipL = new THREE.Mesh(tipGeom, mats.lightMat);
        tipL.position.set(7.0, 0, -1.2);
        g.add(tipL);
        var tipR = tipL.clone();
        tipR.position.x = -7.0;
        g.add(tipR);

        // Underbelly Stealth Bomb Bay Door Contours
        var bayGeom = new THREE.BoxGeometry(1.6, 0.1, 3.2);
        bayGeom.translate(0, -0.16, 0.2);
        var bay = new THREE.Mesh(bayGeom, mats.accentMat);
        g.add(bay);

        // Stealth Thruster Flames (recessed slot exhausts)
        var thrusters = attachThrusterNozzles(g, [[-1.4, 0.12, -1.8], [1.4, 0.12, -1.8]], mats, isEnemy);
        return { group: g, thrusters: thrusters };
    }

    // ─────────────────────────────────────────────────────────────
    // PUBLIC BUILDER API
    // ─────────────────────────────────────────────────────────────
    function buildJet(jetId, isEnemy, options) {
        jetId = (jetId || 'falcon').toLowerCase();
        options = options || {};

        var mats = createMaterials(jetId, isEnemy);
        var result;

        switch (jetId) {
            case 'viper':
                result = buildViper(mats, isEnemy);
                break;
            case 'phantom':
                result = buildPhantom(mats, isEnemy);
                break;
            case 'raptor':
                result = buildRaptor(mats, isEnemy);
                break;
            case 'nova':
                result = buildNova(mats, isEnemy);
                break;
            case 'shadow':
                result = buildShadowB2(mats, isEnemy);
                break;
            case 'falcon':
            default:
                result = buildFalcon(mats, isEnemy);
                break;
        }

        var group = result.group;
        var thrusters = result.thrusters;

        // Apply natural scale
        var s = (options.scale !== undefined) ? options.scale : (mats.spec.scale || 1.0);
        group.scale.set(s, s, s);

        // Store userData metadata so flight engine & animators can drive effects
        group.userData = {
            jetId: jetId,
            isEnemy: !!isEnemy,
            spec: mats.spec,
            bodyMat: mats.bodyMat,
            noseMat: mats.noseMat,
            accentMat: mats.accentMat,
            cockpitMat: mats.cockpitMat,
            nozzleMat: mats.nozzleMat,
            fireMeshes: thrusters.fireMeshes,
            fireMaterials: thrusters.fireMaterials,
            boostBeams: thrusters.boostBeams,
            boostBeamMats: thrusters.boostBeamMats,
            boostHalos: thrusters.boostHalos,
            boostHaloMats: thrusters.boostHaloMats
        };

        return group;
    }

    // ─────────────────────────────────────────────────────────────
    // MINI 3D SHOP CARD PREVIEWS ENGINE
    // Uses a SINGLE shared WebGLRenderer to paint onto all shop cards!
    // 100% bug-free, zero WebGL context limits, silky smooth 60fps!
    // ─────────────────────────────────────────────────────────────
    var shopPreviewState = {
        renderer: null,
        scene: null,
        camera: null,
        models: {},
        rafId: null,
        isActive: false
    };

    function initShopPreviewEngine() {
        if (shopPreviewState.renderer) return shopPreviewState;

        var offCanvas = document.createElement('canvas');
        offCanvas.width = 160;
        offCanvas.height = 180;

        var renderer = new THREE.WebGLRenderer({
            canvas: offCanvas,
            alpha: true,
            antialias: true
        });
        renderer.setSize(160, 180);
        renderer.setPixelRatio(1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;

        var scene = new THREE.Scene();

        // 3-Point Studio Lighting for Jet Presentation
        var hemi = new THREE.HemisphereLight(0xffffff, 0x1f1133, 1.2);
        scene.add(hemi);

        var keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
        keyLight.position.set(6, 10, 8);
        scene.add(keyLight);

        var rimLight = new THREE.DirectionalLight(0xa855f7, 1.3);
        rimLight.position.set(-6, -2, -6);
        scene.add(rimLight);

        var fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
        fillLight.position.set(-4, 3, 6);
        scene.add(fillLight);

        var camera = new THREE.PerspectiveCamera(36, 160 / 180, 0.1, 50);
        // Dynamic 3/4 hero camera
        camera.position.set(0, 3.6, 12.0);
        camera.lookAt(0, 0, 0);

        shopPreviewState.renderer = renderer;
        shopPreviewState.scene = scene;
        shopPreviewState.camera = camera;
        shopPreviewState.models = {};

        // Prebuild all 6 jet models into cache
        ['falcon', 'viper', 'phantom', 'raptor', 'nova', 'shadow'].forEach(function (id) {
            var model = buildJet(id, false, { scale: 0.82 });
            shopPreviewState.models[id] = model;
        });

        return shopPreviewState;
    }

    function renderShopCards() {
        var engine = initShopPreviewEngine();
        if (!engine) return;

        var cards = document.querySelectorAll('.jet-card-3d-box[data-jet-id]');
        if (cards.length === 0) return;

        var time = performance.now() * 0.001;

        cards.forEach(function (box) {
            var jetId = box.dataset.jetId;
            var canvas = box.querySelector('canvas.jet-card-canvas');
            if (!canvas || !jetId) return;

            var model = engine.models[jetId];
            if (!model) return;

            // Remove any existing children in scene
            for (var i = engine.scene.children.length - 1; i >= 0; i--) {
                var child = engine.scene.children[i];
                if (child.isGroup) engine.scene.remove(child);
            }

            // Hero presentation angle with gentle turntable hover
            // Slight tilt toward camera (X) and subtle yaw spin (Y)
            var hoverRotY = 0.45 + Math.sin(time * 1.2 + (jetId.charCodeAt(0) % 5)) * 0.25;
            var hoverRotX = 0.38 + Math.cos(time * 0.8) * 0.05;
            var hoverRotZ = -0.15;

            model.rotation.set(hoverRotX, hoverRotY, hoverRotZ);

            // Subtle flame flicker
            if (model.userData && model.userData.fireMeshes) {
                var flScale = 0.9 + 0.2 * Math.sin(time * 12 + jetId.length);
                model.userData.fireMeshes.forEach(function (f) {
                    f.scale.z = flScale;
                });
            }

            engine.scene.add(model);
            engine.renderer.render(engine.scene, engine.camera);

            // Copy crisp WebGL buffer to 2D card canvas
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(engine.renderer.domElement, 0, 0, canvas.width, canvas.height);
            }
        });
    }

    function startShopAnimation() {
        if (shopPreviewState.isActive) return;
        shopPreviewState.isActive = true;

        function loop() {
            if (!shopPreviewState.isActive) return;
            renderShopCards();
            shopPreviewState.rafId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopShopAnimation() {
        shopPreviewState.isActive = false;
        if (shopPreviewState.rafId) {
            cancelAnimationFrame(shopPreviewState.rafId);
            shopPreviewState.rafId = null;
        }
    }

    return {
        SPECS: SPECS,
        buildJet: buildJet,
        initShopPreviewEngine: initShopPreviewEngine,
        renderShopCards: renderShopCards,
        startShopAnimation: startShopAnimation,
        stopShopAnimation: stopShopAnimation
    };
}));
