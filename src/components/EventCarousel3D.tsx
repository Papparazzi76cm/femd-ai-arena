import { useEffect, useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, PerspectiveCamera } from "@react-three/drei";
import { eventService } from "@/services/eventService";
import { Event } from "@/types/database";
import * as THREE from "three";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventWithPoster extends Event {
  poster_url?: string;
}

function EventCard({ 
  event, 
  position, 
  isActive 
}: { 
  event: EventWithPoster; 
  position: [number, number, number]; 
  isActive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (event.poster_url) {
      const loader = new THREE.TextureLoader();
      loader.load(event.poster_url, (loadedTexture) => {
        setTexture(loadedTexture);
      });
    }
  }, [event.poster_url]);

  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <planeGeometry args={[3, 4]} />
        <meshStandardMaterial 
          map={texture}
          side={THREE.DoubleSide}
          transparent
          opacity={isActive ? 1 : 0.5}
        />
      </mesh>
      
      {isActive && (
        <>
          <Text
            position={[0, -2.5, 0.1]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={3}
          >
            {event.title}
          </Text>
          <Text
            position={[0, -3, 0.1]}
            fontSize={0.15}
            color="#888888"
            anchorX="center"
            anchorY="middle"
          >
            {new Date(event.date).toLocaleDateString('es-ES')}
          </Text>
        </>
      )}
    </group>
  );
}

function Scene({ events, currentIndex }: { events: EventWithPoster[]; currentIndex: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const targetRotation = -currentIndex * (Math.PI * 2) / events.length;
      groupRef.current.rotation.y += (targetRotation - groupRef.current.rotation.y) * 0.1;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
      
      <ambientLight intensity={0.5} />
      <spotLight 
        position={[10, 10, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={1}
        castShadow
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <group ref={groupRef}>
        {events.map((event, index) => {
          const angle = (index / events.length) * Math.PI * 2;
          const radius = 6;
          const x = Math.sin(angle) * radius;
          const z = Math.cos(angle) * radius;
          
          return (
            <EventCard
              key={event.id}
              event={event}
              position={[x, 0, z]}
              isActive={index === currentIndex}
            />
          );
        })}
      </group>
    </>
  );
}

export function EventCarousel3D() {
  const [events, setEvents] = useState<EventWithPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await eventService.getPublicAll();
        const eventsWithPosters = data.filter(event => (event as any).poster_url);
        setEvents(eventsWithPosters as EventWithPoster[]);
      } catch (error) {
        console.error("Error loading events:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando eventos...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Próximos <span className="gradient-text">Eventos</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Descubre nuestros torneos y competiciones
          </p>
        </div>

        <div className="relative h-[600px] w-full">
          <Canvas shadows className="w-full h-full">
            <Suspense fallback={null}>
              <Scene events={events} currentIndex={currentIndex} />
            </Suspense>
          </Canvas>

          {/* Navigation Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
            <Button
              onClick={prevSlide}
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
              {events.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-primary w-8' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={nextSlide}
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          {/* Event Info Display */}
          {events[currentIndex] && (
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-sm px-6 py-3 rounded-full max-w-md">
              <p className="text-center font-medium">
                {events[currentIndex].location || 'Ubicación por confirmar'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
