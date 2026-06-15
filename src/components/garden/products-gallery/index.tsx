"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { AppProvider } from "@/context/app-context";
import { ContactModal } from "@/components/contact-modal";
import { SphereScene } from "./sphere-scene";
import { GalleryHud, type GalleryCategory } from "./gallery-hud";
import { LetsTalkOverlay } from "./lets-talk-overlay";
import { ProductDetail } from "./product-detail";
import { useOrbitControls } from "./use-orbit-controls";
import { getGallerySound } from "./gallery-sound";
import {
  GALLERY_PRODUCTS,
  buildTiles,
  filterProducts,
  type GalleryFilter,
  type GalleryProduct,
  type SphereTile,
} from "./gallery-data";

interface ProductsGalleryProps {
  onSelectCategory: (category: GalleryCategory) => void;
  onShowList: () => void;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function detectWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

class CanvasErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function GalleryExperience({ onSelectCategory, onShowList }: ProductsGalleryProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [webglOk] = useState(detectWebGL);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [detailProduct, setDetailProduct] = useState<GalleryProduct | null>(null);
  const [letsTalkOpen, setLetsTalkOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  const orbit = useOrbitControls();
  const introRef = useRef(reduced ? 1 : 0);
  const introActiveRef = useRef(!reduced);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const usable = webglOk && !failed;
  const tiles = useMemo<SphereTile[]>(
    () => buildTiles(filterProducts(GALLERY_PRODUCTS, filter)),
    [filter],
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.body.style.cursor = "";
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const sound = getGallerySound();
    setSoundEnabled(sound.isEnabled());
    const unsubscribe = sound.subscribe(setSoundEnabled);
    return () => {
      unsubscribe();
      sound.setEnabled(false);
    };
  }, []);

  useEffect(() => {
    if (!usable) onShowList();
  }, [usable, onShowList]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (letsTalkOpen || detailProduct) return;
      e.preventDefault();
      orbit.wheel(e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [orbit, letsTalkOpen, detailProduct]);

  const exitTo = useCallback(
    (action: () => void) => {
      if (reduced) {
        action();
        return;
      }
      setExiting(true);
      window.setTimeout(action, 280);
    },
    [reduced],
  );

  const requestCategory = useCallback(
    (category: GalleryCategory) => {
      if (category === "products") return;
      getGallerySound().whoosh();
      exitTo(() => onSelectCategory(category));
    },
    [onSelectCategory, exitTo],
  );

  const handleShowList = useCallback(() => {
    setExiting(true);
    onShowList();
  }, [onShowList]);

  const openTile = useCallback((tile: SphereTile) => setDetailProduct(tile.product), []);

  if (!usable) return null;

  return (
    <div
      data-testid="products-gallery"
      role="region"
      aria-label="Products gallery — drag to orbit the sphere; the grid icon switches to a list view"
      className={`fixed inset-0 z-[60] overflow-hidden bg-[#050507]${
        reduced ? "" : " transition-[opacity,transform] duration-300 ease-out"
      }`}
      style={{
        opacity: mounted && !exiting ? 1 : 0,
        transform: mounted && !exiting ? "none" : "scale(0.985)",
      }}
    >
      <div
        ref={wrapperRef}
        onPointerDown={orbit.onPointerDown}
        className="absolute inset-0 touch-none"
        style={{ cursor: orbit.dragging ? "grabbing" : "grab" }}
      >
        <CanvasErrorBoundary onError={() => setFailed(true)}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 0.001], fov: 72, near: 0.1, far: 100 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <SphereScene
              tiles={tiles}
              orbit={orbit.state}
              introRef={introRef}
              introActiveRef={introActiveRef}
              reducedMotion={reduced}
              onOpen={openTile}
            />
          </Canvas>
        </CanvasErrorBoundary>
      </div>

      <GalleryHud
        filter={filter}
        onFilter={setFilter}
        onSelectCategory={requestCategory}
        onOpenLetsTalk={() => setLetsTalkOpen(true)}
        onShowList={handleShowList}
        onStepZoom={orbit.stepZoom}
        zoomIndex={orbit.zoomIndex}
        zoomLevels={orbit.zoomLevels}
        soundEnabled={soundEnabled}
        onToggleSound={() => getGallerySound().toggle()}
      />

      {letsTalkOpen && <LetsTalkOverlay onClose={() => setLetsTalkOpen(false)} />}
      {detailProduct && (
        <ProductDetail product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}
    </div>
  );
}

export default function ProductsGallery(props: ProductsGalleryProps) {
  return (
    <AppProvider>
      <GalleryExperience {...props} />
      <ContactModal />
    </AppProvider>
  );
}
