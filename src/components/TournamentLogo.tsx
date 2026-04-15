"use client";

import Image from "next/image";
import { useTournament } from "@/components/TournamentProvider";

interface TournamentLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function TournamentLogo({
  className = "",
  width = 120,
  height = 100,
}: TournamentLogoProps) {
  const { tournament } = useTournament();

  return (
    <Image
      src={tournament.logo}
      alt={tournament.name}
      width={width}
      height={height}
      className={className}
      priority
      style={{ width: "auto", height: "auto" }}
    />
  );
}
