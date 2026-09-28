export type UniverseNode = {
  id: string;
  name: string;
  color: number;
  size?: number;
  orbitRadius?: number;
  angle?: number;
  y?: number;
  children?: UniverseNode[];
};

export const universeRoot: UniverseNode = {
  id: "earth",
  name: "Earth",
  color: 0x4f9cff,
  size: 2.05,
  children: [
    {
      id: "music",
      name: "Music",
      color: 0xff9d3d,
      size: 0.34,
      orbitRadius: 4.2,
      angle: 0.2,
      y: 0.9,
      children: [
        { id: "albums", name: "Albums", color: 0xffb75e, size: 0.32, orbitRadius: 3.8, angle: 0.2, y: 0.75 },
        { id: "songs", name: "Songs", color: 0xffd18c, size: 0.26, orbitRadius: 4.15, angle: 1.5, y: -0.25 },
        { id: "theatrical", name: "Theatrical", color: 0xd46bff, size: 0.29, orbitRadius: 4.5, angle: 2.7, y: 0.45 },
        { id: "country-pop-rap", name: "Country / Pop / Rap", color: 0xff765e, size: 0.28, orbitRadius: 4.05, angle: 3.95, y: -0.7 },
        { id: "instrumental", name: "Instrumental", color: 0x74d7ff, size: 0.25, orbitRadius: 4.35, angle: 5.0, y: 0.15 },
        { id: "music-video", name: "Videos", color: 0xff4d73, size: 0.27, orbitRadius: 4.65, angle: 5.9, y: 0.9 },
      ],
    },
    {
      id: "engineering",
      name: "Engineering",
      color: 0x8ca8ff,
      size: 0.28,
      orbitRadius: 4.75,
      angle: 1.35,
      y: 0.15,
      children: [
        { id: "mechanical", name: "Mechanical", color: 0xa8bdff, size: 0.3, orbitRadius: 3.9, angle: 0.7, y: 0.45 },
        { id: "cad", name: "CAD", color: 0x7f9cff, size: 0.27, orbitRadius: 4.25, angle: 2.45, y: -0.35 },
        { id: "automation", name: "Automation", color: 0x9fc9ff, size: 0.25, orbitRadius: 4.5, angle: 4.5, y: 0.15 },
      ],
    },
    {
      id: "programming",
      name: "Programming",
      color: 0x37d8ff,
      size: 0.3,
      orbitRadius: 4.4,
      angle: 2.55,
      y: -0.8,
      children: [
        { id: "web-apps", name: "Web Apps", color: 0x55e4ff, size: 0.3, orbitRadius: 3.8, angle: 0.35, y: 0.65 },
        { id: "desktop-apps", name: "Desktop Apps", color: 0x5eb6ff, size: 0.28, orbitRadius: 4.2, angle: 1.9, y: -0.5 },
        { id: "ai", name: "AI", color: 0x8b7dff, size: 0.31, orbitRadius: 4.45, angle: 3.45, y: 0.25 },
        { id: "tools", name: "Tools", color: 0x44ffd2, size: 0.26, orbitRadius: 4.05, angle: 5.1, y: -0.25 },
      ],
    },
    {
      id: "stories",
      name: "Stories",
      color: 0xbf68ff,
      size: 0.27,
      orbitRadius: 4.85,
      angle: 3.5,
      y: 0.65,
      children: [
        { id: "short-stories", name: "Short Stories", color: 0xc987ff, size: 0.28, orbitRadius: 3.9, angle: 0.5, y: 0.4 },
        { id: "screenplays", name: "Screenplays", color: 0x9d72ff, size: 0.27, orbitRadius: 4.35, angle: 2.5, y: -0.4 },
        { id: "worlds", name: "Worlds", color: 0xe58cff, size: 0.3, orbitRadius: 4.55, angle: 4.6, y: 0.2 },
      ],
    },
    {
      id: "video",
      name: "Video",
      color: 0xff604f,
      size: 0.29,
      orbitRadius: 4.3,
      angle: 4.55,
      y: -0.55,
      children: [
        { id: "film-production", name: "Film Production", color: 0xff7b67, size: 0.3, orbitRadius: 4.0, angle: 0.65, y: 0.5 },
        { id: "youtube", name: "YouTube", color: 0xff4b4b, size: 0.28, orbitRadius: 4.35, angle: 2.8, y: -0.45 },
        { id: "visuals", name: "Visuals", color: 0xff9b67, size: 0.26, orbitRadius: 4.6, angle: 4.85, y: 0.2 },
      ],
    },
    {
      id: "thought-faith",
      name: "Thought / Faith",
      color: 0xf4d45c,
      size: 0.31,
      orbitRadius: 4.9,
      angle: 5.55,
      y: 1.15,
      children: [
        { id: "faith", name: "Faith", color: 0xffe487, size: 0.31, orbitRadius: 3.95, angle: 0.55, y: 0.55 },
        { id: "reflection", name: "Reflection", color: 0xe6dc86, size: 0.27, orbitRadius: 4.3, angle: 2.65, y: -0.35 },
        { id: "journal", name: "Journal", color: 0xf1c96a, size: 0.25, orbitRadius: 4.55, angle: 4.75, y: 0.15 },
      ],
    },
  ],
};
