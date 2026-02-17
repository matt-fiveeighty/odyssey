"use client";

import Image from "next/image";
import { SPECIES_IMAGES, SPECIES_GRADIENTS } from "@/lib/constants/species-images";
import { SPECIES_MAP } from "@/lib/constants/species";

interface SpeciesAvatarProps {
  speciesId: string;
  size?: number;
  className?: string;
}

export function SpeciesAvatar({ speciesId, size = 24, className = "" }: SpeciesAvatarProps) {
  const img = SPECIES_IMAGES[speciesId];
  const gradient = SPECIES_GRADIENTS[speciesId];
  const species = SPECIES_MAP[speciesId];

  return (
    <div
      className={`relative rounded-md overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={species?.name}
    >
      {img ? (
        <Image
          src={img.src}
          alt={img.alt}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          sizes={`${size}px`}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient ?? "from-slate-700 to-slate-900"}`} />
      )}
    </div>
  );
}
