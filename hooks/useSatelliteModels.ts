'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

/**
 * Manages cached Three.js geometries and materials for satellite 3D models.
 * Provides factory functions for creating satellite and station models,
 * and handles GPU resource disposal on unmount.
 */
export function useSatelliteModels() {
  // Satellite geometries (body + solar panels + antenna) — normal and selected sizes
  const bodyGeoRef = useRef(new THREE.BoxGeometry(1.0, 0.6, 0.6));
  const panelGeoRef = useRef(new THREE.BoxGeometry(1.6, 0.05, 0.8));
  const antennaGeoRef = useRef(new THREE.ConeGeometry(0.2, 0.5, 6));
  const selectedBodyGeoRef = useRef(new THREE.BoxGeometry(1.6, 1.0, 1.0));
  const selectedPanelGeoRef = useRef(new THREE.BoxGeometry(2.6, 0.08, 1.3));
  const selectedAntennaGeoRef = useRef(new THREE.ConeGeometry(0.35, 0.8, 6));
  const panelMatRef = useRef(new THREE.MeshBasicMaterial({ color: 0x1a237e }));
  const selectedPanelMatRef = useRef(new THREE.MeshBasicMaterial({ color: 0x3949ab }));
  const materialCacheRef = useRef(new Map<string, THREE.MeshBasicMaterial>());

  // Station geometries (ISS-like) — lazily created and cached
  const stationMainGeoRef = useRef<THREE.CylinderGeometry | null>(null);
  const stationModuleLGeoRef = useRef<THREE.CylinderGeometry | null>(null);
  const stationModuleRGeoRef = useRef<THREE.CylinderGeometry | null>(null);
  const stationTrussGeoRef = useRef<THREE.BoxGeometry | null>(null);
  const stationPanelGeoRef = useRef<THREE.BoxGeometry | null>(null);
  const stationRadiatorGeoRef = useRef<THREE.BoxGeometry | null>(null);
  const stationSelMainGeoRef = useRef<THREE.CylinderGeometry | null>(null);
  const stationSelModuleLGeoRef = useRef<THREE.CylinderGeometry | null>(null);
  const stationSelModuleRGeoRef = useRef<THREE.CylinderGeometry | null>(null);
  const stationSelTrussGeoRef = useRef<THREE.BoxGeometry | null>(null);
  const stationSelPanelGeoRef = useRef<THREE.BoxGeometry | null>(null);
  const stationSelRadiatorGeoRef = useRef<THREE.BoxGeometry | null>(null);

  const getMaterial = useCallback((color: string | number) => {
    const key = String(color);
    let mat = materialCacheRef.current.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color });
      materialCacheRef.current.set(key, mat);
    }
    return mat;
  }, []);

  const createSatelliteModel = useCallback((color: string | number, selected: boolean) => {
    const group = new THREE.Group();
    const bGeo = selected ? selectedBodyGeoRef.current : bodyGeoRef.current;
    const pGeo = selected ? selectedPanelGeoRef.current : panelGeoRef.current;
    const aGeo = selected ? selectedAntennaGeoRef.current : antennaGeoRef.current;
    const bodyMat = getMaterial(color);
    const pMat = selected ? selectedPanelMatRef.current : panelMatRef.current;

    const body = new THREE.Mesh(bGeo, bodyMat);
    group.add(body);

    const panelL = new THREE.Mesh(pGeo, pMat);
    panelL.position.x = selected ? -2.1 : -1.3;
    panelL.userData.isPanel = true;
    group.add(panelL);

    const panelR = new THREE.Mesh(pGeo, pMat);
    panelR.position.x = selected ? 2.1 : 1.3;
    panelR.userData.isPanel = true;
    group.add(panelR);

    const antenna = new THREE.Mesh(aGeo, bodyMat);
    antenna.position.y = selected ? 0.7 : 0.45;
    group.add(antenna);

    return group;
  }, [getMaterial]);

  const createStationModel = useCallback((color: string | number, selected: boolean) => {
    const group = new THREE.Group();
    const s = selected ? 2.0 : 1.0;
    const bodyMat = getMaterial(color);
    const pMat = selected ? selectedPanelMatRef.current : panelMatRef.current;
    const radiatorMat = getMaterial(0xcccccc);

    const mainGeoRef = selected ? stationSelMainGeoRef : stationMainGeoRef;
    const modLRef = selected ? stationSelModuleLGeoRef : stationModuleLGeoRef;
    const modRRef = selected ? stationSelModuleRGeoRef : stationModuleRGeoRef;
    const trussRef = selected ? stationSelTrussGeoRef : stationTrussGeoRef;
    const sPanelRef = selected ? stationSelPanelGeoRef : stationPanelGeoRef;
    const radRef = selected ? stationSelRadiatorGeoRef : stationRadiatorGeoRef;

    if (!mainGeoRef.current) mainGeoRef.current = new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 1.8 * s, 8);
    if (!modLRef.current) modLRef.current = new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 1.2 * s, 8);
    if (!modRRef.current) modRRef.current = new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 1.2 * s, 8);
    if (!trussRef.current) trussRef.current = new THREE.BoxGeometry(8.0 * s, 0.15 * s, 0.15 * s);
    if (!sPanelRef.current) sPanelRef.current = new THREE.BoxGeometry(0.15 * s, 0.05 * s, 2.0 * s);
    if (!radRef.current) radRef.current = new THREE.BoxGeometry(0.8 * s, 0.03 * s, 0.6 * s);

    const mainModule = new THREE.Mesh(mainGeoRef.current, bodyMat);
    mainModule.rotation.z = Math.PI / 2;
    group.add(mainModule);

    const moduleL = new THREE.Mesh(modLRef.current, bodyMat);
    moduleL.rotation.z = Math.PI / 2;
    moduleL.position.y = 0.6 * s;
    group.add(moduleL);

    const moduleR = new THREE.Mesh(modRRef.current, bodyMat);
    moduleR.rotation.z = Math.PI / 2;
    moduleR.position.y = -0.6 * s;
    group.add(moduleR);

    const truss = new THREE.Mesh(trussRef.current, radiatorMat);
    group.add(truss);

    const panelPositions = [-3.2, -1.6, 1.6, 3.2];
    for (const px of panelPositions) {
      const panel = new THREE.Mesh(sPanelRef.current, pMat);
      panel.position.set(px * s, 0.1 * s, 0);
      panel.userData.isPanel = true;
      group.add(panel);
    }

    for (const rx of [-2.4, 2.4]) {
      const radiator = new THREE.Mesh(radRef.current, radiatorMat);
      radiator.position.set(rx * s, -0.15 * s, 0);
      group.add(radiator);
    }

    return group;
  }, [getMaterial]);

  // Dispose all cached GPU resources on unmount
  useEffect(() => {
    const pMat = panelMatRef.current;
    const sPMat = selectedPanelMatRef.current;
    const matCache = materialCacheRef.current;
    const geoRefs = [bodyGeoRef, panelGeoRef, antennaGeoRef, selectedBodyGeoRef, selectedPanelGeoRef, selectedAntennaGeoRef];
    const stationRefs = [
      stationMainGeoRef, stationModuleLGeoRef, stationModuleRGeoRef,
      stationTrussGeoRef, stationPanelGeoRef, stationRadiatorGeoRef,
      stationSelMainGeoRef, stationSelModuleLGeoRef, stationSelModuleRGeoRef,
      stationSelTrussGeoRef, stationSelPanelGeoRef, stationSelRadiatorGeoRef,
    ];
    return () => {
      for (const ref of geoRefs) ref.current?.dispose();
      for (const ref of stationRefs) ref.current?.dispose();
      pMat?.dispose();
      sPMat?.dispose();
      matCache.forEach((mat) => mat.dispose());
      matCache.clear();
    };
  }, []);

  return { createSatelliteModel, createStationModel };
}
